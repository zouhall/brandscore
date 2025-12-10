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
 * - Uses explicit string concatenation for API KEY to avoid any Header/Param confusion.
 * - Retries logic included.
 */
async function fetchPageSpeedData(rawUrl: string): Promise<PsiResult> {
  const url = normalizeUrl(rawUrl);
  
  const performFetch = async (useKey: boolean): Promise<any> => {
    // 1. Prepare Base Params using URLSearchParams for safe encoding of the URL
    const params = new URLSearchParams();
    params.append('url', url);
    params.append('strategy', 'mobile');
    params.append('category', 'performance');
    params.append('category', 'seo');
    
    // 2. Construct the Base URL String
    let fetchUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;

    // 3. Append Key manually if required (Explicit Query Param)
    if (useKey) {
      if (!PSI_API_KEY) throw new Error("MISSING_KEY");
      fetchUrl += `&key=${PSI_API_KEY}`;
    }

    if (useKey) {
      console.log(`PSI Request: Authenticated via Query Param (&key=...${PSI_API_KEY.slice(-4)})`);
    } else {
      console.log(`PSI Request: Anonymous`);
    }

    const controller = new AbortController();
    // 60s timeout for slow PSI scans
    const timeoutId = setTimeout(() => controller.abort(), 60000); 

    try {
      const response = await fetch(fetchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetails = response.statusText;
        try {
          const errJson = await response.json();
          errorDetails = errJson.error?.message || response.statusText;
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
      // If Timeout (AbortError), try ONE more time with KEY before giving up
      if (e.name === 'AbortError') {
        console.warn("PSI Request Timed Out (60s). Retrying once with key...");
        try {
           attempt1 = await performFetch(true);
        } catch(e2) {
           console.warn("PSI Retry also failed:", e2);
        }
      } else if (e.message !== "MISSING_KEY") {
        console.warn("PSI Network Error:", e);
      }
    }

    if (attempt1 && !attempt1.error) {
      data = attempt1;
    } else {
      // Fallback Logic
      const status = attempt1?.status || 0;
      let shouldRetryAnonymous = true;
      let waitTime = 1000;

      // If we timed out (status 0), anonymous is likely to fail too, so we skip to fallback to save time.
      if (!attempt1 && !data) {
         console.warn("PSI connection failed. Skipping anonymous retry to prevent 429.");
         shouldRetryAnonymous = false;
      }

      if (status === 403) {
         console.error("CRITICAL: Google Cloud API Key rejected. Ensure 'PageSpeed Insights API' is ENABLED.");
         waitTime = 500; 
      } else if (status === 429) {
         console.warn("QUOTA EXCEEDED (429). Waiting 5s before anonymous retry...");
         waitTime = 5000;
      }

      if (shouldRetryAnonymous) {
         await delay(waitTime);
         console.log("Retrying PSI anonymously...");
         const attempt2 = await performFetch(false);
         if (attempt2 && !attempt2.error) {
           data = attempt2;
         } else {
           console.warn(`PSI Anonymous Failed: ${attempt2?.status || 'Unknown'}`);
         }
      }
    }

    // FINAL CHECK: Do we have data?
    if (!data || !data.lighthouseResult) {
       throw new Error("PSI Data Unavailable");
    }

    const lighthouse = data.lighthouseResult;
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

  // 4. AI PROMPT - FORENSIC STYLE
  const domain = normalizeUrl(brand.url).replace(/^https?:\/\//, '');
  
  const prompt = `
    Role: You are the **Zouhall Intelligence Engine**, a ruthless, high-end brand auditor.
    Tone: Cold, Clinical, Expensive. No fluff. No "Hello". Direct forensic analysis only.
    Style: Minimalist, Bold, Black & White. 
    
    Target: "${brand.name}" (${domain}).
    Task: Analyze the brand and generate a forensic report.

    **STEP 1: BUSINESS CLASSIFICATION**
    Use 'google_search' to identify if this is B2B, DTC, or SaaS.
    
    **STEP 2: DATA INGESTION**
    [Technical Diagnostics]
    ${psiData.success 
      ? `- Mobile Performance: ${psiData.perfScore}/100
         - SEO Structure: ${psiData.seoScore}/100
         - Tech Stack: ${psiData.techStack.join(', ') || 'Undetected'}`
      : `- Automated Scan: BLOCKED (Assume infrastructure is weak or hidden).`
    }

    [Strategic Self-Report]
    ${formattedAnswers}

    **STEP 3: GENERATE FORENSIC SUMMARY**
    Write an 'executiveSummary' in 3 distinct, punchy paragraphs. 
    Use **bold text** for impact.
    
    1. **The Brutal Reality**: Start with a hard truth about their technical setup or market position. (e.g. "**Your tech stack is obsolete.** You are running on Wix/Squarespace which is throttling your SEO visibility.")
    2. **The Strategy Gap**: Isolate ONE specific "NO" answer from the quiz and attack it. (e.g. "You claimed to want scale, yet you have **zero email automation**. You are voluntarily donating margin to your competitors.")
    3. **The Verdict**: A final, high-stakes warning. (e.g. "** Momentum is low.** Fix the funnel or continue to bleed ad spend.")

    **STEP 4: OUTPUT JSON**
    {
      "businessContext": "1 concise sentence defining the business model.",
      "executiveSummary": "The 3 paragraphs defined above.",
      "momentumScore": [Integer 0-100. If quiz has many NOs, score must be < 50.],
      "technicalSignals": [
         // If PSI passed, do NOT repeat Speed/SEO.
         // If PSI failed, infer signals like "Search Presence: Strong" or "Tech Stack: Unknown".
         { "label": "Domain Authority", "value": "High/Low", "status": "good/warning/critical" }
      ],
      "categories": [
        // Generate 6 objects: Strategy, Visuals, Growth, Content, Operations, SEO.
        // { "title": "Strategy", "score": 45, "diagnostic": "Specific problem...", "evidence": ["..."], "strategy": "Actionable fix..." }
      ],
      "perceptionGap": {
        "detected": [Boolean],
        "verdict": "Short Verdict (e.g. 'Delusion Detected')",
        "details": "Explanation of why their self-perception matches or fails reality."
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
          temperature: 0.4 // Slightly higher creativity for "Zouhall" tone
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