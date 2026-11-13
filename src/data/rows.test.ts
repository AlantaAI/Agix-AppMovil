import { describe, expect, it } from 'vitest';
import { sessionInsertRow, toSession, toTask } from './rows';

describe('mapeos de filas', () => {
  it('una tarea sin columna cae en la primera del proyecto y los nulos van a cero', () => {
    const t = toTask({
      id: 't', project_id: 'p', status_id: null, nombre: 'Login', tiempo_estimado: null, tiempo_real: null,
      position: null, created_at: '2026-10-30T15:00:00.000Z',
    }, 'todo');
    expect(t).toMatchObject({ statusId: 'todo', estimateMinutes: 0, legacySeconds: 0, extraSeconds: 0, sprintId: null, storyId: null });
  });

  it('las sesiones van y vuelven sin perder datos', () => {
    const row = {
      id: 's', task_id: 't', nfr_id: null, user_id: 'u', started_at: '2026-10-30T15:00:00.000Z',
      ended_at: null, duration_seconds: 0, is_paused: false,
    };
    const s = toSession(row);
    expect(s.endedAt).toBeNull();
    expect(s.startedAt).toBe(Date.UTC(2026, 9, 30, 15));
    expect(sessionInsertRow(s)).toEqual(row);
  });
});
