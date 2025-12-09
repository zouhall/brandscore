import { createClient } from '@supabase/supabase-js';
import { AuditResult, BrandInfo, LeadInfo } from '../types';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Only initialize if keys are present
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const saveToSupabase = async (
  brand: BrandInfo,
  lead: LeadInfo,
  result: AuditResult,
  quizResponses: any[]
) => {
  if (!supabase) {
    console.warn("Supabase not configured. Skipping database save.");
    return false;
  }

  try {
    const { error } = await supabase
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
      ]);

    if (error) {
      console.error("Supabase Error:", error);
      return false;
    }

    console.log("Saved to Supabase successfully.");
    return true;
  } catch (err) {
    console.error("Supabase Exception:", err);
    return false;
  }
};