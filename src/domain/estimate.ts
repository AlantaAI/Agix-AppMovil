import type { Estimate } from '@/data/types';

const posInt = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null;

/**
 * Lee la respuesta de la Edge Function `estimate-task` (mismo contrato que usa
 * la web). Devuelve null si no trae una cifra utilizable.
 */
export function parseEstimateResponse(data: unknown): Estimate | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const list = Array.isArray(o.estimates) ? o.estimates : [];
  const first = list[0];
  if (!first || typeof first !== 'object') return null;
  const e = first as Record<string, unknown>;
  const minutes = posInt(e.minutes);
  if (minutes === null) return null;
  const low = posInt(e.bandLowMinutes);
  const high = posInt(e.bandHighMinutes);
  const bandOk = low !== null && high !== null && low <= minutes && minutes <= high;
  return {
    minutes,
    bandLowMinutes: bandOk ? low : null,
    bandHighMinutes: bandOk ? high : null,
    modelVersion: typeof o.modelVersion === 'string' ? o.modelVersion : null,
    provisional: o.provisional === true,
    titleEn: typeof e.titleEn === 'string' && e.titleEn.trim() ? e.titleEn.trim() : null,
  };
}

/** «Modelo propio de Agix» o «IA provisional», según quién respondió (la demostración lo dice tal cual). */
export function estimateSource(e: Pick<Estimate, 'modelVersion' | 'provisional'>): string {
  if (e.modelVersion?.startsWith('agix:') && !e.provisional) return 'Modelo propio de Agix';
  if (e.modelVersion === 'demo') return 'Estimación de ejemplo (modo demostración)';
  return 'IA provisional';
}

/** Fila para `task_estimates`, igual que la que guarda la web. */
export function taskEstimateRow(taskId: string, e: Estimate, userMinutes: number) {
  const hours = (m: number | null) => (m === null ? null : Math.round((m / 60) * 1000) / 1000);
  return {
    task_id: taskId,
    model_version: e.modelVersion,
    hours_median: hours(e.minutes),
    probable_value: hours(e.minutes),
    band_low: hours(e.bandLowMinutes),
    band_high: hours(e.bandHighMinutes),
    user_estimate_min: userMinutes > 0 && userMinutes !== e.minutes ? userMinutes : null,
    origin: 'MODEL_COLD',
  };
}

/** Lee «2», «2.5», «2,5», «2h 30m», «90m» o «1:30» como minutos. null si no se entiende. */
export function parseHoursInput(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(',', '.');
  if (!text) return null;
  const clock = /^(\d+):([0-5]?\d)$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const parts = /^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/.exec(text);
  if (parts && (parts[1] || parts[2])) {
    const total = Math.round(Number(parts[1] ?? 0) * 60 + Number(parts[2] ?? 0));
    return total > 0 ? total : null;
  }
  const n = Number(text);
  if (Number.isFinite(n) && n > 0) return Math.round(n * 60);
  return null;
}
