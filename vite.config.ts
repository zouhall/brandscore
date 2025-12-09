import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Prioritize environment variables from the system (Vercel) over .env file
  const apiKey = env.API_KEY || process.env.API_KEY || '';
  const webhookUrl = env.REACT_APP_WEBHOOK_URL || process.env.REACT_APP_WEBHOOK_URL || '';
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const psiKey = env.VITE_PSI_API_KEY || process.env.VITE_PSI_API_KEY || '';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.REACT_APP_WEBHOOK_URL': JSON.stringify(webhookUrl),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      'process.env.VITE_PSI_API_KEY': JSON.stringify(psiKey),
    },
  };
});