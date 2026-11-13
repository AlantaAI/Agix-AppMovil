import { describe, expect, it } from 'vitest';
import type { Project, Session, Status, Task } from '@/data/types';
import {
  activeSessionOf, checkMove, currentSprint, doneStatusId, filterBySprint, groupProjects, nextPosition,
  projectProgress, tasksInStatus,
} from './board';

const statuses: Status[] = [
  { id: 'done', projectId: 'p', name: 'Terminado', color: '#0f0', order: 2 },
  { id: 'todo', projectId: 'p', name: 'Por hacer', color: '#999', order: 0 },
  { id: 'doing', projectId: 'p', name: 'En proceso', color: '#ff0', order: 1 },
];
const task = (id: string, statusId: string, position: number | null, over: Partial<Task> = {}): Task => ({
  id, projectId: 'p', statusId, name: id, estimateMinutes: 60, legacySeconds: 0, extraSeconds: 0, position,
  sprintId: null, storyId: null, createdAt: 0, ...over,
});

describe('columnas', () => {
  it('«Terminado» es la última por orden, aunque llegue desordenada', () => {
    expect(doneStatusId(statuses)).toBe('done');
    expect(doneStatusId([])).toBeNull();
  });
  it('ordena por posición y deja al final las antiguas sin posición', () => {
    const tasks = [task('c', 'todo', null), task('b', 'todo', 2048), task('a', 'todo', 1024), task('x', 'doing', 1)];
    expect(tasksInStatus(tasks, 'todo').map(t => t.id)).toEqual(['a', 'b', 'c']);
  });
  it('nueva posición = máximo de la columna + 1024 (1024 si está vacía), sin contar la tarea que se mueve', () => {
    const tasks = [task('a', 'todo', 1024), task('b', 'todo', 5000), task('c', 'doing', 9000)];
    expect(nextPosition(tasks, 'todo')).toBe(6024);
    expect(nextPosition(tasks, 'done')).toBe(1024);
    expect(nextPosition(tasks, 'todo', 'b')).toBe(2048);
  });
  it('avance del proyecto', () => {
    const tasks = [task('a', 'done', 1), task('b', 'todo', 1), task('c', 'done', 2)];
    expect(projectProgress(tasks, statuses)).toEqual({ done: 2, total: 3, percent: 67 });
    expect(projectProgress([], statuses)).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe('groupProjects', () => {
  it('primero los personales y luego uno por equipo con su nombre', () => {
    const projects: Project[] = [
      { id: '1', name: 'Equipo A', teamId: 't1', ownerId: 'u', createdAt: 0 },
      { id: '2', name: 'Mío', teamId: null, ownerId: 'u', createdAt: 0 },
    ];
    const sections = groupProjects(projects, [{ id: 't1', name: 'Equipo Alfa' }]);
    expect(sections.map(s => [s.title, s.isTeam, s.projects.length])).toEqual([['Personales', false, 1], ['Equipo Alfa', true, 1]]);
  });
});

describe('sprints', () => {
  const tasks = [
    task('a', 'done', 1, { sprintId: 's1' }),
    task('b', 'todo', 1, { sprintId: 's2' }),
    task('c', 'todo', 2),
  ];
  const snap = {
    statuses,
    tasks,
    sprints: [
      { id: 's2', projectId: 'p', name: 'Sprint 2', order: 1 },
      { id: 's1', projectId: 'p', name: 'Sprint 1', order: 0 },
    ],
  };
  it('el sprint en curso es el primero con tareas sin terminar', () => {
    expect(currentSprint(snap, 'p')).toBe('s2');
    expect(currentSprint({ ...snap, sprints: [] }, 'p')).toBe('all');
  });
  it('filtra por sprint o por «sin sprint»', () => {
    expect(filterBySprint(tasks, 'all')).toHaveLength(3);
    expect(filterBySprint(tasks, 'none').map(t => t.id)).toEqual(['c']);
    expect(filterBySprint(tasks, 's1').map(t => t.id)).toEqual(['a']);
  });
});

describe('checkMove (conflictos, HU-44)', () => {
  it('permite mover si la columna en el servidor es la esperada', () => {
    expect(checkMove('todo', 'todo')).toEqual({ ok: true });
  });
  it('avisa si otra persona ya la movió', () => {
    expect(checkMove('todo', 'doing')).toEqual({ ok: false, reason: 'moved', serverStatusId: 'doing' });
  });
  it('avisa si la tarea ya no existe', () => {
    expect(checkMove('todo', undefined)).toEqual({ ok: false, reason: 'gone' });
  });
});

describe('activeSessionOf', () => {
  it('devuelve la sesión abierta más reciente de la persona', () => {
    const s = (id: string, userId: string, startedAt: number, endedAt: number | null): Session => ({
      id, taskId: 't', nfrId: null, userId, startedAt, endedAt, durationSeconds: 0, isPaused: false,
    });
    const sessions = [s('a', 'u', 1, null), s('b', 'u', 5, null), s('c', 'u', 9, 10), s('d', 'otro', 20, null)];
    expect(activeSessionOf(sessions, 'u')?.id).toBe('b');
    expect(activeSessionOf(sessions, 'nadie')).toBeNull();
  });
});
