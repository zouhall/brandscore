import { GoogleGenAI } from "@google/genai";
import { AuditResult, BrandInfo, UserResponse, QuestionCategory, TechnicalSignal } from "../types";
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

/**
 * Enhanced PSI Fetcher:
 * - Gets Performance AND SEO scores
 * - Identifies "Bugs" (Failed audits)
 * - improved tech stack detection
 */
async function fetchPageSpeedData(rawUrl: string) {
  const url = normalizeUrl(rawUrl);
  
  if (!PSI_API_KEY) {
    console.warn("VITE_PSI_API_KEY is missing. Skipping technical crawl.");
    return null;
  }

  // Strategy: Mobile is the standard for modern indexing
  const strategy = 'mobile';

  try {
    console.log(`PSI: Deep Scan on ${url}...`);
    // Requesting both 'performance' and 'seo' categories
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${PSI_API_KEY}&strategy=${strategy}&category=performance&category=seo`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`PSI API Error: ${response.status}`);

    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    
    // 1. Scores
    const perfScore = lighthouse.categories.performance?.score ? Math.round(lighthouse.categories.performance.score * 100) : -1;
    const seoScore = lighthouse.categories.seo?.score ? Math.round(lighthouse.categories.seo.score * 100) : -1;

    // 2. Core Web Vitals
    const audits = lighthouse.audits;
    const webVitals = {
      lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
      cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
      fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
    };

    // 3. Tech Stack (Stack Packs)
    const techStack = lighthouse.stackPacks?.map((p: any) => p.title) || [];
    
    // 4. Identify Technical Bugs (Failed Audits with high impact)
    const bugs: string[] = [];
    const importantAudits = [
      'errors-in-console', 
      'broken-links', 
      'is-crawlable', 
      'robots-txt', 
      'viewport'
    ];
    
    importantAudits.forEach(id => {
       const audit = audits[id];
       if (audit && (audit.score === 0 || audit.score === null)) {
         bugs.push(audit.title); // e.g., "Browser errors were logged to the console"
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
  } catch (error) {
    console.warn(`PSI fetch failed:`, error);
    return null;
  }
}

// --- MAIN SERVICE ---

export const performBrandAudit = async (
  brand: BrandInfo,
  responses: UserResponse[]
): Promise<AuditResult> => {
  let ai;
  const apiKey = process.env.API_KEY;

  if (apiKey) ai = new GoogleGenAI({ apiKey: apiKey });

  // 1. EXECUTE DEEP CRAWL
  const crawlData = await fetchPageSpeedData(brand.url);
  
  // 2. FORMAT QUIZ DATA
  const formattedAnswers = responses.map(r => {
    const q = QUESTIONS.find(q => q.id === r.questionId);
    return `- ${q?.category}: ${r.answer === 1 ? 'Positive' : 'Negative'} (${q?.text})`;
  }).join('\n');

  // 3. PREPARE SIGNALS FROM REAL DATA
  const signals: TechnicalSignal[] = [];
  let detectedBugs = "None detected";
  
  if (crawlData && crawlData.success) {
    signals.push({
      label: "Mobile Performance",
      value: `${crawlData.perfScore}/100`,
      status: crawlData.perfScore >= 90 ? 'good' : crawlData.perfScore >= 50 ? 'warning' : 'critical'
    });
    
    signals.push({
      label: "SEO Health",
      value: `${crawlData.seoScore}/100`,
      status: crawlData.seoScore >= 90 ? 'good' : crawlData.seoScore >= 70 ? 'warning' : 'critical'
    });

    const stackLabel = crawlData.techStack.length > 0 ? crawlData.techStack.join(', ') : "Custom / Unknown";
    signals.push({
      label: "Tech Stack",
      value: stackLabel.substring(0, 20), // Truncate if too long
      status: 'good'
    });

    if (crawlData.bugs.length > 0) {
      detectedBugs = crawlData.bugs.join(', ');
      signals.push({
        label: "Critical Issues",
        value: `${crawlData.bugs.length} Found`,
        status: 'critical'
      });
    }
  } else {
    signals.push({ label: "Site Scan", value: "Blocked / Failed", status: "critical" });
  }

  // 4. CONSTRUCT THE "FORENSIC" PROMPT
  let domain = "unknown";
  try { domain = new URL(normalizeUrl(brand.url)).hostname; } catch(e) { domain = brand.url; }

  const prompt = `
    You are a Senior Digital Brand Auditor. Perform a forensic analysis of "${brand.name}" (${domain}).
    
    **PHASE 1: SEARCH & IDENTIFY (Mandatory)**
    Use 'google_search' to perform these exact steps:
    1. Search "site:${domain}" to read the Homepage Title Tag and Meta Description. 
       - *Context:* This usually states exactly what they do (e.g., "Digital Marketing Agency" vs "Men's Clothing Store").
    2. Search "${brand.name} reviews" or "${brand.name} reputation".
    3. Search "${brand.name} about us" or "${brand.name} services".

    **PHASE 2: BUSINESS MODEL CLASSIFICATION (Crucial)**
    Analyze the search snippets to determine the *Primary Action*:
    - Do they want you to **"Add to Cart"**? -> They are E-commerce (Retail).
    - Do they want you to **"Book a Call"**, **"Contact Us"**, or **"View Portfolio"**? -> They are a Service Business (Agency/Consultancy).
    - *Warning:* Digital Agencies often have portfolios of "shops" they built. Do NOT confuse a portfolio case study for the business itself.
    - If the brand is "Zouhall" or "Zouhall Digital", it is a Digital Agency / Tech Consultant.

    **PHASE 3: TECHNICAL & CONTENT ANALYSIS**
    **Real Crawl Data:**
    - Mobile Speed: ${crawlData?.perfScore || 'Unknown'} / 100
    - SEO Score: ${crawlData?.seoScore || 'Unknown'} / 100
    - Detected Tech: ${crawlData?.techStack.join(', ') || 'Unknown'}
    - Detected Bugs: ${detectedBugs}

    **User Quiz Inputs:**
    ${formattedAnswers}

    **OUTPUT REQUIREMENT (JSON ONLY):**
    Return a JSON object. Do not include markdown code blocks.
    {
      "businessContext": "1 sentence defining the EXACT business model (e.g., 'High-end Digital Agency specializing in fashion' or 'Direct-to-Consumer Menswear Brand').",
      "executiveSummary": "2-3 hard-hitting sentences. Mention their technical health (Speed/SEO) and their business strategy gap based on the quiz. Be direct.",
      "momentumScore": [Integer 0-100 based on average of Speed, SEO, and Quiz],
      "technicalSignals": [
         // Merge the Real Crawl Data signals provided above with any reputation signals you found (e.g. 'Reputation: 4.8 Stars').
         // Format: { "label": "string", "value": "string", "status": "good"|"warning"|"critical" }
         // Ensure you explicitly list 'SEO Score' and 'Mobile Performance' here.
      ],
      "categories": [
        // Create 6 categories: 'Strategy', 'Visuals', 'Growth', 'Content', 'Operations', 'SEO'.
        // For each, provide:
        // { 
        //   "title": "Strategy", 
        //   "score": [0-100], 
        //   "diagnostic": "What is broken? (e.g. 'Site is too slow', 'No CRM detected')", 
        //   "evidence": ["Evidence 1", "Evidence 2"], 
        //   "strategy": "How to fix it." 
        // }
      ],
      "perceptionGap": {
        "detected": [Boolean - Is there a gap between their 'Yes' answers and their actual poor technical scores?],
        "verdict": "Reality Check",
        "details": "Explain the gap."
      }
    }
  `;

  // Fallback if AI fails or no key
  const getFallbackResult = (): AuditResult => {
      const quizScore = 50; 
      return {
        momentumScore: crawlData?.perfScore ? Math.round((crawlData.perfScore + quizScore)/2) : 50,
        businessContext: `Analysis of ${brand.name}`,
        executiveSummary: "Technical scan complete. Waiting for detailed strategic analysis.",
        technicalSignals: signals,
        categories: [],
        perceptionGap: { detected: false, verdict: "Inconclusive", details: "" },
        groundingUrls: []
      };
  };

  if (!ai) return getFallbackResult();
  
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`AI Analysis Attempt ${attempt}...`);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.4, // Lower temperature for more analytical/factual output
        }
      });
      
      const jsonText = response.text || "";
      const result = cleanAndParseJSON(jsonText);
      
      // Extract grounding
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const urls = chunks.map((c: any) => c.web?.uri).filter(Boolean);

      // Final merge of signals (Ensure real technical data isn't overwritten by hallucinations)
      // We prioritize the 'signals' array created from real PSI data, but allow AI to add 'Reputation' or 'Content' signals.
      let finalSignals = [...signals];
      
      if (result.technicalSignals && Array.isArray(result.technicalSignals)) {
        // Only add non-duplicate signals from AI (e.g., Reputation, Brand Age)
        result.technicalSignals.forEach((aiSig: any) => {
          const isTechDuplicate = finalSignals.some(fs => 
            fs.label.toLowerCase().includes('speed') || 
            fs.label.toLowerCase().includes('seo') || 
            fs.label.toLowerCase().includes('tech')
          );
          // If it's not a technical metric we already have, add it
          if (!isTechDuplicate || (!aiSig.label.toLowerCase().includes('speed') && !aiSig.label.toLowerCase().includes('seo'))) {
             // Check strict duplicate label
             if (!finalSignals.some(fs => fs.label === aiSig.label)) {
                finalSignals.push(aiSig);
             }
          }
        });
      }

      return {
        momentumScore: result.momentumScore || 50,
        businessContext: result.businessContext || `Business Analysis for ${brand.name}`,
        executiveSummary: result.executiveSummary || "Audit complete.",
        technicalSignals: finalSignals,
        categories: result.categories || [],
        perceptionGap: result.perceptionGap || { detected: false, verdict: "None", details: "" },
        groundingUrls: urls.slice(0, 5),
      };

    } catch (e) {
      console.error(`AI Attempt ${attempt} failed:`, e);
      if (attempt === 2) break;
      await delay(1000);
    }
  }

  return getFallbackResult();
};