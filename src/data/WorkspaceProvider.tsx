import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { uuid } from '@/lib/uuid';
import { checkMove, doneStatusId, nextPosition, projectStatuses } from '@/domain/board';
import { taskSessionSeconds } from '@/domain/time';
import { applyToSessions, planStart, planStop, reconcileOpenSessions, type ClosedSession } from '@/domain/timer';
import { useAuth } from './AuthProvider';
import { NetworkError, supabaseBackend, type Backend } from './backend';
import { demoBackend } from './demo';
import {
  readActiveProject, readAlertsSeenAt, readCachedSnapshot, writeActiveProject, writeAlertsSeenAt, writeCachedSnapshot,
} from './prefs';
import type { Estimate, IssueLog, NewIssueInput, NewTaskInput, ProfilePatch, Snapshot } from './types';

export type MoveResult = { ok: true } | { ok: false; message: string };

interface WorkspaceValue {
  snapshot: Snapshot | null;
  /** `loading` solo la primera vez sin caché; luego siempre hay algo que pintar. */
  loadState: 'idle' | 'loading' | 'ready' | 'error';
  /** La última recarga falló por red: se muestra la copia guardada (HU-43). */
  offline: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  backendKind: Backend['kind'];
  activeProjectId: string | null;
  setActiveProject: (projectId: string) => void;
  moveTask: (taskId: string, toStatusId: string) => Promise<MoveResult>;
  createTask: (input: NewTaskInput) => Promise<string>;
  startTimer: (taskId: string, nfrId?: string | null) => Promise<void>;
  pauseTimer: () => Promise<void>;
  finishTask: (taskId: string) => Promise<void>;
  estimate: (title: string, story?: string) => Promise<Estimate | null>;
  loadIssueLogs: (taskId: string) => Promise<IssueLog[]>;
  addIssueLog: (input: NewIssueInput) => Promise<IssueLog>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  /** Última vez que se abrieron los avisos (apaga el contador). */
  alertsSeenAt: number;
  /** La vez anterior: lo posterior a esto se resalta como nuevo mientras se mira. */
  alertsSeenBefore: number;
  markAlertsSeen: () => void;
}

const WorkspaceContext = createContext<WorkspaceValue | undefined>(undefined);

/** Recarga periódica mientras la app está abierta (la base no emite cambios en vivo). */
const POLL_MS = 60_000;

