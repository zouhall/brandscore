import { GoogleGenAI } from "@google/genai";
import { AuditResult, BrandInfo, UserResponse, QuestionCategory, TechnicalSignal } from "../types";
import { QUESTIONS } from "../constants";

const PSI_API_KEY = "AIzaSyBDLbIjPS9o1gmL7rw6BQnr3s1E7RoOoK8";

// --- UTILITIES ---

function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

function cleanAndParseJSON(text: string): any {
  // Remove Markdown code blocks if present
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  
  // Find the JSON object: starts with { and ends with }
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

async function fetchPageSpeedData(rawUrl: string) {
  const url = normalizeUrl(rawUrl);
  try {
    // Mobile Strategy for strict scoring
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${PSI_API_KEY}&strategy=mobile`;
    
    const response = await fetch(apiUrl);
    
    // If quota exceeded or other API error, throw to trigger fallback
    if (!response.ok) {
        throw new Error(`PSI API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      console.warn("PSI API Error Body:", data.error.message);
      throw new Error(data.error.message);
    }

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
    console.warn("PSI fetch failed, defaulting to manual check mode.", error);
    return {
      success: false,
      performanceScore: -1, // Mark as invalid/unavailable
      coreWebVitals: { lcp: 'N/A', cls: 'N/A', fcp: 'N/A' },
      techStackIds: []
    };
  }
}

// --- MAIN SERVICE ---

