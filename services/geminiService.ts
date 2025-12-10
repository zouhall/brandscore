import { GoogleGenAI } from "@google/genai";
import { AuditResult, BrandInfo, UserResponse, TechnicalSignal } from "../types";
import { QUESTIONS } from "../constants";

const PSI_API_KEY = process.env.VITE_PSI_API_KEY || "";

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
}

/**
 * Robust PSI Fetcher.
 * - 403 (Bad Key) -> Retry Anonymous Immediately.
 * - 429 (Rate Limit) -> Wait 3s -> Retry Anonymous.
 * - 500 (Server Error) -> Fail Gracefully.
 */
async function fetchPageSpeedData(rawUrl: string): Promise<PsiResult> {
  const url = normalizeUrl(rawUrl);
  
  const performFetch = async (useKey: boolean): Promise<any> => {
    const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    endpoint.searchParams.append('url', url);
    endpoint.searchParams.append('strategy', 'mobile');
    endpoint.searchParams.append('category', 'performance');
    endpoint.searchParams.append('category', 'seo');
    
    if (useKey && PSI_API_KEY) {
      endpoint.searchParams.append('key', PSI_API_KEY);
    }

    console.log(`PSI Request: ${useKey ? 'Authenticated' : 'Anonymous'} -> ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s hard timeout

    try {
      const response = await fetch(endpoint.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Return status to handle specific error codes (403 vs 429)
        return { error: true, status: response.status, text: response.statusText };
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

    // Attempt 1: With API Key (if available)
    try {
      attempt1 = await performFetch(true);
    } catch (e) {
      console.warn("PSI Network Error (Attempt 1):", e);
    }

    // Handle Attempt 1 Results
    if (attempt1 && !attempt1.error) {
      data = attempt1; // Success
    } else {
      // Logic for Fallback
      const status = attempt1?.status || 0;
      let shouldRetry = true;
      let waitTime = 1000;

      if (status === 403) {
         console.warn("PSI 403 Forbidden (Likely Invalid Key). Switching to Anonymous Mode immediately.");
         waitTime = 100; // Almost immediate
      } else if (status === 429) {
         console.warn("PSI 429 Rate Limit. Backing off for 3.5 seconds...");
         waitTime = 3500;
      } else if (status === 400 || status === 500) {
         console.warn(`PSI ${status} Error. Might be invalid URL or Server issue. Retrying anonymously just in case.`);
      }

      if (shouldRetry) {
         await delay(waitTime);
         console.log("Retrying PSI anonymously...");
         const attempt2 = await performFetch(false);
         if (attempt2 && !attempt2.error) {
           data = attempt2;
         } else {
           throw new Error(`PSI Failed: ${attempt2?.status || 'Unknown Error'}`);
         }
      }
    }

    const lighthouse = data?.lighthouseResult;
    if (!lighthouse) throw new Error("No lighthouse data in response");

    // Extract Scores
    const perfScore = lighthouse.categories.performance?.score 
        ? Math.round(lighthouse.categories.performance.score * 100) : -1;
    const seoScore = lighthouse.categories.seo?.score 
        ? Math.round(lighthouse.categories.seo.score * 100) : -1;

    // Extract Vitals
    const audits = lighthouse.audits || {};
    const webVitals = {
      lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
      cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
      fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
    };

    // Extract Tech Stack
    const techStack = (lighthouse.stackPacks || []).map((p: any) => p.title);

    // Extract "Bugs" (Failed Audits)
    const bugs: string[] = [];
    const criticalAudits = ['errors-in-console', 'is-crawlable', 'viewport', 'robots-txt', 'document-title'];
    criticalAudits.forEach(id => {
      if (audits[id] && audits[id].score === 0) {
        bugs.push(audits[id].title);
      }
    });

    return {
      success: true,
      perfScore,
      seoScore,
      webVitals,
      techStack,
      bugs
    };

  } catch (error: any) {
    console.warn("PSI Audit Failed completely:", error);
    return {
      success: false,
      perfScore: -1,
      seoScore: -1,
      webVitals: { lcp: '?', cls: '?', fcp: '?' },
      techStack: [],
      bugs: [],
      error: error.message
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

  // 1. EXECUTE TECHNICAL CRAWL
  const psiData = await fetchPageSpeedData(brand.url);
  
  // 2. PREPARE INPUTS
  const formattedAnswers = responses.map(r => {
    const q = QUESTIONS.find(q => q.id === r.questionId);
    return `- ${q?.category}: ${r.answer === 1 ? 'YES' : 'NO'} (${q?.text})`;
  }).join('\n');

  // 3. CONSTRUCT TECHNICAL SIGNALS (Real Data)
  const signals: TechnicalSignal[] = [];
  
  if (psiData.success) {
    signals.push({
      label: "Mobile Speed",
      value: psiData.perfScore >= 0 ? `${psiData.perfScore}/100` : "N/A",
      status: psiData.perfScore >= 90 ? 'good' : psiData.perfScore >= 50 ? 'warning' : 'critical'
    });
    signals.push({
      label: "SEO Score",
      value: psiData.seoScore >= 0 ? `${psiData.seoScore}/100` : "N/A",
      status: psiData.seoScore >= 90 ? 'good' : psiData.seoScore >= 70 ? 'warning' : 'critical'
    });
    signals.push({
      label: "Tech Stack",
      value: psiData.techStack.length > 0 ? psiData.techStack.join(', ') : "Unknown",
      status: 'good'
    });
    if (psiData.bugs.length > 0) {
       signals.push({ label: "Errors", value: `${psiData.bugs.length} Issues`, status: 'critical' });
    }
  } else {
    // If scan failed, status is warning (neutral), not critical, to avoid "tanking" credibility.
    signals.push({ label: "Site Scan", value: "Verification Pending", status: "warning" });
  }

  // 4. AI PROMPT
  const domain = normalizeUrl(brand.url).replace(/^https?:\/\//, '');
  
  const prompt = `
    Role: Senior Brand Auditor.
    Task: Analyze the brand "${brand.name}" (${domain}).
    
    **STEP 1: IDENTIFY BUSINESS MODEL (CRITICAL)**
    Use 'google_search' to find the *exact* nature of the business.
    Search Query 1: "site:${domain}" (Read the Title/Description)
    Search Query 2: "${brand.name} reviews"
    Search Query 3: "${brand.name} services"

    **CLASSIFICATION RULES:**
    - **AGENCY/B2B**: Look for keywords like "Digital Agency", "Marketing", "Consulting", "Services", "Book a Call", "Portfolio".
      (Example: 'Zouhall Digital' is an Agency).
    - **ECOMMERCE/B2C**: Look for keywords like "Shop", "Add to Cart", "Menswear", "Fashion", "Shipping".
    - **CONFLICT**: If a site has *both* (e.g. an agency selling a course), classify as the PRIMARY high-ticket offer (Agency).
    
    **STEP 2: ANALYZE DATA**
    [Technical Data from Live Scan]
    - Speed Score: ${psiData.success ? psiData.perfScore : "Unavailable (Scan Blocked)"}
    - SEO Score: ${psiData.success ? psiData.seoScore : "Unavailable (Scan Blocked)"}
    - Tech Stack: ${psiData.success ? psiData.techStack.join(', ') : "Unknown"}
    - Errors: ${psiData.success ? psiData.bugs.join(', ') : "Unknown"}

    [Strategy Quiz Answers]
    ${formattedAnswers}

    **STEP 3: GENERATE REPORT (JSON)**
    Return a valid JSON object:
    {
      "businessContext": "One clear sentence defining the business (e.g. 'B2B Digital Growth Agency' or 'DTC Fashion Brand').",
      "executiveSummary": "3 sentences. 1) Define their reality (Good/Bad tech). 2) Identify the biggest strategy gap from the quiz. 3) Give a harsh but professional truth.",
      "momentumScore": [Integer 0-100. IMPORTANT: If Technical Data is 'Unavailable', DO NOT set score to 0. Calculate score based on Strategy Quiz (80%) + Brand Reputation (20%).],
      "technicalSignals": [
         // Add 1-2 extra signals found via Search, e.g. "Reputation: 5 Stars" or "Traffic: Low". 
         // Do NOT repeat Speed/SEO signals if they are already in the list.
         { "label": "Brand Age", "value": "Est. 2021", "status": "good" }
      ],
      "categories": [
        // Generate 6 objects for: Strategy, Visuals, Growth, Content, Operations, SEO.
        // { "title": "Strategy", "score": 50, "diagnostic": "...", "evidence": ["..."], "strategy": "..." }
      ],
      "perceptionGap": {
        "detected": [Boolean],
        "verdict": "Short Title",
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
      
      // Merge Signals (Real + AI)
      let finalSignals = [...signals];
      if (parsed.technicalSignals && Array.isArray(parsed.technicalSignals)) {
          parsed.technicalSignals.forEach((s: any) => {
              // Avoid duplicates
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
