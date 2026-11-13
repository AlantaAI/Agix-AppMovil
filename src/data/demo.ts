/**
 * Backend del modo demostración: trabaja sobre un proyecto de ejemplo guardado
 * en el dispositivo, sin red ni cuenta. Sirve para enseñar la app sin tocar la
 * base real y para probarla sin `.env`.
 */
import { kv } from '@/lib/kv';
import type { Backend } from './backend';
import { buildDemoSnapshot, DEMO_USER_ID } from './demoData';
import type { IssueLog, Snapshot } from './types';

const KEY = 'agix.demo.snapshot';
const LOGS_KEY = 'agix.demo.logs';
const wait = (ms = 250) => new Promise(r => setTimeout(r, ms));

function read(): Snapshot {
  try {
    const raw = kv.getItem(KEY);
    if (raw) return JSON.parse(raw) as Snapshot;
  } catch {
    // Datos dañados: se vuelve a sembrar el ejemplo.
  }
  const fresh = buildDemoSnapshot(Date.now());
  kv.setItem(KEY, JSON.stringify(fresh));
  return fresh;
}

function write(mutate: (s: Snapshot) => void): void {
  const snap = read();
  mutate(snap);
  kv.setItem(KEY, JSON.stringify(snap));
}

function readLogs(): IssueLog[] {
  try {
    return JSON.parse(kv.getItem(LOGS_KEY) ?? '[]') as IssueLog[];
  } catch {
    return [];
  }
}

/** Vuelve a empezar la demostración desde cero. */
export function resetDemo(): void {
  kv.removeItem(KEY);
  kv.removeItem(LOGS_KEY);
}

export const demoBackend: Backend = {
  kind: 'demo',

  async load() {
    await wait(350);
    return { ...read(), fetchedAt: Date.now() };
  },

  async readTaskStatus(taskId) {
    return read().tasks.find(t => t.id === taskId)?.statusId;
  },

  async moveTask(taskId, statusId, position) {
    await wait();
    write(s => {
      const t = s.tasks.find(x => x.id === taskId);
      if (t) Object.assign(t, { statusId, position });
    });
  },

  async createTask(t) {
    await wait();
    write(s => {
      s.tasks.push({
        id: t.id, projectId: t.projectId, statusId: t.statusId, name: t.name, estimateMinutes: t.estimateMinutes,
        legacySeconds: 0, extraSeconds: 0, position: t.position, sprintId: t.sprintId, storyId: t.storyId, createdAt: Date.now(),
      });
    });
  },

  async openSessionsOf(userId) {
    return read().sessions.filter(s => s.userId === userId && s.endedAt === null);
  },

  async openSession(session) {
    write(s => { s.sessions.push(session); });
  },

  async closeSession(c) {
    write(s => {
      const found = s.sessions.find(x => x.id === c.id);
      if (found) Object.assign(found, { endedAt: c.endedAt, durationSeconds: c.durationSeconds, isPaused: c.isPaused });
    });
  },

  async setLegacySeconds(taskId, seconds) {
    write(s => {
      const t = s.tasks.find(x => x.id === taskId);
      if (t) t.legacySeconds = seconds;
    });
  },

  async loadIssueLogs(taskId) {
    await wait(200);
    return readLogs().filter(l => l.taskId === taskId);
  },

  async addIssueLog(log) {
    await wait();
    kv.setItem(LOGS_KEY, JSON.stringify([...readLogs(), log]));
  },

  async updateProfile(userId, patch) {
    await wait();
    write(s => {
      const p = s.people[userId];
      if (p) Object.assign(p, { name: patch.name.trim(), nickname: patch.nickname.trim(), phone: patch.phone.trim() });
    });
  },

  async estimate(title) {
    await wait(900);
    // Aproximación local para la demostración: más palabras, más trabajo.
    const words = title.trim().split(/\s+/).filter(Boolean).length;
    const grid = [60, 90, 120, 180, 240, 300, 360, 480];
    const minutes = grid[Math.min(grid.length - 1, Math.max(0, words - 2))];
    return {
      minutes,
      bandLowMinutes: Math.round(minutes * 0.6),
      bandHighMinutes: Math.round(minutes * 1.6),
      modelVersion: 'demo',
      provisional: true,
      titleEn: null,
    };
  },
};

export { DEMO_USER_ID };
