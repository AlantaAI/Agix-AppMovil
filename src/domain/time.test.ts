import { describe, expect, it } from 'vitest';
import type { Session, Task } from '@/data/types';
import {
  formatClock, formatDuration, formatMinutes, isOverEstimate, relativeTime, sessionSeconds, taskRealSeconds,
  taskSessionSeconds, usedPercent, userSecondsSince,
} from './time';

const T0 = Date.UTC(2026, 9, 30, 15, 0, 0);
const session = (over: Partial<Session>): Session => ({
  id: 's', taskId: 't1', nfrId: null, userId: 'u1', startedAt: T0, endedAt: T0 + 600_000, durationSeconds: 600, isPaused: true, ...over,
});
const task = (over: Partial<Task> = {}): Task => ({
  id: 't1', projectId: 'p', statusId: 'st', name: 'Tarea', estimateMinutes: 60, legacySeconds: 0, extraSeconds: 0,
  position: 1024, sprintId: null, storyId: null, createdAt: T0, ...over,
});

describe('sessionSeconds', () => {
  it('usa la duración guardada si la sesión está cerrada', () => {
    expect(sessionSeconds(session({}), T0 + 99_999_999)).toBe(600);
  });
  it('cuenta en vivo desde started_at si sigue abierta', () => {
    expect(sessionSeconds(session({ endedAt: null, durationSeconds: 0 }), T0 + 90_500)).toBe(90);
  });
});

describe('taskRealSeconds', () => {
  it('suma las sesiones de la tarea, incluidas las de sus RNF', () => {
    const sessions = [session({ id: 'a' }), session({ id: 'b', nfrId: 'n1', durationSeconds: 300 }), session({ id: 'c', taskId: 'otra' })];
    expect(taskSessionSeconds(sessions, 't1', T0)).toBe(900);
    expect(taskRealSeconds(task(), sessions, T0)).toBe(900);
  });
  it('toma el tiempo_real legado si es mayor que las sesiones (como la web)', () => {
    expect(taskRealSeconds(task({ legacySeconds: 5000 }), [session({})], T0)).toBe(5000);
  });
  it('aplica el ajuste manual con signo y nunca baja de cero', () => {
    expect(taskRealSeconds(task({ extraSeconds: 120 }), [session({})], T0)).toBe(720);
    expect(taskRealSeconds(task({ extraSeconds: -9999 }), [session({})], T0)).toBe(0);
  });
});

describe('formatos', () => {
  it('formatClock rellena con ceros', () => {
    expect(formatClock(6137)).toBe('01:42:17');
    expect(formatClock(-5)).toBe('00:00:00');
  });
  it('formatDuration y formatMinutes', () => {
    expect(formatDuration(6000)).toBe('1h 40m');
    expect(formatDuration(2700)).toBe('45m');
    expect(formatDuration(7200)).toBe('2h');
    expect(formatMinutes(90)).toBe('1h 30m');
  });
  it('relativeTime en español', () => {
    expect(relativeTime(T0, T0 + 20_000)).toBe('ahora');
    expect(relativeTime(T0, T0 + 5 * 60_000)).toBe('hace 5 min');
    expect(relativeTime(T0, T0 + 2 * 3600_000)).toBe('hace 2 h');
    expect(relativeTime(T0, T0 + 30 * 3600_000)).toBe('ayer');
    expect(relativeTime(T0, T0 + 3 * 86_400_000)).toBe('hace 3 días');
  });
});

describe('estimado frente a real', () => {
  it('porcentaje usado sin tope', () => {
    expect(usedPercent(5400, 60)).toBe(150);
    expect(usedPercent(100, 0)).toBeNull();
  });
  it('retraso con el umbral del 20 % de la web', () => {
    expect(isOverEstimate(60 * 60 * 1.2, 60)).toBe(false);
    expect(isOverEstimate(60 * 60 * 1.21, 60)).toBe(true);
    expect(isOverEstimate(3601, 60, 1)).toBe(true);
    expect(isOverEstimate(99999, 0)).toBe(false);
  });
});

describe('userSecondsSince', () => {
  it('cuenta solo la parte de cada sesión posterior al corte, y la abierta hasta ahora', () => {
    const sessions = [
      session({ id: 'a', startedAt: T0 - 600_000, endedAt: T0 + 600_000 }),
      session({ id: 'b', startedAt: T0 + 1_000_000, endedAt: null }),
      session({ id: 'c', userId: 'otro' }),
    ];
    expect(userSecondsSince(sessions, 'u1', T0, T0 + 1_060_000)).toBe(600 + 60);
  });
});
