import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useWorkspace } from '@/data/WorkspaceProvider';
import type { Estimate } from '@/data/types';
import { currentSprint, projectSprints, projectStatuses } from '@/domain/board';
import { estimateSource, parseHoursInput } from '@/domain/estimate';
import { formatMinutes } from '@/domain/time';
import { AppHeader } from '@/ui/AppHeader';
import { Backdrop } from '@/ui/Backdrop';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { EmptyState } from '@/ui/States';
import { Text } from '@/ui/Text';
import { colors, radius } from '@/ui/theme';
import { useToast } from '@/ui/Toast';
import { success, tap, warning } from '@/ui/haptics';

export default function NewTaskScreen() {
  const params = useLocalSearchParams<{ projectId?: string; statusId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { snapshot, createTask, estimate, offline } = useWorkspace();
  const project = snapshot?.projects.find(p => p.id === params.projectId);
  const statuses = useMemo(() => (snapshot && project ? projectStatuses(snapshot.statuses, project.id) : []), [snapshot, project]);
  const sprints = useMemo(() => (snapshot && project ? projectSprints(snapshot.sprints, project.id) : []), [snapshot, project]);
  const stories = useMemo(
    () => (snapshot && project ? snapshot.stories.filter(s => s.projectId === project.id).sort((a, b) => a.order - b.order) : []),
    [snapshot, project],
  );

  const [name, setName] = useState('');
  const [hours, setHours] = useState('');
  const [statusId, setStatusId] = useState(params.statusId && statuses.some(s => s.id === params.statusId) ? params.statusId : statuses[0]?.id ?? '');
  const [sprintId, setSprintId] = useState<string | null>(() => {
    if (!snapshot || !project) return null;
    const cur = currentSprint(snapshot, project.id);
    return cur === 'all' || cur === 'none' ? null : cur;
  });
  const [storyId, setStoryId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Estimate | null>(null);
  const [asking, setAsking] = useState(false);
  const [asked, setAsked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; hours?: string }>({});

  const close = () => (router.canGoBack() ? router.back() : router.navigate('/board'));

  if (!snapshot || !project) {
    return (
      <Backdrop>
        <AppHeader title="Nueva tarea" onBack={close} />
        <View style={styles.pad}>
          <EmptyState icon="alert-circle" title="Elige un proyecto" message="Abre un proyecto en el tablero para crear tareas en él." />
        </View>
      </Backdrop>
    );
  }

  const story = stories.find(s => s.id === storyId);

  const ask = async () => {
    if (!name.trim()) {
      setErrors({ name: 'Escribe primero el título: la IA estima a partir de él.' });
      warning();
      return;
    }
    setAsking(true);
    setAsked(true);
    const result = await estimate(name.trim(), story?.title);
    setAsking(false);
    setSuggestion(result);
    if (result) {
      success();
      if (!hours.trim()) setHours(formatMinutes(result.minutes));
    }
  };

  const save = async () => {
    const minutes = parseHoursInput(hours);
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'El título es obligatorio.';
    if (minutes === null) next.hours = 'Escribe las horas, por ejemplo «2», «1.5» o «1h 30m».';
    setErrors(next);
    if (next.name || next.hours || minutes === null) {
      warning();
      return;
    }
    setSaving(true);
    try {
      await createTask({
        projectId: project.id, name: name.trim(), estimateMinutes: minutes, statusId, sprintId, storyId,
        estimate: suggestion,
      });
      success();
      toast(`Tarea «${name.trim()}» creada`, 'success');
      close();
    } catch (e) {
      warning();
      toast((e as Error).message, 'error');
      setSaving(false);
    }
  };

  return (
    <Backdrop>
      <AppHeader title="Nueva tarea" subtitle={project.name} onBack={close} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]} keyboardShouldPersistTaps="handled">
          <Card style={styles.gap}>
            <Field
              label="Título"
              value={name}
              onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: undefined })); setSuggestion(null); setAsked(false); }}
              placeholder="Ej.: Enviar notificaciones de reserva"
              error={errors.name}
              autoFocus
              returnKeyType="done"
            />

            <Chips
              label="Columna"
              items={statuses.map(s => ({ id: s.id, label: s.name, dot: s.color }))}
              value={statusId}
              onChange={v => setStatusId(v ?? statuses[0]?.id ?? '')}
            />
            {sprints.length > 0 && (
              <Chips
                label="Sprint"
                items={[{ id: null, label: 'Sin sprint' }, ...sprints.map(s => ({ id: s.id, label: s.name }))]}
                value={sprintId}
                onChange={setSprintId}
              />
            )}
            {stories.length > 0 && (
              <Chips
                label="Historia de usuario (opcional)"
                items={[{ id: null, label: 'Ninguna' }, ...stories.map(s => ({ id: s.id, label: s.title }))]}
                value={storyId}
                onChange={v => { setStoryId(v); setSuggestion(null); setAsked(false); }}
              />
            )}
          </Card>

          <Card style={styles.gap}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="heading">Estimación</Text>
                <Text variant="caption" color={colors.textMuted}>Escríbela tú o pide una sugerencia a la IA de Agix.</Text>
              </View>
            </View>
            <Field
              label="Horas estimadas"
              value={hours}
              onChangeText={t => { setHours(t); setErrors(e => ({ ...e, hours: undefined })); }}
              placeholder="2, 1.5 o 1h 30m"
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              error={errors.hours}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sugerir horas con IA"
              disabled={asking || offline}
              onPress={() => { tap(); void ask(); }}
              style={({ pressed }) => [styles.ai, (asking || offline) && styles.aiDisabled, pressed && { transform: [{ translateY: 2 }] }]}
            >
              {asking ? <ActivityIndicator color={colors.accent} /> : <Feather name="zap" size={18} color={colors.accent} />}
              <Text variant="label" weight="black" color={colors.accent}>
                {asking ? 'Estimando…' : offline ? 'La IA necesita conexión' : 'Sugerir con IA'}
              </Text>
            </Pressable>
            {suggestion && (
              <View style={styles.suggestion}>
                <View style={styles.flex}>
                  <Text variant="label" weight="black">≈ {formatMinutes(suggestion.minutes)}</Text>
                  {suggestion.bandLowMinutes !== null && suggestion.bandHighMinutes !== null && (
                    <Text variant="caption" color={colors.textMuted}>
                      Rango probable {formatMinutes(suggestion.bandLowMinutes)} – {formatMinutes(suggestion.bandHighMinutes)}
                    </Text>
                  )}
                  <Text variant="caption" weight="bold" color={colors.textSecondary}>{estimateSource(suggestion)}</Text>
                </View>
                <Button label="Usar" size="sm" variant="outline" onPress={() => setHours(formatMinutes(suggestion.minutes))} />
              </View>
            )}
            {asked && !asking && !suggestion && (
              <Text variant="caption" color={colors.gold}>
                La IA no respondió ahora (puede estar despertando). Escribe tu estimación o vuelve a intentarlo en un momento.
              </Text>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 12 }]}>
        <Button label="Crear tarea" icon="plus" size="lg" full loading={saving} disabled={offline} onPress={() => void save()} />
      </View>
    </Backdrop>
  );
}

