import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AgixMark } from './Logo';
import { Text } from './Text';
import { colors } from './theme';
import { tap } from './haptics';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** Si se pasa, el título se vuelve un selector (p. ej. cambiar de proyecto). */
  onTitlePress?: () => void;
  onBack?: () => void;
}

/** Barra blanca superior con el logo, como en los mockups del OB2. */
export function AppHeader({ title, subtitle, right, onTitlePress, onBack }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const titleBlock = (
    <View style={styles.titleBlock}>
      <View style={styles.titleRow}>
        <Text variant="title" numberOfLines={1} style={styles.title}>{title}</Text>
        {onTitlePress && <Feather name="chevron-down" size={20} color={colors.blue} />}
      </View>
      {subtitle ? <Text variant="caption" color={colors.textMuted} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
  );
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" hitSlop={10} onPress={() => { tap(); onBack(); }} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.blue} />
        </Pressable>
      ) : (
        <AgixMark size={32} />
      )}
      {onTitlePress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}. Cambiar de proyecto`}
          onPress={() => { tap(); onTitlePress(); }}
          style={({ pressed }) => [styles.flex, pressed && { opacity: 0.7 }]}
        >
          {titleBlock}
        </Pressable>
      ) : (
        <View style={styles.flex}>{titleBlock}</View>
      )}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 3,
    borderBottomColor: colors.border,
  },
  back: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.iconBg },
  flex: { flex: 1, minWidth: 0 },
  titleBlock: { minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { flexShrink: 1, fontSize: 20 },
});
