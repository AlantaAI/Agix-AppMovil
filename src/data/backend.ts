/**
 * Acceso a datos. La app habla con una `Backend`: la real usa Supabase (las
 * mismas tablas y Edge Functions que la web) y la de demostración guarda un
 * proyecto de ejemplo en el dispositivo (ver `demo.ts`).
 */
import { supabase } from '@/lib/supabase';
import { parseEstimateResponse, taskEstimateRow } from '@/domain/estimate';
import type { ClosedSession } from '@/domain/timer';
import type { Estimate, IssueLog, NewTaskInput, ProfilePatch, Session, Snapshot } from './types';
import {
  iso, sessionInsertRow, toAssignment, toIssueLog, toLesson, toNfr, toPerson, toProject, toSession, toSprint,
  toStatus, toStory, toTask, toTeam,
  type AssignmentRow, type IssueLogRow, type LessonRow, type NfrRow, type ProfileRow, type ProjectRow,
  type SessionRow, type SprintRow, type StatusRow, type StoryRow, type TaskRow, type TeamRow,
} from './rows';

export interface CreatedTask extends NewTaskInput {
  id: string;
  position: number;
}

export interface Backend {
  kind: 'supabase' | 'demo';
  load(userId: string): Promise<Snapshot>;
  /** Columna actual de la tarea en el servidor; `undefined` si ya no existe. */
  readTaskStatus(taskId: string): Promise<string | null | undefined>;
  moveTask(taskId: string, statusId: string, position: number): Promise<void>;
  createTask(task: CreatedTask): Promise<void>;
  /** Sesiones abiertas de la persona en el servidor (pueden venir de la web). */
  openSessionsOf(userId: string): Promise<Session[]>;
  openSession(s: Session): Promise<void>;
  closeSession(c: ClosedSession): Promise<void>;
  setLegacySeconds(taskId: string, seconds: number): Promise<void>;
  loadIssueLogs(taskId: string): Promise<IssueLog[]>;
  addIssueLog(log: IssueLog): Promise<void>;
  updateProfile(userId: string, patch: ProfilePatch): Promise<void>;
  estimate(title: string, story?: string): Promise<Estimate | null>;
}

/** Error de red: la app lo distingue para mostrar la caché sin conexión. */
export class NetworkError extends Error {}

const NETWORK = /network request failed|failed to fetch|fetch failed|network ?error|timed? ?out|load failed/i;

function fail(where: string, error: { message: string } | null): void {
  if (!error) return;
  if (NETWORK.test(error.message)) throw new NetworkError('No hay conexión con el servidor.');
  throw new Error(`${where}: ${error.message}`);
}

/** Lecciones de las dos últimas semanas (bastan para los avisos). */
const LESSON_WINDOW_MS = 14 * 24 * 3600 * 1000;

