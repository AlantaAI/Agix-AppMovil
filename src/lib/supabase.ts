import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { kv } from './kv';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

/**
 * Cliente de Supabase con la sesión guardada en el dispositivo: la persona
 * entra una vez con las mismas credenciales de la web y sigue dentro.
 * Sin `.env` se crea un cliente inofensivo y la app ofrece el modo demostración.
 */
export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL : 'http://localhost:54321',
  isSupabaseConfigured ? SUPABASE_ANON_KEY : 'public-anon-key',
  {
    auth: {
      storage: kv,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// En el móvil, el token solo se refresca mientras la app está en primer plano.
if (Platform.OS !== 'web' && isSupabaseConfigured) {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
