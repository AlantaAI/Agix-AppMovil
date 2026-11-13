import type { Snapshot } from '@/data/types';
import { activeSessionOf, doneStatusId, projectStatuses } from './board';
import { formatDuration, formatMinutes, isOverEstimate, taskRealSeconds, usedPercent } from './time';
import { FORGOTTEN_TIMER_SECONDS } from './timer';

export type AlertKind = 'assigned' | 'over' | 'timer' | 'lesson';

export interface Alert {
  /** Estable entre cargas: tipo + entidad, para recordar cuáles se vieron. */
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  at: number;
  projectId: string;
  taskId: string | null;
}

/** Ventana de los avisos de asignaciones y lecciones. */
export const ALERT_WINDOW_MS = 14 * 24 * 3600 * 1000;

/**
 * Avisos de la persona, calculados con los datos que ya tiene la app:
 *  - le asignaron una tarea que sigue abierta;
 *  - una tarea suya superó su estimación en más de un 20 %;
 *  - su cronómetro lleva horas en marcha (¿se olvidó de pausarlo?);
 *  - alguien registró una lección aprendida en uno de sus proyectos.
 * La base de datos no guarda fechas de vencimiento, así que no hay avisos de
 * «vence mañana»; el cronograma con fechas vive en la web.
 */
export function buildAlerts(snap: Snapshot, now: number): Alert[] {
  const me = snap.userId;
  const out: Alert[] = [];
  const taskById = new Map(snap.tasks.map(t => [t.id, t]));
  const projectName = new Map(snap.projects.map(p => [p.id, p.name]));
  const doneByProject = new Map<string, string | null>();
  const isDone = (projectId: string, statusId: string) => {
    if (!doneByProject.has(projectId)) doneByProject.set(projectId, doneStatusId(projectStatuses(snap.statuses, projectId)));
    return doneByProject.get(projectId) === statusId;
  };

  for (const a of snap.assignments) {
    if (a.userId !== me || now - a.assignedAt > ALERT_WINDOW_MS) continue;
    const task = taskById.get(a.taskId);
    if (!task || isDone(task.projectId, task.statusId)) continue;
    out.push({
      id: `assigned:${a.taskId}`,
      kind: 'assigned',
      title: `Te asignaron «${task.name}»`,
      body: `${projectName.get(task.projectId) ?? 'Proyecto'} · estimado ${formatMinutes(task.estimateMinutes)}`,
      at: a.assignedAt,
      projectId: task.projectId,
      taskId: task.id,
    });
  }

  // Tareas «mías»: asignadas a mí o en las que registré tiempo.
  const mine = new Set<string>();
  for (const a of snap.assignments) if (a.userId === me) mine.add(a.taskId);
  const lastWork = new Map<string, number>();
  for (const s of snap.sessions) {
    if (s.userId === me) mine.add(s.taskId);
    lastWork.set(s.taskId, Math.max(lastWork.get(s.taskId) ?? 0, s.endedAt ?? now));
  }
  for (const taskId of mine) {
    const task = taskById.get(taskId);
    if (!task || isDone(task.projectId, task.statusId)) continue;
    const real = taskRealSeconds(task, snap.sessions, now);
    if (!isOverEstimate(real, task.estimateMinutes)) continue;
    const pct = usedPercent(real, task.estimateMinutes) ?? 0;
    out.push({
      id: `over:${task.id}`,
      kind: 'over',
      title: `«${task.name}» superó su estimación`,
      body: `${formatDuration(real)} de ${formatMinutes(task.estimateMinutes)} (+${pct - 100} %)`,
      at: lastWork.get(task.id) ?? task.createdAt,
      projectId: task.projectId,
      taskId: task.id,
    });
  }

  const active = activeSessionOf(snap.sessions, me);
  if (active && (now - active.startedAt) / 1000 >= FORGOTTEN_TIMER_SECONDS) {
    const task = taskById.get(active.taskId);
    if (task) {
      out.push({
        id: `timer:${active.id}`,
        kind: 'timer',
        title: `El cronómetro lleva ${formatDuration((now - active.startedAt) / 1000)} en marcha`,
        body: `«${task.name}» · ¿te olvidaste de pausarlo?`,
        at: active.startedAt,
        projectId: task.projectId,
        taskId: task.id,
      });
    }
  }

  for (const l of snap.lessons) {
    if (l.authorId === me || now - l.createdAt > ALERT_WINDOW_MS) continue;
    const task = taskById.get(l.taskId);
    if (!task) continue;
    out.push({
      id: `lesson:${l.id}`,
      kind: 'lesson',
      title: `Lección nueva en ${projectName.get(task.projectId) ?? 'tu proyecto'}`,
      body: l.problem.length > 90 ? `${l.problem.slice(0, 87)}…` : l.problem,
      at: l.createdAt,
      projectId: task.projectId,
      taskId: task.id,
    });
  }

  return out.sort((a, b) => b.at - a.at);
}

/** Un aviso cuenta como nuevo si es posterior a la última vez que se abrió la pestaña. */
export function isUnread(alert: Alert, lastSeenAt: number): boolean {
  return alert.at > lastSeenAt;
}

export function unreadCount(alerts: Alert[], lastSeenAt: number): number {
  return alerts.filter(a => isUnread(a, lastSeenAt)).length;
}
