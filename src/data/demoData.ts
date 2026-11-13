/**
 * Datos de ejemplo del modo demostración (sin Supabase). Personas y proyectos
 * ficticios, con la misma forma que la base real. Módulo puro.
 */
import type { Assignment, Nfr, Person, Project, Session, Snapshot, Sprint, Status, Story, Task, Team } from './types';

export const DEMO_USER_ID = 'demo-user';
const MATE_ID = 'demo-mate';
const H = 3600 * 1000;
const D = 24 * H;

export function buildDemoSnapshot(now: number): Snapshot {
  const people: Record<string, Person> = {
    [DEMO_USER_ID]: { id: DEMO_USER_ID, name: 'Valeria Ríos', email: 'demo@agix.app', nickname: '', phone: '', avatarUrl: '' },
    [MATE_ID]: { id: MATE_ID, name: 'Diego Paredes', email: 'diego@agix.app', nickname: '', phone: '', avatarUrl: '' },
  };
  const teams: Team[] = [{ id: 'team-alfa', name: 'Equipo Alfa' }];
  const projects: Project[] = [
    { id: 'p-gym', name: 'Reservas Gimnasio', teamId: null, ownerId: DEMO_USER_ID, createdAt: now - 30 * D },
    { id: 'p-shop', name: 'Tienda en línea', teamId: null, ownerId: DEMO_USER_ID, createdAt: now - 20 * D },
    { id: 'p-portal', name: 'Portal Clientes', teamId: 'team-alfa', ownerId: MATE_ID, createdAt: now - 12 * D },
  ];
  const statuses: Status[] = [];
  for (const p of projects) {
    statuses.push(
      { id: `${p.id}-todo`, projectId: p.id, name: 'Por hacer', color: '#8b95a8', order: 0 },
      { id: `${p.id}-doing`, projectId: p.id, name: 'En proceso', color: '#a3b86c', order: 1 },
      { id: `${p.id}-done`, projectId: p.id, name: 'Terminado', color: '#5a9e91', order: 2 },
    );
  }
  const sprints: Sprint[] = [
    { id: 'p-gym-s1', projectId: 'p-gym', name: 'Sprint 1', order: 0 },
    { id: 'p-gym-s2', projectId: 'p-gym', name: 'Sprint 2', order: 1 },
    { id: 'p-portal-s1', projectId: 'p-portal', name: 'Sprint 1', order: 0 },
  ];
  const stories: Story[] = [
    {
      id: 'st-login', projectId: 'p-gym', title: 'Acceso seguro', order: 0,
      asA: 'socio del gimnasio', iWant: 'entrar con mi correo o con Google', soThat: 'reservar sin crear otra cuenta',
      criteria: [
        'Dado que tengo cuenta, cuando ingreso mi correo y contraseña correctos, entonces veo mis reservas',
        'Dado que me equivoco de contraseña, cuando intento entrar, entonces veo un mensaje claro',
      ],
    },
    {
      id: 'st-book', projectId: 'p-gym', title: 'Reservar clases', order: 1,
      asA: 'socio', iWant: 'reservar una clase y recibir la confirmación', soThat: 'asegurar mi cupo',
      criteria: ['Dado que hay cupos, cuando reservo, entonces recibo una notificación de confirmación'],
    },
  ];

  const tasks: Task[] = [];
  const add = (
    id: string, projectId: string, status: 'todo' | 'doing' | 'done', name: string, estimateMinutes: number,
    opts: Partial<Pick<Task, 'sprintId' | 'storyId' | 'legacySeconds'>> = {},
  ) => {
    const position = (tasks.filter(t => t.statusId === `${projectId}-${status}`).length + 1) * 1024;
    tasks.push({
      id, projectId, statusId: `${projectId}-${status}`, name, estimateMinutes, legacySeconds: opts.legacySeconds ?? 0,
      extraSeconds: 0, position, sprintId: opts.sprintId ?? null, storyId: opts.storyId ?? null, createdAt: now - 10 * D + tasks.length * H,
    });
  };
  add('t-notif', 'p-gym', 'doing', 'Enviar notificaciones de reserva', 180, { sprintId: 'p-gym-s2', storyId: 'st-book' });
  add('t-google', 'p-gym', 'doing', 'Login con Google', 120, { sprintId: 'p-gym-s2', storyId: 'st-login' });
  add('t-cal', 'p-gym', 'todo', 'Calendario de clases por sede', 300, { sprintId: 'p-gym-s2', storyId: 'st-book' });
  add('t-cancel', 'p-gym', 'todo', 'Cancelar una reserva', 90, { sprintId: 'p-gym-s2', storyId: 'st-book' });
  add('t-wait', 'p-gym', 'todo', 'Lista de espera cuando no hay cupos', 240, { sprintId: 'p-gym-s2', storyId: 'st-book' });
  add('t-db', 'p-gym', 'done', 'Modelo de datos de reservas', 150, { sprintId: 'p-gym-s1', storyId: 'st-book' });
  add('t-pass', 'p-gym', 'done', 'Recuperar contraseña', 120, { sprintId: 'p-gym-s1', storyId: 'st-login' });
  add('t-cart', 'p-shop', 'doing', 'Carrito de compras', 360);
  add('t-pay', 'p-shop', 'todo', 'Pasarela de pagos', 480);
  add('t-catalog', 'p-shop', 'done', 'Catálogo con filtros', 300);
  add('t-ticket', 'p-portal', 'todo', 'Abrir un ticket de soporte', 150, { sprintId: 'p-portal-s1' });
  add('t-invoice', 'p-portal', 'doing', 'Descargar facturas en PDF', 120, { sprintId: 'p-portal-s1' });
  add('t-portal-login', 'p-portal', 'done', 'Inicio de sesión del portal', 90, { sprintId: 'p-portal-s1' });

  const assignments: Assignment[] = [
    { taskId: 't-notif', userId: DEMO_USER_ID, assignedAt: now - 3 * D },
    { taskId: 't-google', userId: MATE_ID, assignedAt: now - 3 * D },
    { taskId: 't-cancel', userId: DEMO_USER_ID, assignedAt: now - 2 * H },
    { taskId: 't-invoice', userId: DEMO_USER_ID, assignedAt: now - 26 * H },
    { taskId: 't-ticket', userId: MATE_ID, assignedAt: now - 2 * D },
  ];

  let n = 0;
  const done = (taskId: string, userId: string, startAgo: number, minutes: number, nfrId: string | null = null): Session => ({
    id: `s-${++n}`, taskId, nfrId, userId, startedAt: now - startAgo, endedAt: now - startAgo + minutes * 60_000,
    durationSeconds: minutes * 60, isPaused: true,
  });
  const sessions: Session[] = [
    done('t-notif', DEMO_USER_ID, 26 * H, 55),
    done('t-notif', DEMO_USER_ID, 5 * H, 35),
    done('t-notif', DEMO_USER_ID, 3 * H, 12, 'nfr-perf'),
    done('t-google', MATE_ID, 28 * H, 95),
    done('t-google', MATE_ID, 4 * H, 35),
    done('t-invoice', DEMO_USER_ID, 50 * H, 40),
    done('t-db', DEMO_USER_ID, 6 * D, 140),
    done('t-pass', MATE_ID, 5 * D, 130),
    done('t-catalog', DEMO_USER_ID, 9 * D, 280),
    done('t-portal-login', MATE_ID, 7 * D, 100),
    // Cronómetro en marcha, como si se hubiera iniciado desde la web.
    { id: 's-live', taskId: 't-notif', nfrId: null, userId: DEMO_USER_ID, startedAt: now - 17 * 60_000, endedAt: null, durationSeconds: 0, isPaused: false },
  ];

  const nfrs: Nfr[] = [
    { id: 'nfr-perf', taskId: 't-notif', type: 'performance', description: 'Envío en menos de 2 s', estimatedMinutes: 30, status: 'in_progress' },
    { id: 'nfr-sec', taskId: 't-notif', type: 'security', description: 'Tokens firmados', estimatedMinutes: 20, status: 'pending' },
  ];

  return {
    userId: DEMO_USER_ID,
    projects, teams, statuses, sprints, stories, tasks, assignments, sessions, nfrs, people,
    lessons: [
      { id: 'l-1', taskId: 't-google', authorId: MATE_ID, problem: 'El callback de OAuth fallaba en Android por el esquema de la URL de retorno.', createdAt: now - 4 * H },
    ],
    fetchedAt: now,
  };
}
