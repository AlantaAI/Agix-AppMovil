/**
 * Almacén clave-valor síncrono y persistente. En el móvil usa el `localStorage`
 * de expo-sqlite (la opción que recomienda Expo para la sesión de Supabase);
 * en la web, el del navegador (ver `kv.web.ts`).
 */
import 'expo-sqlite/localStorage/install';

export const kv: Storage = globalThis.localStorage;
