/**
 * Modelo de la app móvil. Es una vista de las mismas tablas que usa la web
 * (projects, statuses, tasks, time_sessions…): los nombres cambian a inglés
 * solo dentro de la app; los mapeos fila ↔ tipo están en `rows.ts`.
 * Los instantes van en milisegundos desde epoch para operar sin parsear fechas.
 */

export interface Project {
  id: string;
  name: string;
  teamId: string | null;
  ownerId: string;
  createdAt: number;
}

export interface Team {
  id: string;
  name: string;
}

/** Columna del tablero. La última (mayor `order`) es «Terminado». */
export interface Status {
  id: string;
  projectId: string;
  name: string;
  color: string;
  order: number;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  order: number;
}

export interface Story {
  id: string;
  projectId: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  criteria: string[];
  order: number;
}

export interface Task {
  id: string;
  projectId: string;
  statusId: string;
  name: string;
  /** `tiempo_estimado`, en minutos. */
  estimateMinutes: number;
  /** `tiempo_real` (puente legado de la web), en segundos. */
  legacySeconds: number;
  /** `extra_time_seconds`: ajuste manual con signo. */
  extraSeconds: number;
  position: number | null;
  sprintId: string | null;
  storyId: string | null;
  createdAt: number;
}

export interface Assignment {
  taskId: string;
  userId: string;
  assignedAt: number;
}

/** Sesión de cronómetro. La activa es la que no tiene `endedAt`. */
export interface Session {
  id: string;
  taskId: string;
  nfrId: string | null;
  userId: string;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number;
  isPaused: boolean;
}

export type NfrType =
  | 'performance' | 'security' | 'usability' | 'reliability' | 'maintainability' | 'scalability';

export interface Nfr {
  id: string;
  taskId: string;
  type: NfrType;
  description: string;
  estimatedMinutes: number | null;
  status: string;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  nickname: string;
  phone: string;
  avatarUrl: string;
}

export interface Lesson {
  id: string;
  taskId: string;
  authorId: string;
  problem: string;
  createdAt: number;
}

export interface IssueLog {
  id: string;
  taskId: string;
  problem: string;
  diagnosis: string;
  solution: string;
  at: number;
}

/** Todo lo que la app necesita para pintar sus pantallas, de una sola carga. */
export interface Snapshot {
  userId: string;
  projects: Project[];
  teams: Team[];
  statuses: Status[];
  sprints: Sprint[];
  stories: Story[];
  tasks: Task[];
  assignments: Assignment[];
  sessions: Session[];
  nfrs: Nfr[];
  people: Record<string, Person>;
  lessons: Lesson[];
  fetchedAt: number;
}

/** Estimación sugerida por la IA (Edge Function `estimate-task`). */
export interface Estimate {
  minutes: number;
  bandLowMinutes: number | null;
  bandHighMinutes: number | null;
  modelVersion: string | null;
  provisional: boolean;
  titleEn: string | null;
}

export interface NewTaskInput {
  projectId: string;
  name: string;
  estimateMinutes: number;
  statusId: string;
  sprintId: string | null;
  storyId: string | null;
  /** La sugerencia que se mostró, para guardarla en `task_estimates`. */
  estimate: Estimate | null;
}

export interface NewIssueInput {
  taskId: string;
  problem: string;
  diagnosis: string;
  solution: string;
}

export interface ProfilePatch {
  name: string;
  nickname: string;
  phone: string;
}
