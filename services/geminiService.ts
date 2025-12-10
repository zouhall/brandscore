import { GoogleGenAI } from "@google/genai";
import { AuditResult, BrandInfo, UserResponse, QuestionCategory, TechnicalSignal } from "../types";
import { QUESTIONS } from "../constants";

// Now securely using env var. 
// If missing, fetchPageSpeedData will fallback gracefully.
const PSI_API_KEY = process.env.VITE_PSI_API_KEY || "";

// --- UTILITIES ---

function normalizeUrl(url: string): string {
  let normalized = url.trim();
  // Remove trailing slashes
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  
  // Ensure protocol
  if (!normalized.match(/^https?:\/\//)) {
    normalized = `https://${normalized}`;
  }
  
  return normalized;
}

function cleanAndParseJSON(text: string): any {
  // Locate the first '{' and the last '}' to handle any markdown preamble
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  
  if (start === -1 || end === -1) {
    throw new Error("Response does not contain a JSON object");
  }
  
  const jsonStr = text.substring(start, end + 1);
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Attempt basic cleanup of markdown code blocks just in case
    const cleaned = jsonStr.replace(/```json/g, '').replace(/```/g, '');
    try {
        return JSON.parse(cleaned);
    } catch (e2) {
        console.error("JSON Parse Error on:", text);
        throw new Error("Invalid JSON syntax from AI");
    }
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- API FETCHERS ---

/**
 * Robust fetcher for PageSpeed Insights.
 * Tries Mobile strategy first, retries with Desktop if it fails.
 */
async function fetchPageSpeedData(rawUrl: string) {
  const url = normalizeUrl(rawUrl);
  
  if (!PSI_API_KEY) {
    console.warn("VITE_PSI_API_KEY is missing. Skipping technical crawl.");
    return {
      success: false,
      performanceScore: -1,
      coreWebVitals: { lcp: 'N/A', cls: 'N/A', fcp: 'N/A' },
      techStackIds: []
    };
  }

  const fetchStrategy = async (strategy: 'mobile' | 'desktop') => {
    try {
      console.log(`PSI: Attempting crawl with strategy: ${strategy}`);
      // Add timestamp to bypass caches
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${PSI_API_KEY}&strategy=${strategy}&t=${Date.now()}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
          // If 429 (Rate Limit) or 500, throwing allows retry logic to catch it
          throw new Error(`PSI API Error: ${response.status} ${response.statusText}`);
      }
  
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
  
      const lighthouse = data.lighthouseResult;
      
      // Safely extract score
      const score = lighthouse.categories.performance?.score 
        ? lighthouse.categories.performance.score * 100 
        : -1;

      return {
        success: score !== -1,
        performanceScore: score,
        coreWebVitals: {
          lcp: lighthouse.audits['largest-contentful-paint']?.displayValue || 'N/A',
          cls: lighthouse.audits['cumulative-layout-shift']?.displayValue || 'N/A',
          fcp: lighthouse.audits['first-contentful-paint']?.displayValue || 'N/A',
        },
        techStackIds: lighthouse.stackPacks?.map((p: any) => p.title) || []
      };
    } catch (error) {
      console.warn(`PSI ${strategy} fetch failed:`, error);
      return null;
    }
  };

  // 1. Try Mobile
  let result = await fetchStrategy('mobile');
  
  // 2. Retry with Desktop if Mobile failed (wait 1s)
  if (!result) {
    console.log("PSI: Retrying with Desktop strategy in 1s...");
    await delay(1000);
    result = await fetchStrategy('desktop');
  }

  // 3. Final Fallback
  if (!result) {
    console.error("PSI: All crawl attempts failed.");
    return {
      success: false,
      performanceScore: -1,
      coreWebVitals: { lcp: 'N/A', cls: 'N/A', fcp: 'N/A' },
      techStackIds: []
    };
  }

  return result;
}

// --- MAIN SERVICE ---

export const performBrandAudit = async (
  brand: BrandInfo,
  responses: UserResponse[]
): Promise<AuditResult> => {
  let ai;
  const apiKey = process.env.API_KEY;

  try {
    if (apiKey) ai = new GoogleGenAI({ apiKey: apiKey });
  } catch (e) {
    console.warn("Failed to initialize GoogleGenAI client:", e);
  }

  // 1. Fetch Real Technical Data (With Retry Logic)
  const psiData = await fetchPageSpeedData(brand.url);
  
  // 2. Format User Answers
  const formattedAnswers = responses.map(r => {
    const q = QUESTIONS.find(q => q.id === r.questionId);
    return `- [${q?.category}] "${q?.text}": ${r.answer === 1 ? 'YES' : 'NO'}`;
  }).join('\n');

  // 3. Prepare Technical Signals
  const realTechnicalSignals: TechnicalSignal[] = [];
  
  // Only add Hardcoded Signals if PSI SUCCEEDED.
  if (psiData.success && psiData.performanceScore >= 0) {
    realTechnicalSignals.push({
      label: "Mobile Speed",
      value: `${Math.round(psiData.performanceScore)}/100`,
      status: psiData.performanceScore >= 90 ? 'good' : psiData.performanceScore >= 50 ? 'warning' : 'critical'
    });

    const stack = psiData.techStackIds.length > 0 ? psiData.techStackIds.join(', ') : "Standard Web";
    realTechnicalSignals.push({
      label: "Technology",
      value: stack,
      status: psiData.techStackIds.length > 0 ? 'good' : 'warning'
    });

    realTechnicalSignals.push({
      label: "Core Web Vitals",
      value: psiData.coreWebVitals.lcp !== 'N/A' ? `LCP ${psiData.coreWebVitals.lcp}` : "Passed",
      status: 'good'
    });
  }

  // 4. Construct Prompt
  const speedInput = psiData.success ? `${psiData.performanceScore}/100` : "FAILED (API Error)";
  const techInput = psiData.success ? (psiData.techStackIds.join(', ') || "Standard") : "Unknown";
  
  let domain = "unknown";
  try {
    domain = new URL(normalizeUrl(brand.url)).hostname;
  } catch (e) {
    domain = brand.url;
  }

  const prompt = `
    You are a forensic brand auditor. Analyze "${brand.name}" at domain "${domain}".
    
    **INPUT DATA:**
    - Mobile Speed: ${speedInput}
    - Tech Stack: ${techInput}
    
    **TASK:**
    1. If the "Mobile Speed" is "FAILED" or "Unknown", you **MUST** use 'google_search' to find "site:${domain}" and "${domain} technology".
       - Infer if the site is modern/responsive.
       - Identify the platform (Shopify, WordPress, Custom).
       - **YOU MUST POPULATE the 'technicalSignals' array with at least 3 items.** 
       - If you cannot find speed data, create a signal "Digital Presence" with value "Verified" or "Unverified".
    
    2. Search for the brand's social media and recent news to fill the "Business Context".

    **QUESTIONNAIRE RESULTS:**
    ${formattedAnswers}

    **OUTPUT FORMAT (JSON ONLY):**
    {
      "businessContext": "Industry and what they do. Be specific.",
      "momentumScore": [Integer 0-100],
      "executiveSummary": "2-3 bold sentences diagnosing the main bottleneck.",
      "technicalSignals": [ 
         { "label": "Mobile Experience", "value": "Modern/Fast", "status": "good" },
         { "label": "Tech Stack", "value": "Shopify", "status": "good" }
      ],
      "categories": [
        {
          "title": "Strategy" | "Visuals" | "Growth" | "Content" | "Operations" | "SEO",
          "score": [Integer 0-100],
          "diagnostic": "Specific observation.",
          "evidence": ["Evidence 1", "Evidence 2"],
          "strategy": "Actionable fix."
        }
      ],
      "perceptionGap": {
        "detected": [Boolean],
        "verdict": "Short verdict.",
        "details": "Explanation."
      }
    }
  `;

  const getFallbackResult = (): AuditResult => {
      const yesAnswers = responses.filter(r => r.answer === 1).length;
      const totalQuestions = responses.length || 16;
      const quizScore = Math.round((yesAnswers / totalQuestions) * 100);

      const signals: TechnicalSignal[] = realTechnicalSignals.length > 0 ? realTechnicalSignals : [
         { label: "Site Scan", value: "Connection Error", status: "warning" },
         { label: "Manual Review", value: "Required", status: "critical" }
      ];

      return {
        momentumScore: psiData.success ? Math.round((psiData.performanceScore + quizScore) / 2) : quizScore,
        businessContext: `Analysis based on provided inputs for ${brand.name}.`,
        executiveSummary: "We have generated a preliminary score based on your inputs. Technical scan was inconclusive, manual review recommended.",
        technicalSignals: signals,
        categories: [
            { title: QuestionCategory.STRATEGY, score: 70, diagnostic: "Review strategy.", evidence: ["User Input"], strategy: "Develop a plan." },
            { title: QuestionCategory.OPERATIONS, score: 60, diagnostic: "Ops check.", evidence: ["User Input"], strategy: "Automate." },
            { title: QuestionCategory.VISUALS, score: 75, diagnostic: "Visual check.", evidence: ["User Input"], strategy: "Update design." },
            { title: QuestionCategory.CONTENT, score: 55, diagnostic: "Content check.", evidence: ["User Input"], strategy: "Post more." },
            { title: QuestionCategory.GROWTH, score: 65, diagnostic: "Growth check.", evidence: ["User Input"], strategy: "Run ads." },
            { title: QuestionCategory.SEO, score: 50, diagnostic: "SEO check.", evidence: ["User Input"], strategy: "Optimize tags." }
        ],
        perceptionGap: { detected: false, verdict: "Inconclusive", details: "Manual Review Recommended" },
        groundingUrls: [],
      };
  };

  if (!ai) return getFallbackResult();
  
  // RETRY LOOP FOR AI GENERATION
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`AI Attempt ${attempt}...`);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.5, 
        }
      });
      
      const jsonText = response.text || "";
      const result = cleanAndParseJSON(jsonText);
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const urls = chunks.map((c: any) => c.web?.uri).filter(Boolean);

      // Merge Real & AI Signals
      let finalSignals: TechnicalSignal[] = [...realTechnicalSignals];
      
      if (result.technicalSignals && Array.isArray(result.technicalSignals)) {
        result.technicalSignals.forEach((aiSig: any) => {
           // Prevent duplicates if label is similar
           const isDup = finalSignals.some(fs => fs.label.toLowerCase().includes(aiSig.label.toLowerCase()) || aiSig.label.toLowerCase().includes(fs.label.toLowerCase()));
           if (!isDup) finalSignals.push(aiSig);
        });
      }

      // If STILL empty, add a generic one so the UI doesn't look broken
      if (finalSignals.length === 0) {
        finalSignals.push({
            label: "Digital Footprint",
            value: "Analyzing...",
            status: "warning"
        });
      }

      return {
        momentumScore: result.momentumScore || 60,
        businessContext: result.businessContext || `Analysis of ${brand.name}`,
        executiveSummary: result.executiveSummary || "Audit Complete.",
        technicalSignals: finalSignals,
        categories: result.categories || [],
        perceptionGap: result.perceptionGap || { detected: false, verdict: "None", details: "" },
        groundingUrls: urls.slice(0, 5),
      };

    } catch (e) {
      console.error(`Attempt ${attempt} failed:`, e);
      if (attempt === 2) break; 
      await delay(1000); // Wait before retry
    }
  }

  return getFallbackResult();
};