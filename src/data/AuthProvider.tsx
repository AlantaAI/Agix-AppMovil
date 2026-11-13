import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';
import { DEMO_USER_ID, resetDemo } from './demo';
import { clearUserData, readDemoMode, writeDemoMode } from './prefs';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  /** true si se entró con el proyecto de ejemplo, sin cuenta. */
  demo: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

/** Mensajes de Supabase Auth en un español que se entienda. */
export function authErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(message)) return 'Confirma tu correo antes de entrar: revisa tu bandeja de entrada.';
  if (/rate limit|too many/i.test(message)) return 'Demasiados intentos. Espera un minuto y vuelve a probar.';
  if (/network|fetch|timed? ?out/i.test(message)) return 'No hay conexión con el servidor. Revisa tu internet.';
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // La demostración y la falta de `.env` se conocen al arrancar; solo la sesión real espera a Supabase.
  const [demo, setDemo] = useState(readDemoMode);
  const [status, setStatus] = useState<AuthStatus>(() =>
    demo ? 'signedIn' : isSupabaseConfigured ? 'loading' : 'signedOut');
  const [userId, setUserId] = useState<string | null>(demo ? DEMO_USER_ID : null);
  const [email, setEmail] = useState<string | null>(demo ? 'demo@agix.app' : null);
  const live = !demo && isSupabaseConfigured;

  useEffect(() => {
    if (!live) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const user = data.session?.user ?? null;
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? null);
      setStatus(user ? 'signedIn' : 'signedOut');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? null);
      setStatus(user ? 'signedIn' : 'signedOut');
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [live]);

  const signIn = useCallback(async (mail: string, password: string) => {
    if (!isSupabaseConfigured) return 'La app no tiene configurado Supabase (.env).';
    const { error } = await supabase.auth.signInWithPassword({ email: mail.trim(), password });
    return error ? authErrorMessage(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    if (userId) clearUserData(userId);
    if (demo) {
      writeDemoMode(false);
      resetDemo();
      setDemo(false);
      setUserId(null);
      setEmail(null);
      setStatus('signedOut');
      return;
    }
    await supabase.auth.signOut();
  }, [demo, userId]);

  const enterDemo = useCallback(() => {
    writeDemoMode(true);
    setDemo(true);
    setUserId(DEMO_USER_ID);
    setEmail('demo@agix.app');
    setStatus('signedIn');
  }, []);

  const value = useMemo(
    () => ({ status, userId, email, demo, signIn, signOut, enterDemo }),
    [status, userId, email, demo, signIn, signOut, enterDemo],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
