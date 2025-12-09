import { AuditResult, BrandInfo, LeadInfo, UserResponse } from "../types";
import { QUESTIONS } from "../constants";

// Get the webhook URL from environment variables
const SUBMISSION_ENDPOINT = process.env.REACT_APP_WEBHOOK_URL || "";

/**
 * Generates a sharable link by encoding the result in the URL.
 * NOTE: URLs have length limits. We strip 'debugLog' to save space.
 */
function generateMagicLink(brand: BrandInfo, result: AuditResult): string {
  try {
    const minifiedResult = {
      ...result,
      debugLog: undefined, // Strip debug info to save space
    };
    
    // Create a payload that includes brand info so we can restore everything
    const restorePayload = {
      brand: brand,
      result: minifiedResult
    };

    const jsonString = JSON.stringify(restorePayload);
    const base64String = btoa(unescape(encodeURIComponent(jsonString))); // Robust utf-8 base64
    
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?r=${base64String}`;
  } catch (e) {
    console.warn("Failed to generate magic link", e);
    return window.location.href;
  }
}

export const submitLead = async (
  lead: LeadInfo,
  brand: BrandInfo,
  result: AuditResult,
  responses: UserResponse[]
): Promise<boolean> => {
  
  // Format the raw answers
  const formattedQuizData = responses.map(r => {
    const q = QUESTIONS.find(q => q.id === r.questionId);
    let answerText = r.answer.toString();
    if (q?.type === 'boolean') {
      answerText = r.answer === 1 ? "Yes" : "No";
    }
    return {
      category: q?.category || "Unknown",
      question: q?.text || `Question ${r.questionId}`,
      answer: answerText
    };
  });

  const magicLink = generateMagicLink(brand, result);

  const payload = {
    capturedAt: new Date().toISOString(),
    lead: {
      firstName: lead.firstName,
      lastName: lead.lastName,
      position: lead.position,
      email: lead.email,
      phone: lead.phone
    },
    brand: {
      name: brand.name,
      url: brand.url
    },
    scores: {
      total: result.momentumScore,
      strategy: result.categories.find(c => c.title === 'Strategy')?.score || 0,
      growth: result.categories.find(c => c.title === 'Growth')?.score || 0,
      visuals: result.categories.find(c => c.title === 'Visuals')?.score || 0,
    },
    report_link: magicLink, 
    summary: result.executiveSummary,
    quiz_data: formattedQuizData
  };

  console.log("-----------------------------------------");
  console.log("LEAD CAPTURED. GENERATING REPORT...");
  console.log("Magic Link:", magicLink);
  console.log("-----------------------------------------");

  try {
    if (SUBMISSION_ENDPOINT) {
      console.log("Submitting Payload to Webhook...");
      await fetch(SUBMISSION_ENDPOINT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify(payload)
      });
      console.log("Webhook Submission Successful");
    } else {
      console.warn("No REACT_APP_WEBHOOK_URL configured. Submission skipped.");
    }
    
    return true;
  } catch (error) {
    console.error("CRM Submission Error:", error);
    // Return true anyway so UX isn't blocked
    return true; 
  }
};