import { createClient } from '@supabase/supabase-js';
import { AuditResult, BrandInfo, LeadInfo } from '../types';

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
  quizResponses: any[]
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
          score: result.momentumScore,
          report_data: {
            result,
            quizResponses,
            meta: {
              source: 'web_app',
              version: '1.0'
            }
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

    // 3. Update the record with the generated URL (as requested for separate column)
    const { error: updateError } = await supabase
      .from('brand_audits')
      .update({ report_url: shortUrl })
      .eq('id', data.id);

    if (updateError) {
      console.warn("Failed to update report_url column:", updateError);
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