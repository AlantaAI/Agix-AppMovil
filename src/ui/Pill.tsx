import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, radius } from './theme';

type Tone = 'blue' | 'accent' | 'teal' | 'gold' | 'danger' | 'neutral';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: colors.iconBg, fg: colors.blue },
  accent: { bg: colors.accentSubtle, fg: colors.accent },
  teal: { bg: colors.tealSubtle, fg: colors.teal },
  gold: { bg: colors.goldSubtle, fg: colors.gold },
  danger: { bg: colors.dangerSubtle, fg: colors.danger },
  neutral: { bg: '#eef1f8', fg: colors.textMuted },
};

/** Etiqueta pequeña: estado, sprint, «en curso», «Equipo». `dot` pinta el color de la columna. */
export function Pill({ label, tone = 'blue', dot, pulse, style }: { label: string; tone?: Tone; dot?: string; pulse?: boolean; style?: ViewStyle }) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      {pulse && <View style={[styles.dot, { backgroundColor: t.fg }]} />}
      <Text variant="caption" weight="extrabold" color={t.fg} numberOfLines={1} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 12.5 },
});
