/**
 * Lo que la app recuerda en el dispositivo: la última copia de los datos (para
 * abrir al instante y funcionar sin conexión, HU-43) y preferencias pequeñas.
 * Todo por persona, para que dos cuentas en el mismo teléfono no se mezclen.
 */
import { kv } from '@/lib/kv';
import type { Snapshot } from './types';

const safeGet = (key: string): string | null => {
  try {
    return kv.getItem(key);
  } catch {
    return null;
  }
};
const safeSet = (key: string, value: string): void => {
  try {
    kv.setItem(key, value);
  } catch {
    // Sin espacio o almacén no disponible: la app sigue sin caché.
  }
};

export function readCachedSnapshot(userId: string): Snapshot | null {
  const raw = safeGet(`agix.cache.${userId}`);
  if (!raw) return null;
  try {
    const snap = JSON.parse(raw) as Snapshot;
    return snap.userId === userId ? snap : null;
  } catch {
    return null;
  }
}

export function writeCachedSnapshot(snap: Snapshot): void {
  safeSet(`agix.cache.${snap.userId}`, JSON.stringify(snap));
}

export function readActiveProject(userId: string): string | null {
  return safeGet(`agix.activeProject.${userId}`);
}

export function writeActiveProject(userId: string, projectId: string): void {
  safeSet(`agix.activeProject.${userId}`, projectId);
}

export function readAlertsSeenAt(userId: string): number {
  return Number(safeGet(`agix.alertsSeen.${userId}`) ?? 0) || 0;
}

export function writeAlertsSeenAt(userId: string, at: number): void {
  safeSet(`agix.alertsSeen.${userId}`, String(at));
}

/** Al cerrar sesión se borra lo guardado de esa cuenta: el teléfono puede ser compartido. */
export function clearUserData(userId: string): void {
  for (const key of [`agix.cache.${userId}`, `agix.activeProject.${userId}`, `agix.alertsSeen.${userId}`]) {
    try {
      kv.removeItem(key);
    } catch {
      // Sin almacén no hay nada que borrar.
    }
  }
}

export function readDemoMode(): boolean {
  return safeGet('agix.demo') === '1';
}

export function writeDemoMode(on: boolean): void {
  try {
    if (on) kv.setItem('agix.demo', '1');
    else kv.removeItem('agix.demo');
  } catch {
    // Ignorado: sin almacén, la demostración dura lo que la sesión.
  }
}
