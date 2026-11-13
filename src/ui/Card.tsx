import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { colors, radius, shadow } from './theme';

interface CardProps extends ViewProps {
  tone?: 'default' | 'subtle' | 'accent';
  raised?: boolean;
  padded?: boolean;
}

/** Panel blanco con borde azul y la sombra dura de la web. */
export function Card({ tone = 'default', raised, padded = true, style, ...rest }: CardProps) {
  return <View style={[styles.base, TONES[tone], raised && styles.raised, padded && styles.padded, style]} {...rest} />;
}

const TONES: Record<NonNullable<CardProps['tone']>, ViewStyle> = {
  default: {},
  subtle: { backgroundColor: colors.cardSubtle, borderColor: colors.borderInner, borderWidth: 1.5, boxShadow: 'none' },
  accent: { borderColor: colors.accentBright, boxShadow: shadow.accent },
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    boxShadow: shadow.card,
  },
  raised: { boxShadow: shadow.raised },
  padded: { padding: 16 },
});
