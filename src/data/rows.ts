/**
 * Filas de Supabase (los nombres de columna son los de la base, compartida
 * con la web) y su conversión al modelo de la app. Módulo puro: sin red.
 */
import type {
  Assignment, IssueLog, Lesson, Nfr, NfrType, Person, Project, Session, Sprint, Status, Story, Task, Team,
} from './types';

export interface ProjectRow { id: string; nombre: string; team_id: string | null; user_id: string; created_at: string; deleted_at: string | null }
export interface TeamRow { id: string; name: string }
export interface StatusRow { id: string; project_id: string; nombre: string; color: string | null; order_index: number }
export interface SprintRow { id: string; project_id: string; name: string; order_index: number }
export interface StoryRow {
  id: string; project_id: string; title: string; as_a: string | null; i_want: string | null; so_that: string | null;
  acceptance_criteria: string[] | null; order_index: number;
}
export interface TaskRow {
  id: string; project_id: string; status_id: string | null; nombre: string; tiempo_estimado: number | null;
  tiempo_real: number | null; extra_time_seconds?: number | null; position: number | null;
  sprint_id?: string | null; story_id?: string | null; created_at: string;
}
export interface AssignmentRow { task_id: string; user_id: string; assigned_at: string | null }
export interface SessionRow {
  id: string; task_id: string; nfr_id: string | null; user_id: string; started_at: string;
  ended_at: string | null; duration_seconds: number | null; is_paused: boolean | null;
}
export interface NfrRow { id: string; task_id: string; type: string; description: string; estimated_minutes: number | null; status: string | null }
export interface ProfileRow {
  id: string; email: string | null; display_name: string | null; nickname?: string | null;
  phone?: string | null; avatar_url?: string | null;
}
export interface LessonRow { id: string; task_id: string; author_id: string; problem: string | null; created_at: string }
export interface IssueLogRow { id: string; task_id: string; problema: string | null; diagnostico: string | null; solucion: string | null; timestamp: number }

const ms = (iso: string | null | undefined): number => (iso ? new Date(iso).getTime() : 0);
const NFR_TYPES: NfrType[] = ['performance', 'security', 'usability', 'reliability', 'maintainability', 'scalability'];

export const toProject = (r: ProjectRow): Project => ({
  id: r.id, name: r.nombre, teamId: r.team_id, ownerId: r.user_id, createdAt: ms(r.created_at),
});

export const toTeam = (r: TeamRow): Team => ({ id: r.id, name: r.name });

export const toStatus = (r: StatusRow): Status => ({
  id: r.id, projectId: r.project_id, name: r.nombre, color: r.color || '#8b95a8', order: r.order_index,
});

export const toSprint = (r: SprintRow): Sprint => ({ id: r.id, projectId: r.project_id, name: r.name, order: r.order_index });

export const toStory = (r: StoryRow): Story => ({
  id: r.id, projectId: r.project_id, title: r.title, asA: r.as_a ?? '', iWant: r.i_want ?? '', soThat: r.so_that ?? '',
  criteria: r.acceptance_criteria ?? [], order: r.order_index,
});

/** Una tarea sin columna va a la primera del proyecto, como en la web. */
export const toTask = (r: TaskRow, firstStatusId: string): Task => ({
  id: r.id,
  projectId: r.project_id,
  statusId: r.status_id ?? firstStatusId,
  name: r.nombre,
  estimateMinutes: r.tiempo_estimado ?? 0,
  legacySeconds: r.tiempo_real ?? 0,
  extraSeconds: r.extra_time_seconds ?? 0,
  position: r.position,
  sprintId: r.sprint_id ?? null,
  storyId: r.story_id ?? null,
  createdAt: ms(r.created_at),
});

export const toAssignment = (r: AssignmentRow): Assignment => ({
  taskId: r.task_id, userId: r.user_id, assignedAt: ms(r.assigned_at),
});

export const toSession = (r: SessionRow): Session => ({
  id: r.id,
  taskId: r.task_id,
  nfrId: r.nfr_id,
  userId: r.user_id,
  startedAt: ms(r.started_at),
  endedAt: r.ended_at ? ms(r.ended_at) : null,
  durationSeconds: r.duration_seconds ?? 0,
  isPaused: !!r.is_paused,
});

export const toNfr = (r: NfrRow): Nfr => ({
  id: r.id,
  taskId: r.task_id,
  type: (NFR_TYPES as string[]).includes(r.type) ? (r.type as NfrType) : 'performance',
  description: r.description,
  estimatedMinutes: r.estimated_minutes,
  status: r.status ?? 'pending',
});

export const toPerson = (r: ProfileRow): Person => ({
  id: r.id,
  name: r.display_name ?? '',
  email: r.email ?? '',
  nickname: r.nickname ?? '',
  phone: r.phone ?? '',
  avatarUrl: r.avatar_url ?? '',
});

export const toLesson = (r: LessonRow): Lesson => ({
  id: r.id, taskId: r.task_id, authorId: r.author_id, problem: r.problem ?? '', createdAt: ms(r.created_at),
});

export const toIssueLog = (r: IssueLogRow): IssueLog => ({
  id: r.id, taskId: r.task_id, problem: r.problema ?? '', diagnosis: r.diagnostico ?? '', solution: r.solucion ?? '', at: r.timestamp,
});

export const iso = (at: number): string => new Date(at).toISOString();

/** Fila de `time_sessions` para insertar una sesión nueva. */
export const sessionInsertRow = (s: Session) => ({
  id: s.id,
  task_id: s.taskId,
  nfr_id: s.nfrId,
  user_id: s.userId,
  started_at: iso(s.startedAt),
  ended_at: s.endedAt === null ? null : iso(s.endedAt),
  duration_seconds: s.durationSeconds,
  is_paused: s.isPaused,
});

/** Etiqueta en español de cada tipo de RNF (las mismas que la web). */
export const NFR_LABEL: Record<NfrType, string> = {
  performance: 'Rendimiento',
  security: 'Seguridad',
  usability: 'Usabilidad',
  reliability: 'Fiabilidad',
  maintainability: 'Mantenibilidad',
  scalability: 'Escalabilidad',
};
