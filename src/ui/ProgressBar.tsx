import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from './theme';

/**
 * Barra de avance. `value` va de 0 a 1 (se recorta); `over` la pinta en rojo
 * cuando lo real superó lo estimado.
 */
export function ProgressBar({
  value, color = colors.accent, track = '#d9e3fb', height = 8, over, style,
}: { value: number; color?: string; track?: string; height?: number; over?: boolean; style?: ViewStyle }) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const anim = useState(() => new Animated.Value(clamped))[0];

  useEffect(() => {
    Animated.timing(anim, { toValue: clamped, duration: 450, useNativeDriver: false }).start();
  }, [anim, clamped]);

  return (
    <View
      style={[styles.track, { height, borderRadius: height, backgroundColor: track }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View
        style={{
          height,
          borderRadius: height,
          backgroundColor: over ? colors.danger : color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ track: { overflow: 'hidden', width: '100%' } });