export const performBrandAudit = async (
  brand: BrandInfo,
  responses: UserResponse[]
): Promise<AuditResult> => {
  let ai;
  try {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {
    console.warn("API Key missing or invalid.");
  }

  // 1. Fetch Real Technical Data (The "Crawl")
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
     // Graceful fallback signals
     realTechnicalSignals.push({
      label: "Website Scan",
      value: "Manual Check Needed",
      status: "warning"
    });
    realTechnicalSignals.push({
        label: "Connection",
        value: "Verified",
        status: "good"
    });
  }

  // 4. Construct Prompt
  // Handle the case where speed is unavailable so the AI doesn't hallucinate a disaster
  const speedInput = psiData.success ? `${psiData.performanceScore}/100` : "UNAVAILABLE (Do not penalize score)";
  const techInput = psiData.success ? (psiData.techStackIds.join(', ') || "Standard") : "Unknown";
  
  let domain = "unknown";
  try {
    domain = new URL(normalizeUrl(brand.url)).hostname;
  } catch (e) {
    domain = brand.url;
  }

  const prompt = `
    You are a forensic brand auditor conducting a deep analysis of:
    Brand: "${brand.name}"
    URL: "${normalizeUrl(brand.url)}"
    Domain: "${domain}"

    **INPUT DATA:**
    - Mobile Speed: ${speedInput}
    - Tech Stack: ${techInput}
    - Questionnaire Results:
    ${formattedAnswers}

    **RESEARCH PROTOCOL (Use Google Search Tool):**
    1. Search for "${brand.name}" AND the domain "${domain}" to find their actual business offering.
    2. Search for social media profiles (LinkedIn, Instagram, Twitter) for this brand.
    3. Identify their specific industry (e.g., "SaaS", "Local Bakery", "E-commerce Fashion").

    **ANALYSIS DIRECTIVES:**
    - **Industry Context**: You MUST identify the industry. If search fails, infer it from the domain name or brand name (e.g., "zouhall" sounds like consulting/tech).
    - **Specific Advice**: Do NOT give generic advice (e.g., "Improve SEO"). Give specific advice for their industry (e.g., "As a consulting firm, you need case studies on your homepage").
    - **Zero Presence Handling**: If the brand is new or not indexed, classify them as "Early Stage / Stealth". Do NOT say "Zero presence found". Instead, analyze their *readiness* based on their questionnaire answers and tech stack. 
    - **Vagueness Ban**: Avoid phrases like "Ensure you have a plan." Say "Create a 3-month roadmap."
    - **MANDATORY**: You MUST output exactly 6 categories in the 'categories' array: Strategy, Operations, Visuals, Content, Growth, SEO.

    **OUTPUT FORMAT (JSON ONLY):**
    {
      "businessContext": "Clearly state the industry and what the business does. Mention if it appears to be Early Stage.",
      "momentumScore": [Integer 0-100],
      "executiveSummary": "2-3 bold sentences diagnosing their main bottleneck based on the data.",
      "technicalSignals": [ { "label": "string", "value": "string", "status": "good"|"warning"|"critical" } ],
      "categories": [
        // MUST INCLUDE ALL 6: Strategy, Visuals, Growth, Content, Operations, SEO
        {
          "title": "Strategy" | "Visuals" | "Growth" | "Content" | "Operations" | "SEO",
          "score": [Integer 0-100],
          "diagnostic": "Specific observation about this category.",
          "evidence": ["Specific Fact 1 (e.g. 'No FB Pixel')", "Specific Fact 2"],
          "strategy": "Specific, actionable recommendation."
        }
      ],
      "perceptionGap": {
        "detected": [Boolean],
        "verdict": "Short verdict.",
        "details": "Explain if the user thinks they are doing better than the data suggests."
      }
    }
  `;

  // 5. Fallback Generator (If AI fails twice)
  const getFallbackResult = (): AuditResult => {
      // Calculate a rough score based on answers since tech failed
      const yesAnswers = responses.filter(r => r.answer === 1).length;
      const totalQuestions = responses.length || 16;
      const quizScore = Math.round((yesAnswers / totalQuestions) * 100);

      return {
        momentumScore: psiData.success ? Math.round((psiData.performanceScore + quizScore) / 2) : quizScore,
        businessContext: `We identified ${brand.name} as a potential market entrant.`,
        executiveSummary: psiData.success 
            ? `Your technical foundation (${Math.round(psiData.performanceScore)}/100 Speed Score) is solid, but your strategy needs alignment.`
            : `We've analyzed your answers. Your operational and strategic foundation scores a ${quizScore}/100 based on your inputs.`,
        technicalSignals: realTechnicalSignals,
        categories: [
        {
            title: QuestionCategory.STRATEGY,
            score: 70,
            diagnostic: "Strategy analysis based on inputs.",
            evidence: ["User Inputs Reviewed"],
            strategy: "Review your marketing budget and customer data practices."
        },
        {
            title: QuestionCategory.OPERATIONS,
            score: 60,
            diagnostic: "Operational efficiency check.",
            evidence: ["Self-reported data"],
            strategy: "Implement a CRM to track leads automatically."
        },
        {
            title: QuestionCategory.VISUALS,
            score: 75,
            diagnostic: "Visual impact assessment.",
            evidence: ["Website active"],
            strategy: "Ensure your brand design builds trust immediately."
        },
        {
            title: QuestionCategory.CONTENT,
            score: 55,
            diagnostic: "Content strategy needs review.",
            evidence: ["Social presence check"],
            strategy: "Develop a 12-month content calendar."
        },
        {
            title: QuestionCategory.GROWTH,
            score: 65,
            diagnostic: "Growth engine health check.",
            evidence: ["Ads status unknown"],
            strategy: "Track your cost per lead (CPL) rigorously."
        },
        {
            title: QuestionCategory.SEO,
            score: psiData.success ? Math.round(psiData.performanceScore) : 50,
            diagnostic: psiData.success ? "Your website speed affects ranking." : "Technical SEO check required.",
            evidence: psiData.success ? [`Load Time: ${psiData.coreWebVitals.lcp}`] : ["Scan unavailable"],
            strategy: "Ask a developer to run a deep technical audit."
        }
        ],
        perceptionGap: { detected: false, verdict: "Inconclusive", details: "Manual Review Recommended" },
        groundingUrls: [],
        debugLog: { psiData, formattedUserAnswers: formattedAnswers, generatedAt: new Date().toISOString() }
    };
  };

  // 6. Execute with Retry
  if (!ai) return getFallbackResult();

  let lastError;
  
  // RETRY LOOP: Try 2 times
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`AI Attempt ${attempt}...`);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Switched to 2.5-flash for better search tool reliability
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });
      
      const jsonText = response.text || "";
      const result = cleanAndParseJSON(jsonText); // Will throw if invalid
      
      // Post-process URLS
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const urls = chunks.map((c: any) => c.web?.uri).filter(Boolean);

      // Merge Signals (Real + AI)
      // We keep Real signals at the top
      const finalSignals = [...realTechnicalSignals];
      if (result.technicalSignals && Array.isArray(result.technicalSignals)) {
        result.technicalSignals.forEach((aiSig: any) => {
           // Avoid duplicates
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
        debugLog: { psiData, formattedUserAnswers: formattedAnswers, generatedAt: new Date().toISOString() }
      };

    } catch (e) {
      console.error(`Attempt ${attempt} failed:`, e);
      lastError = e;
      // If it's a timeout, we might not want to retry immediately, but for JSON errors we do.
      if (attempt === 2) break; 
    }
  }

  // If we reach here, retries failed
  console.error("All AI attempts failed. Returning fallback.", lastError);
  return getFallbackResult();
};