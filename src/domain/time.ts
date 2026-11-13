import type { Session, Task } from '@/data/types';

/** Segundos de una sesión: en vivo si sigue abierta, fijos si ya se cerró. */
export function sessionSeconds(s: Session, now: number): number {
  if (s.endedAt === null) return Math.max(0, Math.floor((now - s.startedAt) / 1000));
  return Math.max(0, s.durationSeconds);
}

/** Segundos de todas las sesiones de una tarea (incluye las de sus RNF), como la web. */
export function taskSessionSeconds(sessions: Session[], taskId: string, now: number): number {
  let total = 0;
  for (const s of sessions) if (s.taskId === taskId) total += sessionSeconds(s, now);
  return total;
}

/** Segundos de un RNF concreto. */
export function nfrSeconds(sessions: Session[], nfrId: string, now: number): number {
  let total = 0;
  for (const s of sessions) if (s.nfrId === nfrId) total += sessionSeconds(s, now);
  return total;
}

/**
 * Tiempo real de una tarea, con la misma regla que la web: el mayor entre las
 * sesiones y el `tiempo_real` guardado (que puede ir por detrás o por delante
 * si las sesiones no se cargaron), más el ajuste manual con signo.
 */
export function taskRealSeconds(task: Task, sessions: Session[], now: number): number {
  const timer = Math.max(0, taskSessionSeconds(sessions, task.id, now), Math.floor(task.legacySeconds || 0));
  return Math.max(0, timer + Math.floor(task.extraSeconds || 0));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** «01:42:17». */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** «1h 40m», «45m», «2h», «0m». Redondea hacia abajo al minuto. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.max(0, Math.floor(totalSeconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Igual que `formatDuration`, pero a partir de minutos (estimaciones). */
export function formatMinutes(minutes: number): string {
  return formatDuration(Math.round(minutes) * 60);
}

/** Porcentaje del estimado consumido, sin tope (puede pasar de 100). null si no hay estimado. */
export function usedPercent(realSeconds: number, estimateMinutes: number): number | null {
  if (!estimateMinutes || estimateMinutes <= 0) return null;
  return Math.round((realSeconds / (estimateMinutes * 60)) * 100);
}

/** La web marca una tarea como retrasada cuando el real supera el estimado en un 20 %. */
export const OVER_ESTIMATE_THRESHOLD = 1.2;

export function isOverEstimate(realSeconds: number, estimateMinutes: number, threshold = OVER_ESTIMATE_THRESHOLD): boolean {
  if (!estimateMinutes || estimateMinutes <= 0) return false;
  return realSeconds > estimateMinutes * 60 * threshold;
}

/** «ahora», «hace 5 min», «hace 2 h», «ayer», «hace 3 días», o la fecha corta. */
export function relativeTime(at: number, now: number): string {
  const diff = Math.max(0, now - at);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  const date = new Date(at);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

/** Medianoche local del día de `now`. */
export function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Segundos que una persona registró desde `since` (solo la parte de cada
 * sesión que cae después de ese instante).
 */
export function userSecondsSince(sessions: Session[], userId: string, since: number, now: number): number {
  let total = 0;
  for (const s of sessions) {
    if (s.userId !== userId) continue;
    const end = s.endedAt ?? now;
    const start = Math.max(s.startedAt, since);
    if (end > start) total += Math.floor((end - start) / 1000);
  }
  return total;
}
