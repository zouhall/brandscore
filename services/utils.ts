import { AuditResult, BrandInfo } from "../types";

/**
 * Generates a random UUID v4.
 * Used to create the ID client-side so we can generate the URL before saving to DB.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers or non-secure contexts
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (
      +c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16)
  );
}

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