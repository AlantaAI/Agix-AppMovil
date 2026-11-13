import { describe, expect, it } from 'vitest';
import type { Session } from '@/data/types';
import { applyToSessions, closeSession, planStart, planStop, reconcileOpenSessions } from './timer';

const open = (id: string, taskId: string, startedAt: number, userId = 'u'): Session => ({
  id, taskId, nfrId: null, userId, startedAt, endedAt: null, durationSeconds: 0, isPaused: false,
});

describe('cronómetro compartido con la web', () => {
  it('cerrar fija la duración desde started_at y marca is_paused como la web', () => {
    expect(closeSession(open('s', 't', 1_000), 61_900)).toEqual({ id: 's', taskId: 't', endedAt: 61_900, durationSeconds: 60, isPaused: true });
  });

  it('iniciar cierra la sesión abierta de la persona y abre una nueva', () => {
    const sessions = [open('s1', 't1', 0), open('x', 't9', 0, 'otro')];
    const plan = planStart(sessions, 'u', 't2', null, 120_000, 'nuevo');
    expect(plan.close.map(c => c.id)).toEqual(['s1']);
    expect(plan.open).toMatchObject({ id: 'nuevo', taskId: 't2', userId: 'u', startedAt: 120_000, endedAt: null });
    const next = applyToSessions(sessions, plan.close, plan.open);
    expect(next.filter(s => s.userId === 'u' && s.endedAt === null).map(s => s.id)).toEqual(['nuevo']);
    expect(next.find(s => s.id === 'x')?.endedAt).toBeNull();
  });

  it('si por un fallo quedaron varias abiertas, pausar las cierra todas', () => {
    expect(planStop([open('a', 't', 0), open('b', 't', 10)], 'u', 100_000)).toHaveLength(2);
    expect(planStop([], 'u', 1)).toEqual([]);
  });

  it('adopta la sesión iniciada desde la web', () => {
    const fromWeb = open('web', 't3', 50);
    const { sessions, stale } = reconcileOpenSessions([], [fromWeb], 'u');
    expect(stale).toBe(false);
    expect(sessions).toEqual([fromWeb]);
  });

  it('detecta que otra pantalla ya cerró la sesión que creíamos abierta', () => {
    const { stale } = reconcileOpenSessions([open('vieja', 't', 0)], [], 'u');
    expect(stale).toBe(true);
  });
});
