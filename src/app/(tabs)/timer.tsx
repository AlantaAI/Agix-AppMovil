import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useWorkspace } from '@/data/WorkspaceProvider';
import type { Snapshot, Task } from '@/data/types';
import { NFR_LABEL } from '@/data/rows';
import { activeSessionOf, doneStatusId, projectStatuses } from '@/domain/board';
import {
  formatClock, formatDuration, formatMinutes, isOverEstimate, nfrSeconds, sessionSeconds, taskRealSeconds, usedPercent,
} from '@/domain/time';
import { useNow } from '@/hooks/useNow';
import { AppHeader } from '@/ui/AppHeader';
import { Backdrop } from '@/ui/Backdrop';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { ProgressBar } from '@/ui/ProgressBar';
import { EmptyState, LoadingState, OfflineBanner } from '@/ui/States';
import { Text } from '@/ui/Text';
import { colors, radius } from '@/ui/theme';
import { useToast } from '@/ui/Toast';
import { confirm } from '@/ui/confirm';
import { success, tap, warning } from '@/ui/haptics';

/**
 * Cronómetro (HU-45). La sesión vive en `time_sessions`, igual que en la web:
 * si se inició en la computadora aparece aquí, y el tiempo se calcula desde
 * `started_at`, así que sigue contando aunque la app pase a segundo plano.
 */
export default function TimerScreen() {
  const router = useRouter();
  const toast = useToast();
  const ws = useWorkspace();
  const { snapshot, loadState, offline, refreshing, refresh } = ws;
  const active = snapshot ? activeSessionOf(snapshot.sessions, snapshot.userId) : null;
  const now = useNow(!!active);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) {
        success();
        toast(ok, 'success');
      }
    } catch (e) {
      warning();
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loadState === 'loading' && !snapshot) {
    return <Backdrop><AppHeader title="Cronómetro" /><LoadingState message="Buscando tu cronómetro…" /></Backdrop>;
  }

  const task = active && snapshot ? snapshot.tasks.find(t => t.id === active.taskId) : undefined;

  return (
    <Backdrop>
      <AppHeader title="Cronómetro" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ffffff" colors={[colors.accent]} />}
      >
        {offline && snapshot && <OfflineBanner fetchedAt={snapshot.fetchedAt} />}
        {snapshot && active && task ? (
          <>
            <LiveCard
              snapshot={snapshot}
              task={task}
              nfrId={active.nfrId}
              sessionSecs={sessionSeconds(active, now)}
              now={now}
              busy={busy}
              onOpen={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
              onPause={() => void run('pause', ws.pauseTimer, 'Cronómetro en pausa')}
              onFinish={async () => {
                const last = projectStatuses(snapshot.statuses, task.projectId).slice(-1)[0];
                const ok = await confirm('¿Finalizar la tarea?', `Se detendrá el cronómetro y pasará a «${last?.name ?? 'Terminado'}».`, 'Finalizar');
                if (ok) void run('finish', () => ws.finishTask(task.id), '¡Tarea terminada!');
              }}
            />
            <NfrCard
              snapshot={snapshot}
              task={task}
              activeNfrId={active.nfrId}
              now={now}
              busy={busy}
              onToggle={nfrId =>
                void run(
                  `nfr:${nfrId ?? 'task'}`,
                  () => (active.nfrId === nfrId ? ws.pauseTimer() : ws.startTimer(task.id, nfrId)),
                )
              }
            />
          </>
        ) : snapshot ? (
          <EmptyState
            icon="clock"
            title="Sin cronómetro en marcha"
            message="Elige una tarea para empezar a registrar tu tiempo. Si lo inicias en la web, también aparece aquí."
          />
        ) : null}

        {snapshot && (
          <ResumeList
            snapshot={snapshot}
            excludeTaskId={active?.taskId}
            busy={busy}
            now={now}
            onStart={t => void run(`start:${t.id}`, () => ws.startTimer(t.id), `Trackeando «${t.name}»`)}
            onOpen={t => router.push({ pathname: '/task/[id]', params: { id: t.id } })}
          />
        )}
      </ScrollView>
    </Backdrop>
  );
}

