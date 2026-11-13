import { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useWorkspace } from '@/data/WorkspaceProvider';
import { buildAlerts, isUnread, type Alert, type AlertKind } from '@/domain/alerts';
import { relativeTime } from '@/domain/time';
import { useNow } from '@/hooks/useNow';
import { AppHeader } from '@/ui/AppHeader';
import { Backdrop } from '@/ui/Backdrop';
import { Card } from '@/ui/Card';
import { EmptyState, LoadingState, OfflineBanner } from '@/ui/States';
import { Text } from '@/ui/Text';
import { colors } from '@/ui/theme';
import { tap } from '@/ui/haptics';

const KIND: Record<AlertKind, { icon: 'user-plus' | 'trending-up' | 'clock' | 'book-open'; bg: string; fg: string }> = {
  assigned: { icon: 'user-plus', bg: colors.iconBg, fg: colors.blue },
  over: { icon: 'trending-up', bg: colors.dangerSubtle, fg: colors.danger },
  timer: { icon: 'clock', bg: colors.goldSubtle, fg: colors.gold },
  lesson: { icon: 'book-open', bg: colors.tealSubtle, fg: colors.teal },
};

export default function AlertsScreen() {
  const router = useRouter();
  const { snapshot, loadState, offline, refreshing, refresh, alertsSeenBefore, markAlertsSeen } = useWorkspace();
  const now = useNow(true, 60_000);
  const alerts = useMemo(() => (snapshot ? buildAlerts(snapshot, now) : []), [snapshot, now]);

  // Al abrir la pestaña todo cuenta como visto (se apaga el contador), pero lo
  // que llegó desde la visita anterior se sigue resaltando mientras se mira.
  useFocusEffect(useCallback(() => { markAlertsSeen(); }, [markAlertsSeen]));

  const open = (a: Alert) => {
    tap();
    if (a.taskId) router.push({ pathname: '/task/[id]', params: { id: a.taskId } });
  };

  if (loadState === 'loading' && !snapshot) {
    return <Backdrop><AppHeader title="Avisos" /><LoadingState message="Revisando tus avisos…" /></Backdrop>;
  }

  return (
    <Backdrop>
      <AppHeader title="Avisos" subtitle="Asignaciones, desvíos y lecciones de tus proyectos" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ffffff" colors={[colors.accent]} />}
      >
        {offline && snapshot && <OfflineBanner fetchedAt={snapshot.fetchedAt} />}
        {alerts.length === 0 ? (
          <EmptyState icon="bell" title="Todo en orden" message="Aquí verás cuando te asignen una tarea, cuando una se pase de su estimación o cuando el equipo registre una lección." />
        ) : (
          alerts.map(a => {
            const unread = isUnread(a, alertsSeenBefore);
            const k = KIND[a.kind];
            return (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={`${unread ? 'Nuevo. ' : ''}${a.title}. ${a.body}`}
                onPress={() => open(a)}
                style={({ pressed }) => [{ transform: [{ translateY: pressed ? 3 : 0 }] }]}
              >
                <Card style={[styles.alert, unread && styles.unread]}>
                  <View style={[styles.icon, { backgroundColor: k.bg }]}>
                    <Feather name={k.icon} size={18} color={k.fg} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="label" weight={unread ? 'black' : 'bold'}>{a.title}</Text>
                    <Text variant="caption" color={colors.textMuted} numberOfLines={2}>{a.body}</Text>
                    <Text variant="caption" weight="bold" color={colors.textSecondary} style={styles.time}>{relativeTime(a.at, now)}</Text>
                  </View>
                  {unread && <View style={styles.dot} accessibilityElementsHidden />}
                </Card>
              </Pressable>
            );
          })
        )}
        <Text variant="caption" color={colors.onBgMuted} align="center" style={styles.note}>
          Los avisos con fecha de vencimiento llegarán cuando el cronograma guarde fechas en la base.
        </Text>
      </ScrollView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  alert: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  unread: { borderColor: colors.accentBright, backgroundColor: '#fffafd' },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  time: { marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accentBright, marginTop: 4 },
  note: { marginTop: 8, paddingHorizontal: 12 },
});