const friendly = (e: unknown): string =>
  e instanceof NetworkError ? 'Sin conexión: inténtalo cuando vuelvas a tener internet.' : (e as Error)?.message || 'Algo salió mal.';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { status, userId, demo } = useAuth();
  const backend: Backend = demo ? demoBackend : supabaseBackend;

  /** Dueño de los datos en pantalla: al cambiar de cuenta (o entrar/salir de la demo) se reinicia todo. */
  const sessionKey = status === 'signedIn' && userId ? `${demo ? 'demo' : 'live'}:${userId}` : null;
  const [owner, setOwner] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadState, setLoadState] = useState<WorkspaceValue['loadState']>('idle');
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [alertsSeen, setAlertsSeen] = useState({ at: 0, before: 0 });

  // Reinicio al cambiar de dueño, durante el render (sin efecto, como recomienda React):
  // se pinta al instante la copia guardada de esa cuenta y luego se recarga detrás.
  if (owner !== sessionKey) {
    const cached = sessionKey && userId ? readCachedSnapshot(userId) : null;
    const seen = sessionKey && userId ? readAlertsSeenAt(userId) : 0;
    setOwner(sessionKey);
    setSnapshot(cached);
    setLoadState(sessionKey ? (cached ? 'ready' : 'loading') : 'idle');
    setOffline(false);
    setError(null);
    setActiveProjectId(sessionKey && userId ? readActiveProject(userId) : null);
    setAlertsSeen({ at: seen, before: seen });
  }

  // Copias para las funciones asíncronas, que deben leer el estado más reciente.
  const snapRef = useRef<Snapshot | null>(snapshot);
  const ownerRef = useRef<string | null>(sessionKey);
  useEffect(() => {
    snapRef.current = snapshot;
    ownerRef.current = owner;
  }, [snapshot, owner]);

  // Una recarga que empezó antes de un cambio local no debe pisarlo al terminar.
  const mutationSeq = useRef(0);
  const pending = useRef(0);

  const commit = useCallback((next: Snapshot) => {
    snapRef.current = next;
    setSnapshot(next);
    writeCachedSnapshot(next);
  }, []);

  const update = useCallback((fn: (s: Snapshot) => Snapshot) => {
    const cur = snapRef.current;
    if (cur) commit(fn(cur));
  }, [commit]);

  /** Recarga en segundo plano: sin indicador, no toca el estado hasta tener respuesta. */
  const sync = useCallback((): Promise<void> => {
    if (!userId || !sessionKey) return Promise.resolve();
    const seq = mutationSeq.current;
    return backend.load(userId).then(
      fresh => {
        // Se descarta si mientras tanto cambió la cuenta o hubo un cambio local.
        if (ownerRef.current !== sessionKey) return;
        if (seq === mutationSeq.current && pending.current === 0) commit(fresh);
        setOffline(false);
        setError(null);
        setLoadState('ready');
      },
      (e: unknown) => {
        if (ownerRef.current !== sessionKey) return;
        const net = e instanceof NetworkError;
        setOffline(net);
        setError(net ? null : friendly(e));
        setLoadState(snapRef.current ? 'ready' : 'error');
      },
    );
  }, [backend, commit, sessionKey, userId]);

  /** Recarga pedida por la persona (deslizar hacia abajo): con indicador. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await sync();
    } finally {
      setRefreshing(false);
    }
  }, [sync]);

  useEffect(() => {
    if (!sessionKey) return;
    void sync();
  }, [sessionKey, sync]);

  useEffect(() => {
    if (!sessionKey) return;
    const sub = AppState.addEventListener('change', s => { if (s === 'active') void sync(); });
    const id = setInterval(() => { if (AppState.currentState === 'active') void sync(); }, POLL_MS);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [sessionKey, sync]);

  /** Envuelve un cambio: bloquea recargas que lo pisarían mientras dura. */
  const mutate = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    mutationSeq.current += 1;
    pending.current += 1;
    try {
      return await fn();
    } finally {
      pending.current -= 1;
    }
  }, []);

  const effectiveProjectId = useMemo(() => {
    if (!snapshot) return activeProjectId;
    if (activeProjectId && snapshot.projects.some(p => p.id === activeProjectId)) return activeProjectId;
    return snapshot.projects[0]?.id ?? null;
  }, [snapshot, activeProjectId]);

  const setActiveProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    if (userId) writeActiveProject(userId, projectId);
  }, [userId]);

  const moveTask = useCallback(async (taskId: string, toStatusId: string): Promise<MoveResult> => {
    const snap = snapRef.current;
    const task = snap?.tasks.find(t => t.id === taskId);
    if (!snap || !task) return { ok: false, message: 'No se encontró la tarea.' };
    if (task.statusId === toStatusId) return { ok: true };
    const from = { statusId: task.statusId, position: task.position };
    const position = nextPosition(snap.tasks, toStatusId, taskId);
    let reload = false;
    try {
      return await mutate(async () => {
        update(s => ({ ...s, tasks: s.tasks.map(t => (t.id === taskId ? { ...t, statusId: toStatusId, position } : t)) }));
        try {
          const check = checkMove(from.statusId, await backend.readTaskStatus(taskId));
          if (!check.ok) {
            reload = true;
            if (check.reason === 'gone') return { ok: false, message: 'Esta tarea ya no existe: alguien la eliminó.' };
            const name = snap.statuses.find(s => s.id === check.serverStatusId)?.name ?? 'otra columna';
            return { ok: false, message: `Alguien ya la movió a «${name}». Actualicé el tablero.` };
          }
          await backend.moveTask(taskId, toStatusId, position);
          return { ok: true } as const;
        } catch (e) {
          update(s => ({ ...s, tasks: s.tasks.map(t => (t.id === taskId ? { ...t, ...from } : t)) }));
          return { ok: false, message: friendly(e) };
        }
      });
    } finally {
      if (reload) void sync();
    }
  }, [backend, sync, mutate, update]);

  const createTask = useCallback(async (input: NewTaskInput): Promise<string> => {
    const snap = snapRef.current;
    if (!snap) throw new Error('Aún no se cargaron los datos.');
    const id = uuid();
    const position = nextPosition(snap.tasks, input.statusId);
    return mutate(async () => {
      update(s => ({
        ...s,
        tasks: [...s.tasks, {
          id, projectId: input.projectId, statusId: input.statusId, name: input.name, estimateMinutes: input.estimateMinutes,
          legacySeconds: 0, extraSeconds: 0, position, sprintId: input.sprintId, storyId: input.storyId, createdAt: Date.now(),
        }],
      }));
      try {
        await backend.createTask({ ...input, id, position });
        return id;
      } catch (e) {
        update(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }));
        throw new Error(friendly(e));
      }
    });
  }, [backend, mutate, update]);

  /**
   * Copia el total de sesiones de cada tarea a `tiempo_real`, como hace la web
   * al detener el cronómetro (lo leen el Gantt y los informes).
   */
  const mirrorLegacy = useCallback(async (closed: ClosedSession[], at: number) => {
    const snap = snapRef.current;
    if (!snap) return;
    for (const taskId of new Set(closed.map(c => c.taskId))) {
      const total = taskSessionSeconds(snap.sessions, taskId, at);
      if (total <= 0) continue;
      update(s => ({ ...s, tasks: s.tasks.map(t => (t.id === taskId ? { ...t, legacySeconds: total } : t)) }));
      await backend.setLegacySeconds(taskId, total);
    }
  }, [backend, update]);

  /** Sesiones al día con el servidor: la web pudo iniciar o detener el cronómetro. */
  const syncedSessions = useCallback(async () => {
    const snap = snapRef.current;
    if (!snap || !userId) throw new Error('Aún no se cargaron los datos.');
    const serverOpen = await backend.openSessionsOf(userId);
    const { sessions, stale } = reconcileOpenSessions(snap.sessions, serverOpen, userId);
    if (stale) {
      const fresh = await backend.load(userId);
      commit(fresh);
      return fresh.sessions;
    }
    update(s => ({ ...s, sessions }));
    return sessions;
  }, [backend, commit, update, userId]);

  const stopAll = useCallback(async (at: number) => {
    if (!userId) return [];
    const sessions = await syncedSessions();
    const closes = planStop(sessions, userId, at);
    if (closes.length === 0) return closes;
    update(s => ({ ...s, sessions: applyToSessions(s.sessions, closes, null) }));
    for (const c of closes) await backend.closeSession(c);
    await mirrorLegacy(closes, at);
    return closes;
  }, [backend, mirrorLegacy, syncedSessions, update, userId]);

  const startTimer = useCallback(async (taskId: string, nfrId: string | null = null) => {
    if (!userId) return;
    await mutate(async () => {
      try {
        const sessions = await syncedSessions();
        const at = Date.now();
        const plan = planStart(sessions, userId, taskId, nfrId, at, uuid());
        update(s => ({ ...s, sessions: applyToSessions(s.sessions, plan.close, plan.open) }));
        for (const c of plan.close) await backend.closeSession(c);
        await backend.openSession(plan.open);
        await mirrorLegacy(plan.close, at);
      } catch (e) {
        void sync();
        throw new Error(friendly(e));
      }
    });
  }, [backend, sync, mirrorLegacy, mutate, syncedSessions, update, userId]);

  const pauseTimer = useCallback(async () => {
    await mutate(async () => {
      try {
        await stopAll(Date.now());
      } catch (e) {
        void sync();
        throw new Error(friendly(e));
      }
    });
  }, [sync, mutate, stopAll]);

  /** Detiene el cronómetro y pasa la tarea a la última columna («Terminado»). */
  const finishTask = useCallback(async (taskId: string) => {
    await mutate(async () => {
      try {
        await stopAll(Date.now());
        const snap = snapRef.current;
        const task = snap?.tasks.find(t => t.id === taskId);
        if (!snap || !task) return;
        const doneId = doneStatusId(projectStatuses(snap.statuses, task.projectId));
        if (!doneId || task.statusId === doneId) return;
        const position = nextPosition(snap.tasks, doneId, taskId);
        update(s => ({ ...s, tasks: s.tasks.map(t => (t.id === taskId ? { ...t, statusId: doneId, position } : t)) }));
        await backend.moveTask(taskId, doneId, position);
      } catch (e) {
        void sync();
        throw new Error(friendly(e));
      }
    });
  }, [backend, sync, mutate, stopAll, update]);

  const estimate = useCallback((title: string, story?: string) => backend.estimate(title, story), [backend]);

  const loadIssueLogs = useCallback(async (taskId: string) => {
    try {
      return await backend.loadIssueLogs(taskId);
    } catch (e) {
      throw new Error(friendly(e));
    }
  }, [backend]);

  const addIssueLog = useCallback(async (input: NewIssueInput) => {
    const log: IssueLog = { id: uuid(), ...input, at: Date.now() };
    try {
      await backend.addIssueLog(log);
      return log;
    } catch (e) {
      throw new Error(friendly(e));
    }
  }, [backend]);

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    if (!userId) return;
    await mutate(async () => {
      try {
        await backend.updateProfile(userId, patch);
      } catch (e) {
        throw new Error(friendly(e));
      }
      update(s => {
        const me = s.people[userId] ?? { id: userId, name: '', email: '', nickname: '', phone: '', avatarUrl: '' };
        return { ...s, people: { ...s.people, [userId]: { ...me, name: patch.name.trim(), nickname: patch.nickname.trim(), phone: patch.phone.trim() } } };
      });
    });
  }, [backend, mutate, update, userId]);

  const markAlertsSeen = useCallback(() => {
    if (!userId) return;
    const now = Date.now();
    writeAlertsSeenAt(userId, now);
    setAlertsSeen(cur => ({ at: now, before: cur.at }));
  }, [userId]);

  const value = useMemo<WorkspaceValue>(() => ({
    snapshot, loadState, offline, error, refreshing, refresh, backendKind: backend.kind,
    activeProjectId: effectiveProjectId, setActiveProject, moveTask, createTask, startTimer, pauseTimer, finishTask,
    estimate, loadIssueLogs, addIssueLog, updateProfile,
    alertsSeenAt: alertsSeen.at, alertsSeenBefore: alertsSeen.before, markAlertsSeen,
  }), [
    snapshot, loadState, offline, error, refreshing, refresh, backend.kind, effectiveProjectId, setActiveProject, moveTask,
    createTask, startTimer, pauseTimer, finishTask, estimate, loadIssueLogs, addIssueLog, updateProfile, alertsSeen, markAlertsSeen,
  ]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace debe usarse dentro de <WorkspaceProvider>');
  return ctx;
}
