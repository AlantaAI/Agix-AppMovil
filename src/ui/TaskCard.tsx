import { memo } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Person, Status, Task } from '@/data/types';
import { formatDuration, formatMinutes, isOverEstimate } from '@/domain/time';
import { AvatarStack } from './Avatar';
import { Card } from './Card';
import { Pill } from './Pill';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';
import { colors, radius } from './theme';
import { tap } from './haptics';

interface TaskCardProps {
  task: Task;
  status: Status | undefined;
  statuses: Status[];
  realSeconds: number;
  running: boolean;
  /** El cronómetro que corre es el de la persona (no el de un compañero). */
  mine: boolean;
  assignees: string[];
  people: Record<string, Person>;
  sprintName?: string;
  expanded: boolean;
  onToggleMove: () => void;
  onMove: (statusId: string) => void;
  onOpen: () => void;
}

/**
 * Tarjeta del tablero móvil (HU-44). En el móvil no se arrastra: «Mover a»
 * despliega las otras columnas como botones grandes, cómodos con el pulgar.
 */
export const TaskCard = memo(function TaskCard({
  task, status, statuses, realSeconds, running, mine, assignees, people, sprintName, expanded, onToggleMove, onMove, onOpen,
}: TaskCardProps) {
  const over = isOverEstimate(realSeconds, task.estimateMinutes, 1);
  const ratio = task.estimateMinutes > 0 ? realSeconds / (task.estimateMinutes * 60) : 0;
  const targets = statuses.filter(s => s.id !== task.statusId);

  return (
    <Card tone={expanded ? 'accent' : 'default'} padded={false} style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${task.name}. ${formatDuration(realSeconds)} de ${formatMinutes(task.estimateMinutes)}. Abrir detalle`}
        onPress={() => { tap(); onOpen(); }}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <Pill label={status?.name ?? 'Sin columna'} tone="neutral" dot={status?.color} />
          {sprintName ? <Pill label={sprintName} tone="blue" /> : null}
          <View style={styles.flex} />
          {running && <Pill label={mine ? 'en curso' : 'otro en curso'} tone="teal" pulse />}
        </View>
        <Text variant="heading" style={styles.title}>{task.name}</Text>
        <ProgressBar value={ratio} over={over} track="#dbe4fb" color={colors.accent} height={7} />
      </Pressable>
      {/* El pie va fuera del área tocable de la tarjeta: «Mover» no puede ser un botón dentro de otro. */}
      <View style={styles.foot}>
        <Pressable accessible={false} onPress={() => { tap(); onOpen(); }} style={styles.footInfo}>
          <Text variant="caption" weight="bold" color={over ? colors.danger : colors.textMuted}>
            {formatDuration(realSeconds)}
            <Text variant="caption" color={colors.textMuted}> / {formatMinutes(task.estimateMinutes)}</Text>
          </Text>
          <View style={styles.flex} />
          {assignees.length > 0 && <AvatarStack ids={assignees} people={people} size={26} />}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Cerrar mover a' : 'Mover a otra columna'}
          accessibilityState={{ expanded }}
          hitSlop={8}
          onPress={() => {
            tap();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onToggleMove();
          }}
          style={[styles.moveBtn, expanded && styles.moveBtnOn]}
        >
          <Feather name={expanded ? 'x' : 'corner-up-right'} size={16} color={expanded ? '#ffffff' : colors.blue} />
          <Text variant="caption" weight="black" color={expanded ? '#ffffff' : colors.blue}>{expanded ? 'Cerrar' : 'Mover'}</Text>
        </Pressable>
      </View>
      {expanded && (
        <View style={styles.movePanel}>
          <Text variant="overline" color={colors.textSecondary}>Mover a</Text>
          <View style={styles.targets}>
            {targets.map((s, i) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityLabel={`Mover a ${s.name}`}
                onPress={() => onMove(s.id)}
                style={({ pressed }) => [
                  styles.target,
                  i === targets.length - 1 && s.id === statuses[statuses.length - 1]?.id && styles.targetDone,
                  pressed && { transform: [{ translateY: 2 }] },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                <Text variant="label" weight="black" numberOfLines={1}
                  color={s.id === statuses[statuses.length - 1]?.id ? colors.accent : colors.blue}>
                  {s.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  body: { padding: 14, paddingBottom: 10, gap: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  footInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  pressed: { backgroundColor: '#f5f8ff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  title: { fontSize: 16.5 },
  moveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 32,
    borderRadius: radius.pill, backgroundColor: colors.iconBg,
  },
  moveBtnOn: { backgroundColor: colors.accent },
  movePanel: {
    margin: 10, marginTop: 0, padding: 12, gap: 10, borderRadius: radius.md,
    backgroundColor: colors.cardSubtle, borderWidth: 1.5, borderColor: colors.borderInner,
  },
  targets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  target: {
    flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 48, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: '#ffffff',
    borderWidth: 2, borderColor: colors.blue, boxShadow: '0px 3px 0px #1b3bd6',
  },
  targetDone: { borderColor: colors.accentBright, backgroundColor: colors.accentSubtle, boxShadow: '0px 3px 0px #c9186a' },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
