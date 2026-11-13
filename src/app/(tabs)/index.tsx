import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useWorkspace } from '@/data/WorkspaceProvider';
import type { Project, Snapshot } from '@/data/types';
import {
  activeSessionOf, doneStatusId, groupProjects, projectProgress, projectStatuses, runningTaskIds,
} from '@/domain/board';
import { firstName } from '@/domain/people';
import { formatClock, formatDuration, startOfDay, taskRealSeconds, userSecondsSince } from '@/domain/time';
import { useNow } from '@/hooks/useNow';
import { WEB_URL } from '@/lib/env';
import { AppHeader } from '@/ui/AppHeader';
import { Avatar } from '@/ui/Avatar';
import { Backdrop } from '@/ui/Backdrop';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { ProgressBar } from '@/ui/ProgressBar';
import { EmptyState, LoadingState, OfflineBanner } from '@/ui/States';
import { Text } from '@/ui/Text';
import { colors } from '@/ui/theme';
import { tap } from '@/ui/haptics';

export default function ProjectsScreen() {
  const router = useRouter();
  const { snapshot, loadState, offline, error, refreshing, refresh, activeProjectId, setActiveProject } = useWorkspace();
  const active = snapshot ? activeSessionOf(snapshot.sessions, snapshot.userId) : null;
  const now = useNow(!!active);
  const me = snapshot?.people[snapshot.userId];

  const sections = useMemo(() => (snapshot ? groupProjects(snapshot.projects, snapshot.teams) : []), [snapshot]);

  const openProject = (p: Project) => {
    setActiveProject(p.id);
    router.navigate('/board');
  };

  return (
    <Backdrop>
      <AppHeader
        title="Mis proyectos"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Ir a mi perfil" onPress={() => { tap(); router.navigate('/profile'); }}>
            <Avatar id={snapshot?.userId ?? 'yo'} person={me} size={38} />
          </Pressable>
        }
      />
      {loadState === 'loading' && !snapshot ? (
        <LoadingState />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ffffff" colors={[colors.accent]} />}
        >
          {offline && snapshot && <OfflineBanner fetchedAt={snapshot.fetchedAt} />}
          {error && !offline && (
            <Card tone="subtle" style={styles.errorCard}>
              <Text variant="label" color={colors.danger}>No se pudo actualizar: {error}</Text>
            </Card>
          )}

          {snapshot && (
            <Today snapshot={snapshot} now={now} name={firstName(me)} onOpenTimer={() => router.navigate('/timer')} />
          )}

          {snapshot && snapshot.projects.length === 0 && (
            <EmptyState
              icon="folder-plus"
              title="Aún no tienes proyectos"
              message="Créalos en la web con el asistente de IA; aquí aparecerán al instante para trabajar desde el móvil."
              action={<Button label="Abrir Agix web" icon="external-link" variant="outline" onPress={() => void WebBrowser.openBrowserAsync(WEB_URL)} />}
            />
          )}

          {snapshot && sections.map(section => (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionHead}>
                <Feather name={section.isTeam ? 'users' : 'user'} size={14} color={colors.onBgMuted} />
                <Text variant="overline" color={colors.onBg}>{section.title}</Text>
              </View>
              {section.projects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  snapshot={snapshot}
                  isTeam={section.isTeam}
                  selected={p.id === activeProjectId}
                  running={!!active && snapshot.tasks.some(t => t.id === active.taskId && t.projectId === p.id)}
                  onPress={() => openProject(p)}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </Backdrop>
  );
}

/** Resumen del día: tiempo registrado hoy y, si corre, el cronómetro. */
function Today({ snapshot, now, name, onOpenTimer }: { snapshot: Snapshot; now: number; name: string; onOpenTimer: () => void }) {
  const today = userSecondsSince(snapshot.sessions, snapshot.userId, startOfDay(now), now);
  const mine = new Set(snapshot.assignments.filter(a => a.userId === snapshot.userId).map(a => a.taskId));
  const open = snapshot.tasks.filter(t => {
    if (!mine.has(t.id)) return false;
    return t.statusId !== doneStatusId(projectStatuses(snapshot.statuses, t.projectId));
  }).length;
  const active = activeSessionOf(snapshot.sessions, snapshot.userId);
  const task = active ? snapshot.tasks.find(t => t.id === active.taskId) : undefined;

  return (
    <View style={styles.today}>
      <Text variant="title" color={colors.onBg}>{name ? `Hola, ${name}` : 'Hola'} 👋</Text>
      <View style={styles.stats}>
        <Stat icon="clock" value={formatDuration(today)} label="registrado hoy" />
        <Stat icon="check-square" value={String(open)} label={open === 1 ? 'tarea tuya abierta' : 'tareas tuyas abiertas'} />
      </View>
      {active && task && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Cronómetro en marcha: ${task.name}`} onPress={() => { tap(); onOpenTimer(); }}>
          <Card tone="accent" style={styles.live}>
            <View style={styles.liveDot} />
            <View style={styles.flex}>
              <Text variant="overline" color={colors.accent}>Trackeando ahora</Text>
              <Text variant="label" numberOfLines={1}>{task.name}</Text>
            </View>
            <Text variant="heading" weight="black" color={colors.accent} style={styles.mono}>
              {formatClock(taskRealSeconds(task, snapshot.sessions, now))}
            </Text>
            <Feather name="chevron-right" size={20} color={colors.accent} />
          </Card>
        </Pressable>
      )}
    </View>
  );
}

function Stat({ icon, value, label }: { icon: 'clock' | 'check-square'; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}><Feather name={icon} size={16} color="#ffffff" /></View>
      <View>
        <Text variant="heading" weight="black" color={colors.onBg}>{value}</Text>
        <Text variant="caption" color={colors.onBgMuted}>{label}</Text>
      </View>
    </View>
  );
}

function ProjectCard({
  project, snapshot, isTeam, selected, running, onPress,
}: { project: Project; snapshot: Snapshot; isTeam: boolean; selected: boolean; running: boolean; onPress: () => void }) {
  const statuses = projectStatuses(snapshot.statuses, project.id);
  const tasks = snapshot.tasks.filter(t => t.projectId === project.id);
  const progress = projectProgress(tasks, statuses);
  const live = runningTaskIds(snapshot.sessions);
  const inProgress = tasks.filter(t => live.has(t.id)).length;
  const sprints = snapshot.sprints.filter(s => s.projectId === project.id).length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${project.name}. ${progress.done} de ${progress.total} tareas completadas, ${progress.percent} por ciento`}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [{ transform: [{ translateY: pressed ? 3 : 0 }] }]}
    >
      <Card style={[styles.project, selected && styles.projectSelected]}>
        <View style={styles.projectHead}>
          <Text variant="heading" numberOfLines={1} style={styles.flex}>{project.name}</Text>
          {isTeam && <Pill label="Equipo" tone="accent" />}
        </View>
        <View style={styles.projectMeta}>
          <Text variant="caption" color={colors.textMuted}>
            {progress.done}/{progress.total} completadas
            {sprints > 0 ? ` · ${sprints} sprint${sprints === 1 ? '' : 's'}` : ''}
          </Text>
          <Text variant="label" weight="black" color={colors.accent}>{progress.percent}%</Text>
        </View>
        <ProgressBar value={progress.percent / 100} />
        {(running || inProgress > 0) && (
          <View style={styles.projectFoot}>
            <Pill label={running ? 'Tu cronómetro corre aquí' : `${inProgress} en curso`} tone="teal" pulse />
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  errorCard: { padding: 12 },
  today: { gap: 12 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)',
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accentBright },
  mono: { fontVariant: ['tabular-nums'] },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  project: { gap: 10 },
  projectSelected: { borderColor: colors.accentBright },
  projectHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  projectMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectFoot: { flexDirection: 'row' },
});
