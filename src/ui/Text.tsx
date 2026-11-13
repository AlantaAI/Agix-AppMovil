import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts } from './theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'overline';
type Weight = keyof typeof fonts;

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontSize: 52, lineHeight: 58, fontFamily: fonts.black, letterSpacing: 1 },
  title: { fontSize: 22, lineHeight: 28, fontFamily: fonts.black },
  heading: { fontSize: 17, lineHeight: 23, fontFamily: fonts.extrabold },
  body: { fontSize: 15, lineHeight: 21, fontFamily: fonts.semibold },
  label: { fontSize: 14, lineHeight: 19, fontFamily: fonts.bold },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fonts.semibold },
  overline: { fontSize: 11.5, lineHeight: 15, fontFamily: fonts.black, letterSpacing: 1.1, textTransform: 'uppercase' },
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
  align?: TextStyle['textAlign'];
}

/** Texto con la tipografía de Agix. */
export function Text({ variant = 'body', weight, color = colors.text, align, style, ...rest }: AppTextProps) {
  return (
    <RNText
      {...rest}
      style={[VARIANTS[variant], { color }, weight && { fontFamily: fonts[weight] }, align && { textAlign: align }, style]}
    />
  );
}