export const supabaseBackend: Backend = {
  kind: 'supabase',

  async load(userId) {
    const now = Date.now();
    const [projectsRes, teamsRes, statusesRes, sprintsRes, storiesRes, tasksRes, assignRes, sessionsRes, nfrsRes, lessonsRes] =
      await Promise.all([
        supabase.from('projects').select('id, nombre, team_id, user_id, created_at, deleted_at').is('deleted_at', null).order('created_at'),
        supabase.from('teams').select('id, name'),
        supabase.from('statuses').select('id, project_id, nombre, color, order_index').order('order_index'),
        supabase.from('sprints').select('id, project_id, name, order_index').order('order_index'),
        supabase.from('user_stories').select('id, project_id, title, as_a, i_want, so_that, acceptance_criteria, order_index').order('order_index'),
        supabase.from('tasks').select('*').order('created_at'),
        supabase.from('task_assignments').select('task_id, user_id, assigned_at'),
        supabase.from('time_sessions').select('*').order('started_at'),
        supabase.from('nfrs').select('id, task_id, type, description, estimated_minutes, status'),
        supabase.from('lessons').select('id, task_id, author_id, problem, created_at').gte('created_at', iso(now - LESSON_WINDOW_MS)),
      ]);

    // Sin proyectos no hay nada que pintar: ese error sí se propaga. El resto
    // de tablas degrada a vacío, como en la web, si su migración no está.
    fail('Proyectos', projectsRes.error);
    fail('Tareas', tasksRes.error);

    const projects = ((projectsRes.data ?? []) as ProjectRow[]).map(toProject);
    const projectIds = new Set(projects.map(p => p.id));
    const statuses = ((statusesRes.data ?? []) as StatusRow[]).map(toStatus).filter(s => projectIds.has(s.projectId));
    const firstStatus = new Map<string, string>();
    for (const s of statuses) if (!firstStatus.has(s.projectId)) firstStatus.set(s.projectId, s.id);
    const tasks = ((tasksRes.data ?? []) as TaskRow[])
      .filter(t => projectIds.has(t.project_id))
      .map(t => toTask(t, firstStatus.get(t.project_id) ?? ''));
    const taskIds = new Set(tasks.map(t => t.id));
    const assignments = ((assignRes.data ?? []) as AssignmentRow[]).map(toAssignment).filter(a => taskIds.has(a.taskId));
    const sessions = ((sessionsRes.data ?? []) as SessionRow[]).map(toSession).filter(s => taskIds.has(s.taskId));
    const lessons = ((lessonsRes.data ?? []) as LessonRow[]).map(toLesson).filter(l => taskIds.has(l.taskId));

    const peopleIds = new Set<string>([userId]);
    for (const a of assignments) peopleIds.add(a.userId);
    for (const s of sessions) peopleIds.add(s.userId);
    for (const l of lessons) peopleIds.add(l.authorId);
    const profilesRes = await supabase
      .from('profiles').select('id, email, display_name, nickname, phone, avatar_url').in('id', [...peopleIds]);
    const people = Object.fromEntries(((profilesRes.data ?? []) as ProfileRow[]).map(r => [r.id, toPerson(r)]));

    return {
      userId,
      projects,
      teams: ((teamsRes.data ?? []) as TeamRow[]).map(toTeam),
      statuses,
      sprints: ((sprintsRes.data ?? []) as SprintRow[]).map(toSprint).filter(s => projectIds.has(s.projectId)),
      stories: ((storiesRes.data ?? []) as StoryRow[]).map(toStory).filter(s => projectIds.has(s.projectId)),
      tasks,
      assignments,
      sessions,
      nfrs: ((nfrsRes.data ?? []) as NfrRow[]).map(toNfr).filter(n => taskIds.has(n.taskId)),
      people,
      lessons,
      fetchedAt: now,
    };
  },

  async readTaskStatus(taskId) {
    const { data, error } = await supabase.from('tasks').select('status_id').eq('id', taskId).maybeSingle();
    fail('Tarea', error);
    return data ? ((data as { status_id: string | null }).status_id) : undefined;
  },

  async moveTask(taskId, statusId, position) {
    const { error } = await supabase.from('tasks').update({ status_id: statusId, position }).eq('id', taskId);
    fail('Mover tarea', error);
  },

  async createTask(t) {
    const row: Record<string, unknown> = {
      id: t.id,
      project_id: t.projectId,
      status_id: t.statusId,
      nombre: t.name,
      tiempo_estimado: t.estimateMinutes,
      tiempo_real: 0,
      lecciones_aprendidas: '',
      position: t.position,
      sprint_id: t.sprintId,
      story_id: t.storyId,
    };
    // El título en inglés es lo que consume el estimador: se guarda para no retraducir.
    if (t.estimate?.titleEn) row.title_en = t.estimate.titleEn;
    let { error } = await supabase.from('tasks').insert(row);
    if (error && /title_en/i.test(error.message)) {
      delete row.title_en;
      ({ error } = await supabase.from('tasks').insert(row));
    }
    fail('Crear tarea', error);
    if (t.estimate && t.estimate.minutes > 0) {
      // Opcional: si la tabla aún no existe, la tarea queda creada igual.
      const res = await supabase.from('task_estimates').insert(taskEstimateRow(t.id, t.estimate, t.estimateMinutes));
      if (res.error) console.warn('task_estimates:', res.error.message);
    }
  },

  async openSessionsOf(userId) {
    const { data, error } = await supabase.from('time_sessions').select('*').eq('user_id', userId).is('ended_at', null);
    fail('Cronómetro', error);
    return ((data ?? []) as SessionRow[]).map(toSession);
  },

  async openSession(s) {
    const { error } = await supabase.from('time_sessions').insert(sessionInsertRow(s));
    fail('Iniciar cronómetro', error);
  },

  async closeSession(c) {
    const { error } = await supabase
      .from('time_sessions')
      .update({ ended_at: iso(c.endedAt), duration_seconds: c.durationSeconds, is_paused: c.isPaused })
      .eq('id', c.id);
    fail('Detener cronómetro', error);
  },

  async setLegacySeconds(taskId, seconds) {
    const { error } = await supabase.from('tasks').update({ tiempo_real: seconds }).eq('id', taskId);
    fail('Guardar tiempo', error);
  },

  async loadIssueLogs(taskId) {
    const { data, error } = await supabase.from('issue_logs').select('*').eq('task_id', taskId).order('timestamp');
    fail('Incidencias', error);
    return ((data ?? []) as IssueLogRow[]).map(toIssueLog);
  },

  async addIssueLog(log) {
    const { error } = await supabase.from('issue_logs').insert({
      id: log.id, task_id: log.taskId, problema: log.problem, diagnostico: log.diagnosis, solucion: log.solution, timestamp: log.at,
    });
    fail('Registrar incidencia', error);
  },

  async updateProfile(userId, patch) {
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: patch.name.trim(), nickname: patch.nickname.trim() || null, phone: patch.phone.trim() || null })
      .eq('id', userId);
    fail('Perfil', error);
  },

  async estimate(title, story) {
    try {
      const { data, error } = await supabase.functions.invoke('estimate-task', {
        body: { tasks: [{ title, ...(story ? { story } : {}) }] },
      });
      if (error) return null;
      return parseEstimateResponse(data);
    } catch {
      return null;
    }
  },
};
