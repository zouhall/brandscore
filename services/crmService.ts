import { AuditResult, BrandInfo, LeadInfo, UserResponse } from "../types";
import { QUESTIONS } from "../constants";
import { generateEmailHtml, generateEmailSubject } from "./emailTemplates";

// Get the webhook URL from environment variables
const SUBMISSION_ENDPOINT = process.env.REACT_APP_WEBHOOK_URL || "";

export const submitLead = async (
  lead: LeadInfo,
  brand: BrandInfo,
  result: AuditResult,
  responses: UserResponse[],
  reportUrl: string 
): Promise<boolean> => {
  
  // 1. Format the raw answers for the CRM (HubSpot/Airtable)
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

  // 2. Generate the Email Content locally
  // This allows the Webhook to simply pass 'email_html' to Resend without needing complex logic.
  const emailHtml = generateEmailHtml(lead, brand, result, reportUrl);
  const emailSubject = generateEmailSubject(brand, result);

  // 3. Construct the Payload
  const payload = {
    capturedAt: new Date().toISOString(),
    
    // Lead Data
    lead: {
      firstName: lead.firstName,
      lastName: lead.lastName,
      fullName: lead.fullName,
      position: lead.position,
      email: lead.email,
      phone: lead.phone
    },
    
    // Brand Data
    brand: {
      name: brand.name,
      url: brand.url
    },
    
    // Scores
    scores: {
      total: result.momentumScore,
      strategy: result.categories.find(c => c.title === 'Strategy')?.score || 0,
      growth: result.categories.find(c => c.title === 'Growth')?.score || 0,
      visuals: result.categories.find(c => c.title === 'Visuals')?.score || 0,
    },
    
    // The Magic/Vanity Link
    report_link: reportUrl, 
    
    // Context
    summary: result.executiveSummary,
    
    // Ready-to-send Email Data
    email_config: {
      recipient: lead.email,
      subject: emailSubject,
      html_body: emailHtml, // <--- Map this field in Zapier/Make to Resend "Body"
    },
    
    quiz_data: formattedQuizData
  };

  console.log("-----------------------------------------");
  console.log("LEAD CAPTURED. SENDING TO WEBHOOK...");
  console.log(`Target: ${lead.email}`);
  console.log(`Link: ${reportUrl}`);
  console.log("-----------------------------------------");

  try {
    if (SUBMISSION_ENDPOINT) {
      // mode: 'cors' ensures we attempt a standard cross-origin request
      const response = await fetch(SUBMISSION_ENDPOINT, {
        method: 'POST',
        mode: 'cors', 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`Webhook responded with status: ${response.status}`);
      } else {
        console.log("Webhook Submission Successful");
      }
    } else {
      console.warn("No REACT_APP_WEBHOOK_URL configured. Submission skipped.");
    }
    
    return true;
  } catch (error) {
    console.error("CRM Submission Error:", error);
    // Return true anyway so UX isn't blocked for the user
    return true; 
  }
};