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
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

function cleanAndParseJSON(text: string): any {
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  
  if (start === -1 || end === -1) {
    throw new Error("Response does not contain a JSON object");
  }
  
  cleaned = cleaned.substring(start, end + 1);
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error on string:", cleaned);
    throw new Error("Invalid JSON syntax from AI");
  }
}

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
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${PSI_API_KEY}&strategy=${strategy}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
          throw new Error(`PSI API Error: ${response.status}`);
      }
  
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
  
      const lighthouse = data.lighthouseResult;
      return {
        success: true,
        performanceScore: (lighthouse.categories.performance.score * 100) || 0,
        coreWebVitals: {
          lcp: lighthouse.audits['largest-contentful-paint'].displayValue,
          cls: lighthouse.audits['cumulative-layout-shift'].displayValue,
          fcp: lighthouse.audits['first-contentful-paint'].displayValue,
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
  
  // 2. Retry with Desktop if Mobile failed
  if (!result) {
    console.log("PSI: Retrying with Desktop strategy...");
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
  
  if (psiData.success && psiData.performanceScore >= 0) {
    realTechnicalSignals.push({
      label: "Mobile Speed",
      value: `${Math.round(psiData.performanceScore)}/100`,
      status: psiData.performanceScore >= 90 ? 'good' : psiData.performanceScore >= 50 ? 'warning' : 'critical'
    });

    const stack = psiData.techStackIds.length > 0 ? psiData.techStackIds.join(', ') : "Standard";
    realTechnicalSignals.push({
      label: "Technology",
      value: stack,
      status: psiData.techStackIds.length > 0 ? 'good' : 'warning'
    });

    realTechnicalSignals.push({
      label: "Loading Time",
      value: psiData.coreWebVitals.lcp || "N/A",
      status: parseFloat(psiData.coreWebVitals.lcp) < 2.5 ? 'good' : 'warning'
    });
  } else {
     realTechnicalSignals.push({
      label: "Website Scan",
      value: "Connection Error",
      status: "warning"
    });
    realTechnicalSignals.push({
        label: "Manual Check",
        value: "Required",
        status: "critical"
    });
  }

  // 4. Construct Prompt
  const speedInput = psiData.success ? `${psiData.performanceScore}/100` : "UNAVAILABLE";
  const techInput = psiData.success ? (psiData.techStackIds.join(', ') || "Standard") : "Unknown";
  
  let domain = "unknown";
  try {
    domain = new URL(normalizeUrl(brand.url)).hostname;
  } catch (e) {
    domain = brand.url;
  }

  const prompt = `
    You are a forensic brand auditor. You must analyze the brand "${brand.name}" located at the specific domain "${domain}".
    
    **CRITICAL DATA SOURCE PROTOCOL:**
    1. **TECHNICAL DATA:**
       - Mobile Speed Score provided: ${speedInput}
       - Tech Stack provided: ${techInput}
       
       **IMPORTANT:** If "Mobile Speed" is "UNAVAILABLE" or "Unknown", you **MUST** use the 'google_search' tool to manually search for "site:${domain}" to read the meta title and description yourself. Do not just say "I can't access it". Infer the business type from the search snippets.

    2. **DISAMBIGUATION:**
       - The brand name might be generic. Ignore any entity that does not reside at "${domain}".
       - If "site:${domain}" yields no clear results, search for "${domain}" (in quotes) to find social profiles linked to this URL.

    **SCORING & TONE:**
    - Tone: Professional, direct, "tough love". No fluff.
    - If the user answered "No" to critical questions (like marketing spend), be harsh in the strategy section.
    - If the site speed is low (${speedInput}) or UNAVAILABLE, emphasize that they are losing traffic due to technical friction.

    **QUESTIONNAIRE RESULTS:**
    ${formattedAnswers}

    **OUTPUT FORMAT (JSON ONLY):**
    {
      "businessContext": "Definitively state the industry found on ${domain}. Do NOT say 'could not be verified'. Make your best assessment from the search snippets.",
      "momentumScore": [Integer 0-100],
      "executiveSummary": "2-3 bold sentences diagnosing their main bottleneck. Use **bold** for emphasis.",
      "technicalSignals": [ { "label": "string", "value": "string", "status": "good"|"warning"|"critical" } ],
      "categories": [
        {
          "title": "Strategy" | "Visuals" | "Growth" | "Content" | "Operations" | "SEO",
          "score": [Integer 0-100],
          "diagnostic": "Specific observation about this category.",
          "evidence": ["Evidence 1", "Evidence 2"],
          "strategy": "Specific, actionable recommendation."
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
      // Fallback logic remains the same...
      const yesAnswers = responses.filter(r => r.answer === 1).length;
      const totalQuestions = responses.length || 16;
      const quizScore = Math.round((yesAnswers / totalQuestions) * 100);

      return {
        momentumScore: psiData.success ? Math.round((psiData.performanceScore + quizScore) / 2) : quizScore,
        businessContext: `Analysis based on provided inputs for ${brand.name}.`,
        executiveSummary: "We have generated a preliminary score based on your inputs. Technical scan was inconclusive, manual review recommended.",
        technicalSignals: realTechnicalSignals,
        categories: [
            { title: QuestionCategory.STRATEGY, score: 70, diagnostic: "Strategy check.", evidence: ["User Input"], strategy: "Review strategy." },
            { title: QuestionCategory.OPERATIONS, score: 60, diagnostic: "Ops check.", evidence: ["User Input"], strategy: "Automate leads." },
            { title: QuestionCategory.VISUALS, score: 75, diagnostic: "Visual check.", evidence: ["User Input"], strategy: "Improve design." },
            { title: QuestionCategory.CONTENT, score: 55, diagnostic: "Content check.", evidence: ["User Input"], strategy: "Plan content." },
            { title: QuestionCategory.GROWTH, score: 65, diagnostic: "Growth check.", evidence: ["User Input"], strategy: "Track CPL." },
            { title: QuestionCategory.SEO, score: 50, diagnostic: "SEO check.", evidence: ["User Input"], strategy: "Audit technical SEO." }
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
          temperature: 0.4, // Lower temperature for more factual/grounded responses
        }
      });
      
      const jsonText = response.text || "";
      const result = cleanAndParseJSON(jsonText);
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const urls = chunks.map((c: any) => c.web?.uri).filter(Boolean);

      const finalSignals = [...realTechnicalSignals];
      if (result.technicalSignals && Array.isArray(result.technicalSignals)) {
        result.technicalSignals.forEach((aiSig: any) => {
           const isDup = finalSignals.some(fs => fs.label.toLowerCase() === aiSig.label.toLowerCase());
           if (!isDup) finalSignals.push(aiSig);
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
    }
  }

  return getFallbackResult();
};