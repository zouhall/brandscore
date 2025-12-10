import { createClient } from '@supabase/supabase-js';
import { AuditResult, BrandInfo, LeadInfo, UserResponse } from '../types';
import { prepareCrmData } from './crmService';
import { generateUUID } from './utils';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Only initialize if keys are present
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

/**
 * Saves the audit to Supabase and returns the generated Short URL.
 */
export const saveToSupabase = async (
  brand: BrandInfo,
  lead: LeadInfo,
  result: AuditResult,
  quizResponses: UserResponse[]
): Promise<string | null> => {
  if (!supabase) {
    console.warn("Supabase not configured. Skipping database save.");
    return null;
  }

  try {
    // 1. Generate ID Client-Side
    // We do this so we can construct the URL *before* inserting into the DB.
    // This allows us to do a SINGLE insert, ensuring the Webhook gets all data immediately.
    const id = generateUUID();

    // 2. Construct the Short URL using the ID
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const shortUrl = `${origin}${pathname}?id=${id}`;

    // 3. Generate CRM Data (Email HTML, etc)
    const crmData = prepareCrmData(lead, brand, result, quizResponses, shortUrl);

    // 4. Single Insert with ALL data
    const { error } = await supabase
      .from('brand_audits')
      .insert([
        {
          id: id,
          brand_name: brand.name,
          brand_url: brand.url,
          lead_first_name: lead.firstName,
          lead_last_name: lead.lastName,
          lead_email: lead.email,
          lead_phone: lead.phone,
          lead_position: lead.position,
          lead_revenue: lead.revenue,
          lead_company_size: lead.companySize,
          score: result.momentumScore,
          
          // These columns are now populated immediately for Zapier
          email_subject: crmData.email_config.subject,
          email_body: crmData.email_config.html_body,
          report_url: shortUrl,

          // Full data payload
          report_data: {
            result,
            quizResponses,
            crm: crmData, 
            meta: { source: 'web_app', version: '1.0' }
          }
        }
      ]);

    if (error) {
      console.error("Supabase Insert Error:", error);
      return null;
    }

    console.log("Saved to Supabase with ID:", id);
    return shortUrl;
  } catch (err) {
    console.error("Supabase Exception:", err);
    return null;
  }
};

/**
 * Retrieves a full audit report by its UUID.
 */
export const getAuditById = async (id: string) => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('brand_audits')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Transform back to App format
    return {
      brand: {
        name: data.brand_name,
        url: data.brand_url
      } as BrandInfo,
      result: data.report_data.result as AuditResult,
      lead: {
        firstName: data.lead_first_name,
        lastName: data.lead_last_name,
        position: data.lead_position,
        revenue: data.lead_revenue || "",
        companySize: data.lead_company_size || "",
        email: data.lead_email,
        phone: data.lead_phone,
        fullName: `${data.lead_first_name} ${data.lead_last_name}`
      } as LeadInfo
    };
  } catch (err) {
    console.error("Error fetching audit by ID:", err);
    return null;
  }
};