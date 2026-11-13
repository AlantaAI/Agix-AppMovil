import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useWorkspace } from '@/data/WorkspaceProvider';
import type { IssueLog } from '@/data/types';
import { NFR_LABEL } from '@/data/rows';
import { activeSessionOf, assigneesOf, doneStatusId, projectStatuses } from '@/domain/board';
import { displayName } from '@/domain/people';
import { formatDuration, formatMinutes, isOverEstimate, nfrSeconds, relativeTime, taskRealSeconds, usedPercent } from '@/domain/time';
import { useNow } from '@/hooks/useNow';
import { AppHeader } from '@/ui/AppHeader';
import { Avatar } from '@/ui/Avatar';
import { Backdrop } from '@/ui/Backdrop';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { Pill } from '@/ui/Pill';
import { ProgressBar } from '@/ui/ProgressBar';
import { EmptyState } from '@/ui/States';
import { Text } from '@/ui/Text';
import { colors, radius } from '@/ui/theme';
import { useToast } from '@/ui/Toast';
import { confirm } from '@/ui/confirm';
import { success, tap, warning } from '@/ui/haptics';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const ws = useWorkspace();
  const { snapshot } = ws;
  const task = snapshot?.tasks.find(t => t.id === id);
  const mine = snapshot ? activeSessionOf(snapshot.sessions, snapshot.userId) : null;
  const trackingHere = !!mine && mine.taskId === id;
  const now = useNow(trackingHere);
  const [busy, setBusy] = useState<'timer' | 'finish' | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.navigate('/board'));

  if (!snapshot || !task) {
    return (
      <Backdrop>
        <AppHeader title="Detalle de tarea" onBack={back} />
        <View style={styles.pad}>
          <EmptyState icon="alert-circle" title="No encontramos esta tarea" message="Puede que se haya eliminado o movido a otro proyecto." />
        </View>
      </Backdrop>
    );
  }

  const statuses = projectStatuses(snapshot.statuses, task.projectId);
  const status = statuses.find(s => s.id === task.statusId);
  const isDone = doneStatusId(statuses) === task.statusId;
  const project = snapshot.projects.find(p => p.id === task.projectId);
  const story = snapshot.stories.find(s => s.id === task.storyId);
  const sprint = snapshot.sprints.find(s => s.id === task.sprintId);
  const assignees = assigneesOf(snapshot.assignments, task.id);
  const nfrs = snapshot.nfrs.filter(n => n.taskId === task.id);
  const real = taskRealSeconds(task, snapshot.sessions, now);
  const pct = usedPercent(real, task.estimateMinutes);
  const over = isOverEstimate(real, task.estimateMinutes, 1);
  const estimateSeconds = task.estimateMinutes * 60;
  const scale = Math.max(real, estimateSeconds, 1);

  const toggleTimer = async (nfrId: string | null = null) => {
    setBusy('timer');
    try {
      if (trackingHere && (mine?.nfrId ?? null) === nfrId) {
        await ws.pauseTimer();
        toast('Cronómetro en pausa', 'info');
      } else {
        await ws.startTimer(task.id, nfrId);
        success();
        toast(nfrId ? 'Trackeando el requisito' : 'Cronómetro en marcha', 'success');
      }
    } catch (e) {
      warning();
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const finish = async () => {
    const ok = await confirm('¿Finalizar la tarea?', `Se detendrá el cronómetro y pasará a «${statuses[statuses.length - 1]?.name ?? 'Terminado'}».`, 'Finalizar');
    if (!ok) return;
    setBusy('finish');
    try {
      await ws.finishTask(task.id);
      success();
      toast('¡Tarea terminada!', 'success');
    } catch (e) {
      warning();
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const move = async (statusId: string) => {
    const result = await ws.moveTask(task.id, statusId);
    if (result.ok) {
      success();
      toast(`Movida a «${statuses.find(s => s.id === statusId)?.name}»`, 'success');
    } else {
      warning();
      toast(result.message, 'error');
    }
  };

  return (
    <Backdrop>
      <AppHeader title="Detalle de tarea" subtitle={project?.name} onBack={back} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 130 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <Card style={styles.gap}>
            <Text variant="title">{task.name}</Text>
            <View style={styles.wrapRow}>
              <Pill label={status?.name ?? 'Sin columna'} tone={isDone ? 'teal' : 'neutral'} dot={status?.color} />
              {sprint && <Pill label={sprint.name} tone="blue" />}
              {trackingHere && <Pill label="en curso" tone="teal" pulse />}
            </View>
            <View style={styles.gapSm}>
              <Text variant="overline" color={colors.textSecondary}>Asignados</Text>
              {assignees.length === 0 ? (
                <Text variant="caption" color={colors.textMuted}>Nadie asignado todavía (se asigna desde la web).</Text>
              ) : (
                <View style={styles.wrapRow}>
                  {assignees.map(uid => (
                    <View key={uid} style={styles.person}>
                      <Avatar id={uid} person={snapshot.people[uid]} size={28} />
                      <Text variant="caption" weight="bold">{uid === snapshot.userId ? 'Tú' : displayName(snapshot.people[uid])}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Card>

          <Card style={styles.gap}>
            <Text variant="heading">Estimado frente a real</Text>
            <View style={styles.gapSm}>
              <View style={styles.barRow}>
                <Text variant="caption" weight="bold" color={colors.textMuted} style={styles.barLabel}>Estimado</Text>
                <ProgressBar value={estimateSeconds / scale} color={colors.blue} height={10} style={styles.flex} />
              </View>
              <View style={styles.barRow}>
                <Text variant="caption" weight="bold" color={colors.textMuted} style={styles.barLabel}>Real</Text>
                <ProgressBar value={real / scale} over={over} height={10} style={styles.flex} />
              </View>
            </View>
            <Text variant="label" color={over ? colors.danger : colors.textSecondary}>
              {formatMinutes(task.estimateMinutes)} est. · {formatDuration(real)} real
              {pct !== null ? ` · ${pct >= 100 ? `+${pct - 100}` : `${pct}`} %${pct < 100 ? ' usado' : ''}` : ''}
            </Text>
          </Card>

          {statuses.length > 1 && (
            <Card style={styles.gap}>
              <Text variant="heading">Mover a</Text>
              <View style={styles.wrapRow}>
                {statuses.map(s => {
                  const current = s.id === task.statusId;
                  return (
                    <Pressable
                      key={s.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: current, disabled: current }}
                      disabled={current}
                      onPress={() => { tap(); void move(s.id); }}
                      style={[styles.statusBtn, current && styles.statusBtnCurrent]}
                    >
                      <View style={[styles.dot, { backgroundColor: s.color }]} />
                      <Text variant="label" weight="black" color={current ? colors.accent : colors.blue}>{s.name}</Text>
                      {current && <Feather name="check" size={15} color={colors.accent} />}
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          )}

          {story && (
            <Card style={styles.gap}>
              <View style={styles.row}>
                <Feather name="book-open" size={18} color={colors.blue} />
                <Text variant="heading" style={styles.flex}>{story.title}</Text>
              </View>
              {(story.asA || story.iWant) && (
                <Text variant="body" color={colors.textSecondary}>
                  <Text weight="black">Como</Text> {story.asA}, <Text weight="black">quiero</Text> {story.iWant}
                  {story.soThat ? <>, <Text weight="black">para</Text> {story.soThat}</> : null}.
                </Text>
              )}
              {story.criteria.length > 0 && (
                <View style={styles.gapSm}>
                  <Text variant="overline" color={colors.textSecondary}>Criterios de aceptación</Text>
                  {story.criteria.map((c, i) => (
                    <View key={i} style={styles.criterion}>
                      <Feather name="check-circle" size={16} color={colors.teal} style={styles.criterionIcon} />
                      <Text variant="caption" style={styles.flex}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          )}

          {nfrs.length > 0 && (
            <Card style={styles.gap}>
              <Text variant="heading">Requisitos no funcionales</Text>
              {nfrs.map(n => {
                const on = trackingHere && mine?.nfrId === n.id;
                return (
                  <View key={n.id} style={[styles.nfr, on && styles.nfrOn]}>
                    <Pill label={NFR_LABEL[n.type]} tone={n.type === 'security' ? 'danger' : 'blue'} />
                    <Text variant="caption" weight="bold" style={styles.flex} numberOfLines={2}>{n.description}</Text>
                    <Text variant="caption" weight="black" color={colors.textMuted} style={styles.mono}>{formatDuration(nfrSeconds(snapshot.sessions, n.id, now))}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={on ? `Pausar ${n.description}` : `Trackear ${n.description}`}
                      onPress={() => { tap(); void toggleTimer(n.id); }}
                      style={[styles.nfrPlay, on && { backgroundColor: colors.accent }]}
                    >
                      <Feather name={on ? 'pause' : 'play'} size={16} color="#ffffff" />
                    </Pressable>
                  </View>
                );
              })}
            </Card>
          )}

          <IssuesCard taskId={task.id} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 12 }]}>
        {isDone ? (
          <View style={styles.doneNote}>
            <Feather name="check-circle" size={20} color={colors.teal} />
            <Text variant="label" color={colors.teal}>Tarea terminada · {formatDuration(real)} registrados</Text>
          </View>
        ) : (
          <View style={styles.row}>
            <Button
              label={trackingHere ? (mine?.nfrId ? 'Trackear la tarea' : 'Pausar') : real > 0 ? 'Reanudar cronómetro' : 'Iniciar cronómetro'}
              icon={trackingHere && !mine?.nfrId ? 'pause' : 'play'}
              variant={trackingHere && !mine?.nfrId ? 'secondary' : 'primary'}
              size="lg"
              loading={busy === 'timer'}
              onPress={() => void toggleTimer(null)}
              style={styles.flex}
            />
            <Button label="Finalizar" icon="check" variant="outline" size="lg" loading={busy === 'finish'} onPress={() => void finish()} />
          </View>
        )}
      </View>
    </Backdrop>
  );
}

/** Incidencias de la tarea (tabla `issue_logs`): problema, diagnóstico y solución. */
function IssuesCard({ taskId }: { taskId: string }) {
  const { loadIssueLogs, addIssueLog } = useWorkspace();
  const toast = useToast();
  const [logs, setLogs] = useState<IssueLog[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [solution, setSolution] = useState('');
  const [saving, setSaving] = useState(false);
  const now = useNow(true, 60_000);

  useEffect(() => {
    let alive = true;
    loadIssueLogs(taskId).then(
      list => { if (alive) { setLogs(list); setFailed(false); } },
      () => { if (alive) { setLogs([]); setFailed(true); } },
    );
    return () => { alive = false; };
  }, [loadIssueLogs, taskId]);

  const save = async () => {
    if (!problem.trim()) {
      toast('Describe al menos el problema.', 'error');
      return;
    }
    setSaving(true);
    try {
      const log = await addIssueLog({ taskId, problem: problem.trim(), diagnosis: diagnosis.trim(), solution: solution.trim() });
      setLogs(cur => [...(cur ?? []), log]);
      setProblem('');
      setDiagnosis('');
      setSolution('');
      setOpen(false);
      success();
      toast('Incidencia registrada', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.gap}>
      <View style={styles.row}>
        <Text variant="heading" style={styles.flex}>Incidencias{logs && logs.length ? ` (${logs.length})` : ''}</Text>
        {!open && <Button label="Registrar" icon="plus" size="sm" variant="outline" onPress={() => setOpen(true)} />}
      </View>
      {logs === null ? (
        <ActivityIndicator color={colors.blue} />
      ) : failed ? (
        <Text variant="caption" color={colors.textMuted}>No se pudieron cargar las incidencias (¿sin conexión?).</Text>
      ) : logs.length === 0 && !open ? (
        <Text variant="caption" color={colors.textMuted}>Sin incidencias. Si algo te bloquea, regístralo para no olvidarlo.</Text>
      ) : (
        logs.map(l => (
          <View key={l.id} style={styles.issue}>
            <View style={styles.row}>
              <Feather name="alert-triangle" size={15} color={colors.gold} />
              <Text variant="label" style={styles.flex}>{l.problem}</Text>
              <Text variant="caption" color={colors.textMuted}>{relativeTime(l.at, now)}</Text>
            </View>
            {l.diagnosis ? <Text variant="caption" color={colors.textSecondary}><Text variant="caption" weight="black">Diagnóstico: </Text>{l.diagnosis}</Text> : null}
            {l.solution ? <Text variant="caption" color={colors.teal}><Text variant="caption" weight="black" color={colors.teal}>Solución: </Text>{l.solution}</Text> : null}
          </View>
        ))
      )}
      {open && (
        <View style={styles.gap}>
          <Field label="Problema" value={problem} onChangeText={setProblem} placeholder="¿Qué pasó?" multiline />
          <Field label="Diagnóstico (opcional)" value={diagnosis} onChangeText={setDiagnosis} placeholder="¿Por qué pasó?" multiline />
          <Field label="Solución (opcional)" value={solution} onChangeText={setSolution} placeholder="¿Cómo se resolvió?" multiline />
          <View style={styles.row}>
            <Button label="Cancelar" variant="ghost" onPress={() => setOpen(false)} />
            <Button label="Guardar incidencia" icon="save" loading={saving} onPress={() => void save()} style={styles.flex} />
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16 },
  scroll: { padding: 16, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  gap: { gap: 12 },
  gapSm: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  person: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10, paddingLeft: 2, paddingVertical: 2,
    borderRadius: radius.pill, backgroundColor: colors.cardSubtle,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 64 },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 44, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.blue, backgroundColor: '#ffffff', boxShadow: '0px 3px 0px #1b3bd6',
  },
  statusBtnCurrent: { borderColor: colors.accentBright, backgroundColor: colors.accentSubtle, boxShadow: 'none' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  criterion: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  criterionIcon: { marginTop: 1 },
  nfr: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.md,
    backgroundColor: colors.cardSubtle, borderWidth: 1.5, borderColor: colors.borderInner,
  },
  nfrOn: { borderColor: colors.accentBright, backgroundColor: '#fff6fa' },
  nfrPlay: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  mono: { fontVariant: ['tabular-nums'] },
  issue: { gap: 4, padding: 12, borderRadius: radius.md, backgroundColor: '#fffaf0', borderWidth: 1.5, borderColor: '#f3dfa6' },
  dock: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#ffffff', borderTopWidth: 3, borderTopColor: colors.border,
  },
  doneNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50 },
});