function LiveCard({
  snapshot, task, nfrId, sessionSecs, now, busy, onOpen, onPause, onFinish,
}: {
  snapshot: Snapshot; task: Task; nfrId: string | null; sessionSecs: number; now: number; busy: string | null;
  onOpen: () => void; onPause: () => void; onFinish: () => void;
}) {
  const total = taskRealSeconds(task, snapshot.sessions, now);
  const pct = usedPercent(total, task.estimateMinutes);
  const over = isOverEstimate(total, task.estimateMinutes, 1);
  const nfr = nfrId ? snapshot.nfrs.find(n => n.id === nfrId) : undefined;
  const project = snapshot.projects.find(p => p.id === task.projectId);

  // El punto «en vivo» late suavemente mientras corre el tiempo.
  const pulse = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Card raised style={styles.live}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${task.name}`} onPress={() => { tap(); onOpen(); }} style={styles.tracking}>
        <Animated.View style={[styles.liveDot, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) }]} />
        <Text variant="label" weight="black" color={colors.accent} numberOfLines={1} style={styles.flex}>
          {nfr ? `RNF · ${nfr.description}` : `Trackeando: ${task.name}`}
        </Text>
        <Feather name="chevron-right" size={18} color={colors.accent} />
      </Pressable>
      {project && <Text variant="caption" color={colors.textMuted} align="center">{project.name}{nfr ? ` · ${task.name}` : ''}</Text>}
      <Text
        variant="display"
        align="center"
        style={styles.clock}
        accessibilityLabel={`Tiempo total ${formatDuration(total)}`}
        accessibilityLiveRegion="none"
      >
        {formatClock(total)}
      </Text>
      <Text variant="caption" weight="bold" color={over ? colors.danger : colors.textMuted} align="center">
        Esta sesión {formatClock(sessionSecs)} · Estimado {formatMinutes(task.estimateMinutes)}
        {pct !== null ? ` · llevas el ${pct} %` : ''}
      </Text>
      <ProgressBar value={task.estimateMinutes > 0 ? total / (task.estimateMinutes * 60) : 0} over={over} height={10} />
      <View style={styles.actions}>
        <Button label="Pausar" icon="pause" variant="secondary" size="lg" loading={busy === 'pause'} onPress={onPause} style={styles.flex} />
        <Button label="Finalizar" icon="check" size="lg" loading={busy === 'finish'} onPress={onFinish} style={styles.flex} />
      </View>
    </Card>
  );
}

function NfrCard({
  snapshot, task, activeNfrId, now, busy, onToggle,
}: { snapshot: Snapshot; task: Task; activeNfrId: string | null; now: number; busy: string | null; onToggle: (nfrId: string | null) => void }) {
  const nfrs = snapshot.nfrs.filter(n => n.taskId === task.id);
  if (nfrs.length === 0) return null;
  return (
    <Card style={styles.gap}>
      <Text variant="overline" color={colors.textSecondary}>Requisitos no funcionales</Text>
      <Text variant="caption" color={colors.textMuted}>Cambia el cronómetro a un requisito para medir cuánto te cuesta cumplirlo.</Text>
      {activeNfrId && (
        <Button label="Volver a la tarea" icon="corner-up-left" variant="outline" size="sm" loading={busy === 'nfr:task'} onPress={() => onToggle(null)} />
      )}
      {nfrs.map(n => {
        const on = n.id === activeNfrId;
        return (
          <View key={n.id} style={[styles.nfr, on && styles.nfrOn]}>
            <Pill label={NFR_LABEL[n.type]} tone={n.type === 'security' ? 'danger' : 'blue'} />
            <Text variant="caption" weight="bold" numberOfLines={2} style={styles.flex}>{n.description}</Text>
            <Text variant="caption" weight="black" color={colors.textMuted} style={styles.mono}>{formatClock(nfrSeconds(snapshot.sessions, n.id, now))}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={on ? `Pausar ${n.description}` : `Trackear ${n.description}`}
              disabled={busy !== null}
              onPress={() => { tap(); onToggle(n.id); }}
              style={[styles.play, on && { backgroundColor: colors.accent }]}
            >
              <Feather name={on ? 'pause' : 'play'} size={17} color="#ffffff" />
            </Pressable>
          </View>
        );
      })}
    </Card>
  );
}

/** Tareas abiertas para retomar: las tuyas con trabajo reciente primero. */
function ResumeList({
  snapshot, excludeTaskId, busy, now, onStart, onOpen,
}: { snapshot: Snapshot; excludeTaskId?: string; busy: string | null; now: number; onStart: (t: Task) => void; onOpen: (t: Task) => void }) {
  const items = useMemo(() => {
    const me = snapshot.userId;
    const assigned = new Set(snapshot.assignments.filter(a => a.userId === me).map(a => a.taskId));
    const lastWork = new Map<string, number>();
    for (const s of snapshot.sessions) {
      if (s.userId !== me) continue;
      lastWork.set(s.taskId, Math.max(lastWork.get(s.taskId) ?? 0, s.endedAt ?? s.startedAt));
    }
    const doneIds = new Set(snapshot.projects.map(p => doneStatusId(projectStatuses(snapshot.statuses, p.id))));
    return snapshot.tasks
      .filter(t => t.id !== excludeTaskId && !doneIds.has(t.statusId) && (assigned.has(t.id) || lastWork.has(t.id)))
      .sort((a, b) => (lastWork.get(b.id) ?? 0) - (lastWork.get(a.id) ?? 0))
      .slice(0, 6);
  }, [snapshot, excludeTaskId]);

  if (items.length === 0) return null;
  return (
    <View style={styles.gap}>
      <Text variant="overline" color={colors.onBg}>Retomar una tarea</Text>
      {items.map(t => {
        const project = snapshot.projects.find(p => p.id === t.projectId);
        const real = taskRealSeconds(t, snapshot.sessions, now);
        return (
          <Card key={t.id} padded={false}>
            <View style={styles.resume}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${t.name}`} onPress={() => { tap(); onOpen(t); }} style={styles.flex}>
                <Text variant="label" numberOfLines={2}>{t.name}</Text>
                <Text variant="caption" color={colors.textMuted} numberOfLines={1}>
                  {project?.name} · {formatDuration(real)} de {formatMinutes(t.estimateMinutes)}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Iniciar cronómetro en ${t.name}`}
                disabled={busy !== null}
                onPress={() => onStart(t)}
                style={({ pressed }) => [styles.startBtn, pressed && { transform: [{ translateY: 2 }] }, busy === `start:${t.id}` && { opacity: 0.6 }]}
              >
                <Feather name="play" size={18} color="#ffffff" />
              </Pressable>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  gap: { gap: 10 },
  live: { gap: 12, padding: 18 },
  tracking: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.pill, borderWidth: 2, borderColor: colors.accentBright, backgroundColor: colors.accentSubtle,
  },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  clock: { fontVariant: ['tabular-nums'], color: colors.navy, fontSize: 58, lineHeight: 66 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  nfr: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.md,
    backgroundColor: colors.cardSubtle, borderWidth: 1.5, borderColor: colors.borderInner,
  },
  nfrOn: { borderColor: colors.accentBright, backgroundColor: '#fff6fa' },
  mono: { fontVariant: ['tabular-nums'] },
  play: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  startBtn: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    boxShadow: '0px 3px 0px #8f0f4b',
  },
});
