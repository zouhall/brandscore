declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_KEY: string;
    readonly REACT_APP_WEBHOOK_URL: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_PSI_API_KEY: string; // New: PageSpeed Insights Key
    readonly [key: string]: string | undefined;
  }
}