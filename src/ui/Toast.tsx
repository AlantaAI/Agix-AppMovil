import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius } from './theme';

type Tone = 'success' | 'error' | 'info';
interface ToastState { id: number; message: string; tone: Tone }

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => undefined);

const ICON: Record<Tone, 'check-circle' | 'alert-triangle' | 'info'> = {
  success: 'check-circle', error: 'alert-triangle', info: 'info',
};
const BG: Record<Tone, string> = { success: colors.teal, error: colors.danger, info: colors.navy };

/** Mensajes breves que aparecen arriba y se van solos (no bloquean la pantalla). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const anim = useState(() => new Animated.Value(0))[0];
  const insets = useSafeAreaInsets();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: Tone = 'info') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, toast.tone === 'error' ? 4200 : 2800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, anim]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[
              styles.toast,
              { backgroundColor: BG[toast.tone] },
              {
                opacity: anim,
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
              },
            ]}
          >
            <Feather name={ICON[toast.tone]} size={18} color="#ffffff" />
            <Text variant="label" color="#ffffff" style={styles.text}>{toast.message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center', zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    maxWidth: 520,
    boxShadow: '0px 8px 20px rgba(9, 24, 92, 0.35)',
  },
  text: { flexShrink: 1 },
});
