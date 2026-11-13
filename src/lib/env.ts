/**
 * Configuración pública de la app (variables `EXPO_PUBLIC_*` del `.env`).
 * Solo van aquí la URL y la clave anónima de Supabase, que son públicas: las
 * claves privadas (AGIX_API_KEY, GROQ_API_KEY) viven en las Edge Functions.
 */

const PLACEHOLDER_URL = 'https://your-project-ref.supabase.co';
const PLACEHOLDER_KEY = 'your-anon-key-here';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://agixwebapp.web.app').replace(/\/$/, '');

export const isSupabaseConfigured =
  !!SUPABASE_URL && !!SUPABASE_ANON_KEY && SUPABASE_URL !== PLACEHOLDER_URL && SUPABASE_ANON_KEY !== PLACEHOLDER_KEY;
