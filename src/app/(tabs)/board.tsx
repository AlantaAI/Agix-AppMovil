import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList, LayoutAnimation, Pressable, RefreshControl, ScrollView, StyleSheet, View,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useWorkspace } from '@/data/WorkspaceProvider';
import type { Status } from '@/data/types';
import {
  activeSessionOf, assigneesOf, currentSprint, filterBySprint, groupProjects, projectProgress, projectSprints,
  projectStatuses, runningTaskIds, tasksInStatus, type SprintFilter,
} from '@/domain/board';
import { taskRealSeconds } from '@/domain/time';
import { useNow } from '@/hooks/useNow';
import { AppHeader } from '@/ui/AppHeader';
import { Backdrop } from '@/ui/Backdrop';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { ProgressBar } from '@/ui/ProgressBar';
import { Sheet } from '@/ui/Sheet';
import { EmptyState, LoadingState, OfflineBanner } from '@/ui/States';
import { TaskCard } from '@/ui/TaskCard';
import { Text } from '@/ui/Text';
import { colors, radius } from '@/ui/theme';
import { useToast } from '@/ui/Toast';
import { success, tap, warning } from '@/ui/haptics';

export default function BoardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { snapshot, loadState, offline, refreshing, refresh, activeProjectId, setActiveProject, moveTask } = useWorkspace();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const pager = useRef<FlatList<Status>>(null);

  const project = snapshot?.projects.find(p => p.id === activeProjectId) ?? null;
  const statuses = useMemo(() => (snapshot && project ? projectStatuses(snapshot.statuses, project.id) : []), [snapshot, project]);
  const sprints = useMemo(() => (snapshot && project ? projectSprints(snapshot.sprints, project.id) : []), [snapshot, project]);

  // Al abrir un proyecto se enfoca el sprint en curso (el primero con trabajo pendiente)
  // y la columna «En proceso» (la segunda), que es donde se trabaja desde el móvil.
  const [sprint, setSprint] = useState<SprintFilter>('all');
  const sprintFor = useRef<string | null>(null);
  const needsSync = useRef(false);
  useEffect(() => {
    if (!snapshot || !project || sprintFor.current === project.id) return;
    sprintFor.current = project.id;
    setSprint(currentSprint(snapshot, project.id));
    setPage(statuses.length > 1 ? 1 : 0);
    setExpanded(null);
    needsSync.current = true;
  }, [snapshot, project, statuses.length]);

  // Coloca el carrusel sin animación tras cambiar de proyecto o de ancho; los
  // toques en las pestañas animan su propio desplazamiento.
  useEffect(() => { needsSync.current = true; }, [width]);
  useEffect(() => {
    if (!needsSync.current || width === 0 || statuses.length === 0) return;
    needsSync.current = false;
    pager.current?.scrollToOffset({ offset: page * width, animated: false });
  }, [width, page, statuses.length]);

  const projectTasks = useMemo(
    () => (snapshot && project ? filterBySprint(snapshot.tasks.filter(t => t.projectId === project.id), sprint) : []),
    [snapshot, project, sprint],
  );
  const live = useMemo(() => (snapshot ? runningTaskIds(snapshot.sessions) : new Set<string>()), [snapshot]);
  const myActive = snapshot ? activeSessionOf(snapshot.sessions, snapshot.userId) : null;
  const now = useNow(live.size > 0, 15_000);

  const goTo = (index: number) => {
    tap();
    setPage(index);
    setExpanded(null);
    pager.current?.scrollToOffset({ offset: index * width, animated: true });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== page) {
      setPage(index);
      setExpanded(null);
    }
  };

  const handleMove = useCallback(async (taskId: string, statusId: string) => {
    const name = statuses.find(s => s.id === statusId)?.name ?? '';
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(null);
    const result = await moveTask(taskId, statusId);
    if (result.ok) {
      success();
      toast(`Movida a «${name}»`, 'success');
    } else {
      warning();
      toast(result.message, 'error');
    }
  }, [moveTask, statuses, toast]);

  if (loadState === 'loading' && !snapshot) {
    return <Backdrop><AppHeader title="Tablero" /><LoadingState message="Cargando el tablero…" /></Backdrop>;
  }

  if (!snapshot || !project) {
    return (
      <Backdrop>
        <AppHeader title="Tablero" />
        <View style={styles.pad}>
          <EmptyState icon="columns" title="No hay un proyecto abierto" message="Elige un proyecto en «Proyectos» para ver su tablero." />
        </View>
      </Backdrop>
    );
  }

  const progress = projectProgress(snapshot.tasks.filter(t => t.projectId === project.id), statuses);
  const sprintName = (id: string | null) => (id ? sprints.find(s => s.id === id)?.name : undefined);
  const hasLoose = sprints.length > 0 && snapshot.tasks.some(t => t.projectId === project.id && !t.sprintId);

  return (
    <Backdrop>
      <AppHeader
        title={project.name}
        subtitle={`${progress.done}/${progress.total} terminadas · ${progress.percent}%`}
        onTitlePress={() => setPickerOpen(true)}
      />

      {offline && <View style={styles.bannerWrap}><OfflineBanner fetchedAt={snapshot.fetchedAt} /></View>}

      {sprints.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.sprints}>
          <SprintChip label="Todos" active={sprint === 'all'} onPress={() => { tap(); setSprint('all'); }} />
          {sprints.map(s => (
            <SprintChip key={s.id} label={s.name} active={sprint === s.id} onPress={() => { tap(); setSprint(s.id); }} />
          ))}
          {hasLoose && <SprintChip label="Sin sprint" active={sprint === 'none'} onPress={() => { tap(); setSprint('none'); }} />}
        </ScrollView>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.columns}>
        {statuses.map((s, i) => {
          const count = projectTasks.filter(t => t.statusId === s.id).length;
          const active = i === page;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${s.name}, ${count} tareas`}
              onPress={() => goTo(i)}
              style={[styles.column, active && styles.columnActive]}
            >
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text variant="label" weight="black" color={active ? colors.accent : colors.text}>{s.name} · {count}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.flex} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <FlatList
            ref={pager}
            data={statuses}
            keyExtractor={s => s.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            extraData={[projectTasks, expanded, now, snapshot, sprint]}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            renderItem={({ item: status }) => {
              const tasks = tasksInStatus(projectTasks, status.id);
              return (
                <ScrollView
                  style={{ width }}
                  contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ffffff" colors={[colors.accent]} />}
                >
                  {tasks.length === 0 ? (
                    <Card tone="subtle" style={styles.emptyColumn}>
                      <Feather name="inbox" size={22} color={colors.textSecondary} />
                      <Text variant="label" color={colors.textSecondary} align="center">
                        No hay tareas en «{status.name}»{sprint !== 'all' ? ' para este filtro' : ''}.
                      </Text>
                    </Card>
                  ) : (
                    tasks.map(t => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        status={status}
                        statuses={statuses}
                        realSeconds={taskRealSeconds(t, snapshot.sessions, now)}
                        running={live.has(t.id)}
                        mine={myActive?.taskId === t.id}
                        assignees={assigneesOf(snapshot.assignments, t.id)}
                        people={snapshot.people}
                        sprintName={sprint === 'all' ? sprintName(t.sprintId) : undefined}
                        expanded={expanded === t.id}
                        onToggleMove={() => setExpanded(cur => (cur === t.id ? null : t.id))}
                        onMove={statusId => void handleMove(t.id, statusId)}
                        onOpen={() => router.push({ pathname: '/task/[id]', params: { id: t.id } })}
                      />
                    ))
                  )}
                </ScrollView>
              );
            }}
          />
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nueva tarea"
        onPress={() => {
          tap();
          router.push({ pathname: '/new-task', params: { projectId: project.id, statusId: statuses[page]?.id ?? '' } });
        }}
        style={({ pressed }) => [styles.fab, { bottom: 18, transform: [{ translateY: pressed ? 3 : 0 }] }]}
      >
        <Feather name="plus" size={28} color="#ffffff" />
      </Pressable>

      <Sheet visible={pickerOpen} title="Cambiar de proyecto" onClose={() => setPickerOpen(false)}>
        {groupProjects(snapshot.projects, snapshot.teams).map(section => (
          <View key={section.key} style={styles.pickSection}>
            <Text variant="overline" color={colors.textSecondary}>{section.title}</Text>
            {section.projects.map(p => {
              const pr = projectProgress(snapshot.tasks.filter(t => t.projectId === p.id), projectStatuses(snapshot.statuses, p.id));
              const selected = p.id === project.id;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    tap();
                    setActiveProject(p.id);
                    setPickerOpen(false);
                  }}
                  style={[styles.pick, selected && styles.pickSelected]}
                >
                  <View style={styles.flex}>
                    <View style={styles.pickRow}>
                      <Text variant="label" weight="black" numberOfLines={1} style={styles.flex}>{p.name}</Text>
                      {selected && <Pill label="Abierto" tone="accent" />}
                    </View>
                    <ProgressBar value={pr.percent / 100} height={6} style={styles.pickBar} />
                  </View>
                  <Text variant="label" weight="black" color={colors.accent}>{pr.percent}%</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Sheet>
    </Backdrop>
  );
}

function SprintChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.sprint, active && styles.sprintActive]}
    >
      <Text variant="caption" weight="black" color={active ? colors.blue : colors.onBg}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16 },
  bannerWrap: { paddingHorizontal: 16, paddingTop: 12 },
  strip: { flexGrow: 0, flexShrink: 0 },
  sprints: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  sprint: {
    paddingHorizontal: 14, height: 32, borderRadius: radius.pill, justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sprintActive: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  columns: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  column: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 42, borderRadius: radius.md,
    backgroundColor: '#ffffff', borderWidth: 2, borderColor: colors.border, boxShadow: '0px 3px 0px #1b3bd6',
  },
  columnActive: { backgroundColor: colors.accentSubtle, borderColor: colors.accentBright, boxShadow: '0px 3px 0px #c9186a' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  emptyColumn: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  fab: {
    position: 'absolute', right: 18, width: 62, height: 62, borderRadius: 31, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.accentBright,
    boxShadow: '0px 4px 0px #8f0f4b, 0px 10px 20px rgba(120, 10, 60, 0.35)',
  },
  pickSection: { gap: 8, marginBottom: 8 },
  pick: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.borderInner, backgroundColor: '#ffffff',
  },
  pickSelected: { borderColor: colors.accentBright, backgroundColor: '#fff6fa' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickBar: { marginTop: 8 },
});
