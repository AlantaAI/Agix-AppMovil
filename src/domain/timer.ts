import type { Session } from '@/data/types';

/**
 * Reglas del cronómetro, idénticas a las de la web (tabla `time_sessions`):
 *  - Iniciar abre una sesión nueva y cierra antes la que estuviera abierta.
 *  - Pausar y finalizar cierran la sesión abierta fijando su duración.
 *  - Solo hay una sesión abierta por persona, en cualquier dispositivo; si por
 *    un fallo quedaran varias, se cierran todas.
 */

export interface ClosedSession {
  id: string;
  taskId: string;
  endedAt: number;
  durationSeconds: number;
  isPaused: boolean;
}

/** Cierra una sesión en `at`. La web marca `is_paused` tanto al pausar como al finalizar. */
export function closeSession(s: Session, at: number): ClosedSession {
  return {
    id: s.id,
    taskId: s.taskId,
    endedAt: at,
    durationSeconds: Math.max(0, Math.floor((at - s.startedAt) / 1000)),
    isPaused: true,
  };
}

const openOf = (sessions: Session[], userId: string) => sessions.filter(s => s.userId === userId && s.endedAt === null);

/** Cierres necesarios para detener el cronómetro de la persona. */
export function planStop(sessions: Session[], userId: string, at: number): ClosedSession[] {
  return openOf(sessions, userId).map(s => closeSession(s, at));
}

export interface StartPlan {
  close: ClosedSession[];
  open: Session;
}

export function planStart(
  sessions: Session[], userId: string, taskId: string, nfrId: string | null, at: number, newId: string,
): StartPlan {
  return {
    close: planStop(sessions, userId, at),
    open: { id: newId, taskId, nfrId, userId, startedAt: at, endedAt: null, durationSeconds: 0, isPaused: false },
  };
}

/** Aplica cierres y una apertura a la lista local (actualización optimista). */
export function applyToSessions(sessions: Session[], close: ClosedSession[], open: Session | null): Session[] {
  const byId = new Map(close.map(c => [c.id, c]));
  const next = sessions.map(s => {
    const c = byId.get(s.id);
    return c ? { ...s, endedAt: c.endedAt, durationSeconds: c.durationSeconds, isPaused: c.isPaused } : s;
  });
  if (open) next.push(open);
  return next;
}

/**
 * Junta las sesiones abiertas que hay en el servidor (quizá iniciadas desde la
 * web) con las locales. `stale` indica que alguna sesión que la app creía
 * abierta ya se cerró en otro dispositivo: entonces conviene recargar todo,
 * porque su duración real solo la sabe el servidor.
 */
export function reconcileOpenSessions(
  local: Session[], serverOpen: Session[], userId: string,
): { sessions: Session[]; stale: boolean } {
  const serverIds = new Set(serverOpen.map(s => s.id));
  const stale = openOf(local, userId).some(s => !serverIds.has(s.id));
  const localIds = new Set(local.map(s => s.id));
  const sessions = local.map(s => serverOpen.find(o => o.id === s.id) ?? s);
  for (const s of serverOpen) if (!localIds.has(s.id)) sessions.push(s);
  return { sessions, stale };
}

/** Una sesión abierta hace muchas horas suele ser un cronómetro olvidado. */
export const FORGOTTEN_TIMER_SECONDS = 4 * 3600;
