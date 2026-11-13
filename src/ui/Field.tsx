import { forwardRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { colors, fonts, radius } from './theme';

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
  right?: ReactNode;
}

/** Campo de texto con etiqueta. Al enfocarlo, el borde pasa a magenta como en la web. */
export const Field = forwardRef<TextInputInstance, FieldProps>(function Field({ label, hint, error, right, style, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text variant="label" color={colors.text}>{label}</Text>
      <View style={[styles.box, focused && styles.focused, !!error && styles.errorBox]}>
        <TextInput
          ref={ref}
          placeholderTextColor="#8a96c8"
          accessibilityLabel={label}
          {...rest}
          onFocus={e => { setFocused(true); onFocus?.(e); }}
          onBlur={e => { setFocused(false); onBlur?.(e); }}
          style={[styles.input, rest.multiline && styles.multiline, style]}
        />
        {right}
      </View>
      {error ? (
        <Text variant="caption" weight="bold" color={colors.danger}>{error}</Text>
      ) : hint ? (
        <Text variant="caption" color={colors.textMuted}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.borderInner,
    borderRadius: radius.md,
    backgroundColor: '#f7f9ff',
    paddingRight: 6,
  },
  focused: { borderColor: colors.accentBright, backgroundColor: '#ffffff', boxShadow: '0px 0px 0px 4px rgba(255, 46, 139, 0.18)' },
  errorBox: { borderColor: colors.danger },
  input: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    // El foco ya lo marca el borde magenta de la caja; sin el contorno del navegador en la web.
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
});
