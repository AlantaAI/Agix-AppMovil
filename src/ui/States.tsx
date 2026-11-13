import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from './Card';
import { LogoLoader } from './Logo';
import { useNow } from '@/hooks/useNow';
import { Text } from './Text';
import { colors } from './theme';

/** Estado vacío: ícono, título, explicación y, si hace falta, una acción. */
export function EmptyState({
  icon, title, message, action,
}: { icon: ComponentProps<typeof Feather>['name']; title: string; message: string; action?: ReactNode }) {
  return (
    <Card style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={26} color={colors.blue} />
      </View>
      <Text variant="heading" align="center">{title}</Text>
      <Text variant="body" color={colors.textMuted} align="center">{message}</Text>
      {action}
    </Card>
  );
}

/** Pantalla de espera con el logo animado. */
export function LoadingState({ message = 'Cargando tus proyectos…' }: { message?: string }) {
  return (
    <View style={styles.loading}>
      <LogoLoader size={72} />
      <Text variant="label" color={colors.onBg}>{message}</Text>
    </View>
  );
}

/** Aviso de que se muestran datos guardados porque no hay conexión (HU-43). */
export function OfflineBanner({ fetchedAt }: { fetchedAt: number }) {
  const now = useNow(true, 60_000);
  const minutes = Math.max(0, Math.round((now - fetchedAt) / 60_000));
  const age = minutes < 1 ? 'hace un momento' : minutes < 60 ? `hace ${minutes} min` : `hace ${Math.round(minutes / 60)} h`;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Feather name="wifi-off" size={16} color={colors.gold} />
      <Text variant="caption" weight="bold" color={colors.gold} style={styles.flex}>
        Sin conexión · mostrando lo guardado {age}. Los cambios necesitan internet.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 22 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: colors.iconBg, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.goldSubtle,
    borderColor: '#f5c518',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  flex: { flex: 1 },
});
