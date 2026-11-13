import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius } from './theme';
import { tap } from './haptics';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: ComponentProps<typeof Feather>['name'];
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const PALETTE: Record<Variant, { bg: string; fg: string; border: string; shadow: string }> = {
  primary: { bg: colors.accent, fg: '#ffffff', border: colors.accentBright, shadow: '0px 4px 0px #8f0f4b' },
  secondary: { bg: colors.blue, fg: '#ffffff', border: colors.blue, shadow: '0px 4px 0px #0c1f7a' },
  outline: { bg: '#ffffff', fg: colors.blue, border: colors.blue, shadow: '0px 3px 0px #1b3bd6' },
  ghost: { bg: 'transparent', fg: colors.blue, border: 'transparent', shadow: 'none' },
  danger: { bg: '#ffffff', fg: colors.danger, border: colors.danger, shadow: '0px 3px 0px #8f1c13' },
};

const SIZES: Record<Size, { h: number; px: number; font: number; icon: number }> = {
  sm: { h: 38, px: 14, font: 14, icon: 15 },
  md: { h: 48, px: 18, font: 15.5, icon: 17 },
  lg: { h: 58, px: 22, font: 17, icon: 20 },
};

/** Botón con el «hundido» de la web: al pulsarlo baja sobre su sombra dura. */
export function Button({
  label, onPress, variant = 'primary', size = 'md', icon, loading, disabled, full, style, accessibilityHint,
}: ButtonProps) {
  const press = useState(() => new Animated.Value(0))[0];
  const p = PALETTE[variant];
  const s = SIZES[size];
  const inactive = disabled || loading;

  const animate = (to: number) =>
    Animated.spring(press, { toValue: to, useNativeDriver: true, speed: 40, bounciness: to ? 0 : 8 }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[full && styles.full, style]}
    >
      <Animated.View
        style={[
          styles.base,
          {
            height: s.h,
            paddingHorizontal: s.px,
            backgroundColor: p.bg,
            borderColor: p.border,
            boxShadow: p.shadow,
            opacity: disabled ? 0.5 : 1,
            transform: [
              { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) },
              { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) },
            ],
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={p.fg} />
        ) : (
          <View style={styles.row}>
            {icon && <Feather name={icon} size={s.icon} color={p.fg} />}
            <Text weight="extrabold" color={p.fg} style={{ fontSize: s.font }} numberOfLines={1}>
              {label}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Botón redondo solo con ícono (cabeceras, filas). */
export function IconButton({
  icon, onPress, label, tone = 'blue', size = 40,
}: { icon: ComponentProps<typeof Feather>['name']; onPress?: () => void; label: string; tone?: 'blue' | 'accent' | 'light'; size?: number }) {
  const bg = tone === 'accent' ? colors.accent : tone === 'light' ? colors.iconBg : colors.blue;
  const fg = tone === 'light' ? colors.blue : '#ffffff';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.icon,
        { width: size, height: size, backgroundColor: bg, transform: [{ translateY: pressed ? 2 : 0 }] },
        tone !== 'light' && { boxShadow: tone === 'accent' ? '0px 3px 0px #8f0f4b' : '0px 3px 0px #0c1f7a' },
      ]}
    >
      <Feather name={icon} size={Math.round(size * 0.45)} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  base: {
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
