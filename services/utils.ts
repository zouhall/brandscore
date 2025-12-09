import { AuditResult, BrandInfo } from "../types";

/**
 * Generates a sharable link by encoding the result in the URL.
 * Used by both CRM and Supabase services.
 */
export function generateMagicLink(brand: BrandInfo, result: AuditResult): string {
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
    
    // Ensure we use the window location if available (client-side)
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    
    return `${origin}${pathname}?r=${base64String}`;
  } catch (e) {
    console.warn("Failed to generate magic link", e);
    return "";
  }
}