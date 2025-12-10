import { AuditResult, BrandInfo, LeadInfo, UserResponse } from "../types";
import { QUESTIONS } from "../constants";
import { generateEmailHtml, generateEmailSubject } from "./emailTemplates";

// We no longer send from the client. This service now just formats data for the DB.
export const prepareCrmData = (
  lead: LeadInfo,
  brand: BrandInfo,
  result: AuditResult,
  responses: UserResponse[],
  reportUrl: string 
) => {
  
  // 1. Format the raw answers for the CRM
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
  const emailHtml = generateEmailHtml(lead, brand, result, reportUrl);
  const emailSubject = generateEmailSubject(brand, result);

  // 3. Return the payload to be saved in Supabase
  return {
    capturedAt: new Date().toISOString(),
    
    // Lead Data
    lead: {
      firstName: lead.firstName,
      lastName: lead.lastName,
      fullName: lead.fullName,
      position: lead.position,
      revenue: lead.revenue,           // Included for Zapier
      companySize: lead.companySize,   // Included for Zapier
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
      html_body: emailHtml,
    },
    
    quiz_data: formattedQuizData
  };
};