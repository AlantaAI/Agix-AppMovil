import type { Assignment, Project, Session, Snapshot, Sprint, Status, Task, Team } from '@/data/types';

/** Separación entre posiciones al mandar una tarea al final de una columna (igual que la web). */
export const POSITION_STEP = 1024;

export function projectStatuses(statuses: Status[], projectId: string): Status[] {
  return statuses.filter(s => s.projectId === projectId).sort((a, b) => a.order - b.order);
}

export function projectSprints(sprints: Sprint[], projectId: string): Sprint[] {
  return sprints.filter(s => s.projectId === projectId).sort((a, b) => a.order - b.order);
}

/** La columna «Terminado» es la última del proyecto. */
export function doneStatusId(statuses: Status[]): string | null {
  if (statuses.length === 0) return null;
  return statuses.reduce((last, s) => (s.order > last.order ? s : last)).id;
}

/** Orden dentro de la columna: por posición; las antiguas sin posición, al final. */
export function byPosition(a: Task, b: Task): number {
  const pa = a.position ?? Number.POSITIVE_INFINITY;
  const pb = b.position ?? Number.POSITIVE_INFINITY;
  if (pa !== pb) return pa < pb ? -1 : 1;
  return a.createdAt - b.createdAt;
}

export function tasksInStatus(tasks: Task[], statusId: string): Task[] {
  return tasks.filter(t => t.statusId === statusId).sort(byPosition);
}

/** Posición para dejar una tarea al final de una columna: máximo + 1024 (1024 si está vacía). */
export function nextPosition(tasks: Task[], statusId: string, exceptTaskId?: string): number {
  let max: number | null = null;
  for (const t of tasks) {
    if (t.statusId !== statusId || t.id === exceptTaskId) continue;
    const p = t.position ?? 0;
    max = max === null ? p : Math.max(max, p);
  }
  return max === null ? POSITION_STEP : max + POSITION_STEP;
}

export interface Progress {
  done: number;
  total: number;
  /** 0–100, redondeado. */
  percent: number;
}

export function projectProgress(tasks: Task[], statuses: Status[]): Progress {
  const doneId = doneStatusId(statuses);
  const total = tasks.length;
  const done = doneId ? tasks.filter(t => t.statusId === doneId).length : 0;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export interface ProjectSection {
  key: string;
  title: string;
  isTeam: boolean;
  projects: Project[];
}

/** Proyectos agrupados como en la web: primero los personales y luego uno por equipo. */
export function groupProjects(projects: Project[], teams: Team[]): ProjectSection[] {
  const personal = projects.filter(p => !p.teamId);
  const sections: ProjectSection[] = [];
  if (personal.length) sections.push({ key: 'personal', title: 'Personales', isTeam: false, projects: personal });
  const teamName = new Map(teams.map(t => [t.id, t.name]));
  const byTeam = new Map<string, Project[]>();
  for (const p of projects) {
    if (!p.teamId) continue;
    const list = byTeam.get(p.teamId) ?? [];
    list.push(p);
    byTeam.set(p.teamId, list);
  }
  for (const [teamId, list] of byTeam) {
    sections.push({ key: teamId, title: teamName.get(teamId) ?? 'Equipo', isTeam: true, projects: list });
  }
  return sections;
}

/** La sesión abierta de la persona (como mucho una; si hubiera varias, la más reciente). */
export function activeSessionOf(sessions: Session[], userId: string): Session | null {
  let found: Session | null = null;
  for (const s of sessions) {
    if (s.userId !== userId || s.endedAt !== null) continue;
    if (!found || s.startedAt > found.startedAt) found = s;
  }
  return found;
}

/** Tareas con algún cronómetro en marcha (de cualquier miembro visible). */
export function runningTaskIds(sessions: Session[]): Set<string> {
  return new Set(sessions.filter(s => s.endedAt === null).map(s => s.taskId));
}

export function assigneesOf(assignments: Assignment[], taskId: string): string[] {
  return assignments.filter(a => a.taskId === taskId).map(a => a.userId);
}

/** Filtro de sprint del tablero: todos, uno concreto o las tareas sin sprint. */
export type SprintFilter = 'all' | 'none' | string;

export function filterBySprint(tasks: Task[], filter: SprintFilter): Task[] {
  if (filter === 'all') return tasks;
  if (filter === 'none') return tasks.filter(t => !t.sprintId);
  return tasks.filter(t => t.sprintId === filter);
}

/**
 * Sprint que conviene mostrar al abrir el tablero: el primero que aún tiene
 * tareas sin terminar. Si no hay sprints o todos están cerrados, «Todos».
 */
export function currentSprint(snapshot: Pick<Snapshot, 'sprints' | 'tasks' | 'statuses'>, projectId: string): SprintFilter {
  const sprints = projectSprints(snapshot.sprints, projectId);
  const doneId = doneStatusId(projectStatuses(snapshot.statuses, projectId));
  for (const sp of sprints) {
    if (snapshot.tasks.some(t => t.sprintId === sp.id && t.statusId !== doneId)) return sp.id;
  }
  return 'all';
}

export type MoveCheck =
  | { ok: true }
  | { ok: false; reason: 'gone' }
  | { ok: false; reason: 'moved'; serverStatusId: string };

/**
 * Antes de mover, se relee la tarea en el servidor: si alguien la cambió de
 * columna desde que se cargó, no se pisa ese cambio (HU-44).
 */
export function checkMove(expectedStatusId: string, serverStatusId: string | null | undefined): MoveCheck {
  if (serverStatusId === undefined) return { ok: false, reason: 'gone' };
  if (serverStatusId !== null && serverStatusId !== expectedStatusId) {
    return { ok: false, reason: 'moved', serverStatusId };
  }
  return { ok: true };
}
