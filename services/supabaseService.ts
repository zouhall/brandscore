import { createClient } from '@supabase/supabase-js';
import { AuditResult, BrandInfo, LeadInfo, UserResponse } from '../types';
import { prepareCrmData } from './crmService';

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
    // 1. Insert the record first to get the UUID
    const { data, error } = await supabase
      .from('brand_audits')
      .insert([
        {
          brand_name: brand.name,
          brand_url: brand.url,
          lead_first_name: lead.firstName,
          lead_last_name: lead.lastName,
          lead_email: lead.email,
          lead_phone: lead.phone,
          lead_position: lead.position,
          lead_revenue: lead.revenue,          // Mapped
          lead_company_size: lead.companySize, // Mapped
          score: result.momentumScore,
          // Initial report data, will be enriched in step 3
          report_data: {
            result,
            quizResponses,
            meta: { source: 'web_app', version: '1.0' }
          }
        }
      ])
      .select('id') // Request the ID back
      .single();

    if (error || !data) {
      console.error("Supabase Insert Error:", error);
      return null;
    }

    // 2. Construct the Short URL using the ID
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const shortUrl = `${origin}${pathname}?id=${data.id}`;

    // 3. Generate CRM Data (Email HTML, etc)
    const crmData = prepareCrmData(lead, brand, result, quizResponses, shortUrl);

    // 4. Update the record with URL and the enriched CRM data
    // We update 'report_data' to include the 'crm' field so Zapier can read it easily.
    const { error: updateError } = await supabase
      .from('brand_audits')
      .update({ 
        report_url: shortUrl,
        report_data: {
            result,
            quizResponses,
            crm: crmData, // <--- This is what Zapier will read
            meta: { source: 'web_app', version: '1.0' }
        }
      })
      .eq('id', data.id);

    if (updateError) {
      console.warn("Failed to update report_url/crm data:", updateError);
    }

    console.log("Saved to Supabase with ID:", data.id);
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
        revenue: data.lead_revenue || "",          // Retrieve
        companySize: data.lead_company_size || "", // Retrieve
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