import { GoogleGenAI } from "@google/genai";
import { AuditResult, BrandInfo, UserResponse, TechnicalSignal } from "../types";
import { QUESTIONS } from "../constants";

// STAGE 1: ROBUST KEY SANITIZATION
// Removes quotes, spaces, newlines, and common copy-paste artifacts
const RAW_KEY = process.env.VITE_PSI_API_KEY || "";
const PSI_API_KEY = RAW_KEY.replace(/["';\s\n\r]/g, "").trim();

// --- UTILITIES ---

function normalizeUrl(url: string): string {
  let normalized = url.trim();
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  if (!normalized.match(/^https?:\/\//)) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

function cleanAndParseJSON(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error("Response does not contain a JSON object");
  const jsonStr = text.substring(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    const cleaned = jsonStr.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(cleaned);
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- API FETCHERS ---

interface PsiResult {
  success: boolean;
  perfScore: number;
  seoScore: number;
  webVitals: { lcp: string; cls: string; fcp: string };
  techStack: string[];
  bugs: string[];
  error?: string;
  isFallback?: boolean;
}

/**
 * Robust PSI Fetcher.
 * - Sanitizes Key before sending.
 * - Logs the specific Google Cloud error message for debugging.
 * - handles 429 Quota limits gracefully.
 */
async function fetchPageSpeedData(rawUrl: string): Promise<PsiResult> {
  const url = normalizeUrl(rawUrl);
  
  const performFetch = async (useKey: boolean): Promise<any> => {
    const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    endpoint.searchParams.append('url', url);
    endpoint.searchParams.append('strategy', 'mobile');
    
    // Only fetch essential categories to save bandwidth/quota
    endpoint.searchParams.append('category', 'performance');
    endpoint.searchParams.append('category', 'seo');
    
    if (useKey) {
      if (!PSI_API_KEY) throw new Error("MISSING_KEY");
      endpoint.searchParams.append('key', PSI_API_KEY);
    }

    if (useKey) {
      // Log partial key to verify sanitization
      console.log(`PSI Request: Authenticated (Key ends in ...${PSI_API_KEY.slice(-4)})`);
    } else {
      console.log(`PSI Request: Anonymous`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s hard timeout

    try {
      const response = await fetch(endpoint.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetails = response.statusText;
        try {
          const errJson = await response.json();
          errorDetails = errJson.error?.message || response.statusText;
          // Log the REAL error from Google (e.g. "API not enabled")
          console.warn(`[PSI API ERROR] ${response.status}: ${errorDetails}`);
        } catch (e) { /* ignore */ }

        return { error: true, status: response.status, text: errorDetails };
      }
      return await response.json();
    } catch (e: any) {
      clearTimeout(timeoutId);
      throw e;
    }
  };

  try {
    let data;
    let attempt1 = null;

    // Attempt 1: With API Key
    try {
      attempt1 = await performFetch(true);
    } catch (e: any) {
      if (e.message !== "MISSING_KEY") console.warn("PSI Network Error:", e);
    }

    if (attempt1 && !attempt1.error) {
      data = attempt1;
    } else {
      // Fallback Logic
      const status = attempt1?.status || 0;
      let shouldRetry = true;
      let waitTime = 1000;

      if (status === 403) {
         console.error("CRITICAL: Google Cloud API Key rejected. Ensure 'PageSpeed Insights API' is ENABLED in console.cloud.google.com.");
         waitTime = 500; 
      } else if (status === 429) {
         console.warn("QUOTA EXCEEDED (429). Waiting 5s before anonymous retry...");
         waitTime = 5000;
      }

      if (shouldRetry) {
         await delay(waitTime);
         console.log("Retrying PSI anonymously...");
         const attempt2 = await performFetch(false);
         if (attempt2 && !attempt2.error) {
           data = attempt2;
         } else {
           throw new Error(`PSI Failed: ${attempt2?.status || 'Unknown'} - ${attempt2?.text || ''}`);
         }
      }
    }

    const lighthouse = data?.lighthouseResult;
    if (!lighthouse) throw new Error("No lighthouse data");

    const perfScore = lighthouse.categories.performance?.score 
        ? Math.round(lighthouse.categories.performance.score * 100) : -1;
    const seoScore = lighthouse.categories.seo?.score 
        ? Math.round(lighthouse.categories.seo.score * 100) : -1;

    return {
      success: true,
      perfScore,
      seoScore,
      webVitals: {
        lcp: lighthouse.audits?.['largest-contentful-paint']?.displayValue || 'N/A',
        cls: lighthouse.audits?.['cumulative-layout-shift']?.displayValue || 'N/A',
        fcp: lighthouse.audits?.['first-contentful-paint']?.displayValue || 'N/A',
      },
      techStack: (lighthouse.stackPacks || []).map((p: any) => p.title),
      bugs: []
    };

  } catch (error: any) {
    console.warn("PSI Scan aborted. Switching to AI Estimation Mode.", error.message);
    return {
      success: false,
      perfScore: -1,
      seoScore: -1,
      webVitals: { lcp: '?', cls: '?', fcp: '?' },
      techStack: [],
      bugs: [],
      error: error.message,
      isFallback: true
    };
  }
}

// --- MAIN SERVICE ---

export const performBrandAudit = async (
  brand: BrandInfo,
  responses: UserResponse[]
): Promise<AuditResult> => {
  const apiKey = process.env.API_KEY;
  let ai;
  if (apiKey) ai = new GoogleGenAI({ apiKey: apiKey });

  // 1. EXECUTE CRAWL (With robust fallback)
  const psiData = await fetchPageSpeedData(brand.url);
  
  // 2. PREPARE QUIZ DATA
  const formattedAnswers = responses.map(r => {
    const q = QUESTIONS.find(q => q.id === r.questionId);
    return `- ${q?.category}: ${r.answer === 1 ? 'YES' : 'NO'} (${q?.text})`;
  }).join('\n');

  // 3. CONSTRUCT SIGNALS
  const signals: TechnicalSignal[] = [];
  
  if (psiData.success) {
    signals.push({
      label: "Mobile Speed",
      value: `${psiData.perfScore}/100`,
      status: psiData.perfScore >= 90 ? 'good' : psiData.perfScore >= 50 ? 'warning' : 'critical'
    });
    signals.push({
      label: "SEO Score",
      value: `${psiData.seoScore}/100`,
      status: psiData.seoScore >= 90 ? 'good' : psiData.seoScore >= 70 ? 'warning' : 'critical'
    });
    if (psiData.techStack.length > 0) {
      signals.push({ label: "Tech Stack", value: psiData.techStack.join(', '), status: 'good' });
    }
  } else {
    // Graceful Signal if scan failed
    signals.push({ label: "Site Scan", value: "Visual Analysis Only", status: "warning" });
  }

  // 4. AI PROMPT - ENHANCED FOR CLASSIFICATION & FALLBACKS
  const domain = normalizeUrl(brand.url).replace(/^https?:\/\//, '');
  
  const prompt = `
    Role: Senior Brand Auditor.
    Task: Analyze the brand "${brand.name}" (${domain}).
    
    **STEP 1: BUSINESS CLASSIFICATION (MANDATORY)**
    Use 'google_search' to find the site and read the TITLE and META DESCRIPTION.
    
    RULES:
    1. If the site offers "Services", "Consulting", "Agencies", "Solutions", or "Booking": Classify as **AGENCY / B2B**.
    2. If the site has a "Cart", "Shop", "Products", or "Collection": Classify as **ECOMMERCE**.
    3. If it is "Zouhall" or similar: It is a **Digital Growth Agency**.
    
    **STEP 2: TECHNICAL ANALYSIS**
    ${psiData.success 
      ? `Real Data: Speed ${psiData.perfScore}/100, SEO ${psiData.seoScore}/100.` 
      : `CRITICAL: The automated scan was blocked. YOU MUST ESTIMATE HEALTH based on the site's search results. 
         - If the site has a modern meta title and rich snippets, assume "Moderate" health.
         - If the site is missing from search or looks broken, assume "Critical" health.
         - Do NOT return 0 scores. Return an estimated score (e.g., 65) based on visual credibility.`
    }

    **STEP 3: STRATEGY ANALYSIS**
    User Answers:
    ${formattedAnswers}

    **STEP 4: OUTPUT JSON**
    {
      "businessContext": "1 concise sentence defining the business model (e.g. 'B2B Creative Agency').",
      "executiveSummary": "3 sentences. 1) Reality check (Good/Bad tech). 2) The biggest strategy leak identified in the quiz. 3) A direct, high-stakes warning about lost revenue.",
      "momentumScore": [Integer 0-100. If quiz answers are mostly NO, score must be < 50. If PSI failed, base this 80% on the Quiz and 20% on Search Credibility.],
      "technicalSignals": [
         // If PSI passed, do NOT repeat Speed/SEO.
         // If PSI failed, infer signals like "Search Presence: Strong" or "Tech Stack: Unknown".
         { "label": "Domain Authority", "value": "High", "status": "good" }
      ],
      "categories": [
        // 6 Objects: Strategy, Visuals, Growth, Content, Operations, SEO.
        // { "title": "Strategy", "score": 45, "diagnostic": "Specific problem...", "evidence": ["..."], "strategy": "Actionable fix..." }
      ],
      "perceptionGap": {
        "detected": [Boolean],
        "verdict": "Short Verdict",
        "details": "Explanation"
      }
    }
  `;

  const getFallbackResult = (): AuditResult => ({
    momentumScore: 50,
    businessContext: "Analysis Inconclusive",
    executiveSummary: "We could not complete the automated scan. Manual review required.",
    technicalSignals: signals,
    categories: [],
    perceptionGap: { detected: false, verdict: "N/A", details: "" },
    groundingUrls: []
  });

  if (!ai) return getFallbackResult();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`AI Gen Attempt ${attempt}...`);
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.3
        }
      });
      
      const text = result.text || "{}";
      const parsed = cleanAndParseJSON(text);
      
      // Merge Signals
      let finalSignals = [...signals];
      if (parsed.technicalSignals && Array.isArray(parsed.technicalSignals)) {
          parsed.technicalSignals.forEach((s: any) => {
              if (!finalSignals.some(fs => fs.label === s.label)) {
                  finalSignals.push(s);
              }
          });
      }

      return {
        momentumScore: parsed.momentumScore || 50,
        businessContext: parsed.businessContext || `Analysis of ${brand.name}`,
        executiveSummary: parsed.executiveSummary || "Audit Complete.",
        technicalSignals: finalSignals,
        categories: parsed.categories || [],
        perceptionGap: parsed.perceptionGap || { detected: false, verdict: "None", details: "" },
        groundingUrls: result.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c:any) => c.web?.uri) || []
      };

    } catch (e) {
      console.error(`AI Attempt ${attempt} error:`, e);
      if (attempt === 2) break;
      await delay(1000);
    }
  }

  return getFallbackResult();
};
