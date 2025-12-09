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
    const data = await response.json();
    
    if (data.error) {
      console.warn("PSI API Error:", data.error.message);
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
    console.warn("PSI fetch failed, using fallback signals.", error);
    return {
      success: false,
      performanceScore: 0,
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
  // We normalize the URL here to prevent failures on "zouhall.com" vs "https://zouhall.com"
  const psiData = await fetchPageSpeedData(brand.url);
  
  // 2. Format User Answers
  const formattedAnswers = responses.map(r => {
    const q = QUESTIONS.find(q => q.id === r.questionId);
    return `- [${q?.category}] "${q?.text}": ${r.answer === 1 ? 'YES' : 'NO'}`;
  }).join('\n');

  // 3. Prepare Technical Signals
  const realTechnicalSignals: TechnicalSignal[] = [];
  
  if (psiData.success) {
    realTechnicalSignals.push({
      label: "Mobile Performance",
      value: `Score: ${Math.round(psiData.performanceScore)}/100`,
      status: psiData.performanceScore >= 90 ? 'good' : psiData.performanceScore >= 50 ? 'warning' : 'critical'
    });

    const stack = psiData.techStackIds.length > 0 ? psiData.techStackIds.join(', ') : "Custom/Unknown";
    realTechnicalSignals.push({
      label: "Tech Stack",
      value: stack,
      status: psiData.techStackIds.length > 0 ? 'good' : 'warning'
    });

    realTechnicalSignals.push({
      label: "Core Web Vitals (LCP)",
      value: psiData.coreWebVitals.lcp || "N/A",
      status: parseFloat(psiData.coreWebVitals.lcp) < 2.5 ? 'good' : 'warning'
    });
  } else {
     realTechnicalSignals.push({
      label: "Scan Status",
      value: "Connection Failed",
      status: "critical"
    });
  }

  // 4. Construct Prompt
  const prompt = `
    You are the "Zouhall Intelligence Engine". You are a ruthless, forensic brand auditor.
    TARGET: "${brand.name}" at "${normalizeUrl(brand.url)}".

    **HARD DATA INPUTS (DO NOT IGNORE):**
    - Mobile Performance Score: ${psiData.performanceScore}/100
    - Tech Stack: ${psiData.techStackIds.join(', ') || "Unknown"}
    - User Questionnaire:
    ${formattedAnswers}

    **YOUR MISSION:**
    1. USE GOOGLE SEARCH to find:
       - The brand's main headline/H1.
       - Their exact business model.
       - Recent social media activity (verify if they are active).
    2. ANALYZE the discrepancy between the user's answers (Perception) and the Hard Data (Reality).
    3. GENERATE a JSON report.

    **OUTPUT RULES:**
    - RESPONSE MUST BE PURE JSON. NO TEXT BEFORE OR AFTER.
    - NO MARKDOWN BLOCKS (\`\`\`).
    - TONE: Professional, slightly intimidating, extremely competent.

    **JSON SCHEMA:**
    {
      "businessContext": "We identified [Brand Name] as a [Industry] player. Our scan detected...",
      "momentumScore": [Number 0-100],
      "executiveSummary": "Direct, hard-hitting summary of their current situation.",
      "technicalSignals": [ 
         // Add 1-2 signals that YOU found via search (e.g. 'Instagram Activity', 'Google Indexing'). 
         // DO NOT repeat the hard data provided above, those will be merged automatically.
         { "label": "string", "value": "string", "status": "good"|"warning"|"critical" } 
      ],
      "categories": [
        {
          "title": "Strategy" | "Visuals" | "Growth" | "Content" | "Operations" | "SEO",
          "score": [Number 0-100],
          "diagnostic": "What is wrong?",
          "evidence": ["Proof point 1", "Proof point 2"],
          "strategy": "How to fix it immediately."
        }
      ],
      "perceptionGap": {
        "detected": [Boolean],
        "verdict": "e.g. Delusional / Accurate / Underconfident",
        "details": "e.g. You rated SEO high, but your Mobile Score is 30."
      }
    }
  `;

  // 5. Fallback Generator (If AI fails twice)
  const getFallbackResult = (): AuditResult => ({
    momentumScore: psiData.performanceScore > 0 ? Math.round((psiData.performanceScore + 60) / 2) : 50,
    businessContext: `We identified ${brand.name}. Technical sensors detected ${psiData.techStackIds.join(', ') || 'web infrastructure'}, but deep semantic analysis was interrupted.`,
    executiveSummary: `Your technical foundation (${Math.round(psiData.performanceScore)}/100 Mobile Score) is creating friction. While we couldn't complete the full semantic deep-dive, the data indicates immediate optimization is required.`,
    technicalSignals: realTechnicalSignals,
    categories: [
       {
         title: QuestionCategory.STRATEGY,
         score: 60,
         diagnostic: "Strategic alignment unclear due to scan interference.",
         evidence: ["Mobile Score: " + Math.round(psiData.performanceScore), "Tech Stack: " + (psiData.techStackIds[0] || "Unknown")],
         strategy: "Focus on technical remediation of the landing page."
       },
       // ... simplified categories for fallback
       {
         title: QuestionCategory.SEO,
         score: Math.round(psiData.performanceScore),
         diagnostic: "Core Web Vitals indicate user experience penalties.",
         evidence: [`LCP: ${psiData.coreWebVitals.lcp}`, `CLS: ${psiData.coreWebVitals.cls}`],
         strategy: "Technical SEO Sprint required."
       }
    ],
    perceptionGap: { detected: false, verdict: "Inconclusive", details: "AI Scan Timeout" },
    groundingUrls: [],
    debugLog: { psiData, formattedUserAnswers: formattedAnswers, generatedAt: new Date().toISOString() }
  });

  // 6. Execute with Retry
  if (!ai) return getFallbackResult();

  let lastError;
  
  // RETRY LOOP: Try 2 times
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`AI Attempt ${attempt}...`);
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // User requested Gemini 3
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          // temperature: 0.7 // Default is fine
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