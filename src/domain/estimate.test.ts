import { describe, expect, it } from 'vitest';
import { estimateSource, parseEstimateResponse, parseHoursInput, taskEstimateRow } from './estimate';

describe('parseEstimateResponse (contrato de estimate-task)', () => {
  it('lee la primera estimación con su banda', () => {
    const e = parseEstimateResponse({
      modelVersion: 'agix:estimador_v6',
      provisional: false,
      estimates: [{ title: 'x', titleEn: 'Send booking notifications', minutes: 180, bandLowMinutes: 120, bandHighMinutes: 300 }],
    });
    expect(e).toEqual({
      minutes: 180, bandLowMinutes: 120, bandHighMinutes: 300, modelVersion: 'agix:estimador_v6', provisional: false,
      titleEn: 'Send booking notifications',
    });
    expect(estimateSource(e!)).toBe('Modelo propio de Agix');
  });
  it('descarta una banda incoherente y marca el sustituto como provisional', () => {
    const e = parseEstimateResponse({ modelVersion: 'groq:llama', provisional: true, estimates: [{ minutes: 60, bandLowMinutes: 90, bandHighMinutes: 30 }] });
    expect(e?.bandLowMinutes).toBeNull();
    expect(estimateSource(e!)).toBe('IA provisional');
  });
  it('devuelve null si no hay cifra', () => {
    expect(parseEstimateResponse(null)).toBeNull();
    expect(parseEstimateResponse({ estimates: [] })).toBeNull();
    expect(parseEstimateResponse({ estimates: [{ minutes: 0 }] })).toBeNull();
  });
});

describe('taskEstimateRow', () => {
  it('guarda horas y lo que escribió la persona solo si difiere', () => {
    const e = { minutes: 90, bandLowMinutes: 60, bandHighMinutes: 120, modelVersion: 'agix:estimador_v6', provisional: false, titleEn: null };
    expect(taskEstimateRow('t', e, 90)).toMatchObject({ task_id: 't', hours_median: 1.5, band_low: 1, band_high: 2, user_estimate_min: null, origin: 'MODEL_COLD' });
    expect(taskEstimateRow('t', e, 120).user_estimate_min).toBe(120);
  });
});

describe('parseHoursInput', () => {
  it.each([
    ['2', 120], ['1.5', 90], ['1,5', 90], ['1h 30m', 90], ['2h', 120], ['45m', 45], ['45 min', 45], ['1:15', 75],
  ])('«%s» son %i minutos', (raw, minutes) => {
    expect(parseHoursInput(raw)).toBe(minutes);
  });
  it.each(['', 'abc', '0', '-2', 'h'])('«%s» no es válido', raw => {
    expect(parseHoursInput(raw)).toBeNull();
  });
});
