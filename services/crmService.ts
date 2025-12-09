import { AuditResult, BrandInfo, LeadInfo, UserResponse } from "../types";
import { QUESTIONS } from "../constants";

// This URL will eventually be your Vercel Serverless Function or Zapier Webhook URL
// For now, we simulate the delay.
const SUBMISSION_ENDPOINT = process.env.REACT_APP_WEBHOOK_URL || "";

export const submitLead = async (
  lead: LeadInfo,
  brand: BrandInfo,
  result: AuditResult,
  responses: UserResponse[]
): Promise<boolean> => {
  
  // Format the raw answers into a readable structure for the database/CRM
  const formattedQuizData = responses.map(r => {
    const q = QUESTIONS.find(q => q.id === r.questionId);
    let answerText = r.answer.toString();
    
    // Convert boolean 0/1 to No/Yes for readability
    if (q?.type === 'boolean') {
      answerText = r.answer === 1 ? "Yes" : "No";
    }

    return {
      category: q?.category || "Unknown",
      question: q?.text || `Question ${r.questionId}`,
      answer: answerText
    };
  });

  const payload = {
    capturedAt: new Date().toISOString(),
    lead: {
      name: lead.fullName,
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
    quiz_data: formattedQuizData, // <--- New Field with full answers
    summary: result.executiveSummary
  };

  try {
    console.log("Submitting Payload to Backend:", payload);

    // --- PRODUCTION IMPLEMENTATION ---
    // Uncomment this when you deploy to Vercel
    /*
    const response = await fetch('/api/submit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error('Submission failed');
    */

    // --- SIMULATION FOR DEMO ---
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  } catch (error) {
    console.error("CRM Submission Error:", error);
    return false;
  }
};