interface ChipItem { id: string | null; label: string; dot?: string }

function Chips({ label, items, value, onChange }: { label: string; items: ChipItem[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <View style={styles.gapSm}>
      <Text variant="label">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.chips}>
        {items.map(it => {
          const on = it.id === value;
          return (
            <Pressable
              key={it.id ?? 'none'}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => { tap(); onChange(it.id); }}
              style={[styles.chip, on && styles.chipOn]}
            >
              {it.dot && <View style={[styles.dot, { backgroundColor: it.dot }]} />}
              <Text variant="caption" weight="black" color={on ? colors.accent : colors.blue} numberOfLines={1} style={styles.chipText}>
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16 },
  scroll: { padding: 16, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  gap: { gap: 16 },
  gapSm: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  strip: { flexGrow: 0 },
  chips: { gap: 8, paddingRight: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: radius.pill,
    borderWidth: 2, borderColor: colors.borderInner, backgroundColor: '#ffffff', maxWidth: 260,
  },
  chipOn: { borderColor: colors.accentBright, backgroundColor: colors.accentSubtle },
  chipText: { flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ai: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: radius.md,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.accentBright, backgroundColor: '#fff6fa',
  },
  aiDisabled: { opacity: 0.6 },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md,
    backgroundColor: colors.cardSubtle, borderWidth: 1.5, borderColor: colors.borderInner,
  },
  dock: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#ffffff', borderTopWidth: 3, borderTopColor: colors.border,
  },
});
