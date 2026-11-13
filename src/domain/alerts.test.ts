import { describe, expect, it } from 'vitest';
import { buildDemoSnapshot, DEMO_USER_ID } from '@/data/demoData';
import { buildAlerts, isUnread, unreadCount } from './alerts';

const NOW = Date.UTC(2026, 9, 30, 18, 0, 0);

describe('buildAlerts', () => {
  const snap = buildDemoSnapshot(NOW);
  const alerts = buildAlerts(snap, NOW);

  it('avisa de las tareas que me asignaron y siguen abiertas', () => {
    const assigned = alerts.filter(a => a.kind === 'assigned').map(a => a.taskId);
    expect(assigned).toEqual(expect.arrayContaining(['t-notif', 't-cancel', 't-invoice']));
    expect(assigned).not.toContain('t-google');
  });

  it('avisa de las lecciones de otras personas en mis proyectos', () => {
    expect(alerts.some(a => a.kind === 'lesson' && a.taskId === 't-google')).toBe(true);
  });

  it('avisa de un cronómetro olvidado y de una tarea pasada de su estimación', () => {
    const forgotten = {
      ...snap,
      sessions: snap.sessions.map(s => (s.endedAt === null ? { ...s, startedAt: NOW - 5 * 3600_000 } : s)),
    };
    const kinds = buildAlerts(forgotten, NOW).map(a => a.kind);
    expect(kinds).toContain('timer');
    expect(kinds).toContain('over');
  });

  it('no avisa de tareas ya terminadas ni de asignaciones antiguas', () => {
    const old = { ...snap, assignments: snap.assignments.map(a => ({ ...a, assignedAt: NOW - 30 * 86_400_000 })) };
    expect(buildAlerts(old, NOW).some(a => a.kind === 'assigned')).toBe(false);
  });

  it('ordena del más reciente al más antiguo y cuenta los no leídos', () => {
    for (let i = 1; i < alerts.length; i++) expect(alerts[i - 1].at).toBeGreaterThanOrEqual(alerts[i].at);
    expect(unreadCount(alerts, 0)).toBe(alerts.length);
    expect(unreadCount(alerts, NOW)).toBe(0);
    expect(isUnread(alerts[0], alerts[0].at - 1)).toBe(true);
    expect(snap.userId).toBe(DEMO_USER_ID);
  });
});
