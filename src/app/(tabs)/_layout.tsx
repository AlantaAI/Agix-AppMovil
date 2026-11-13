import { useMemo } from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { useWorkspace } from '@/data/WorkspaceProvider';
import { buildAlerts, unreadCount } from '@/domain/alerts';
import { activeSessionOf } from '@/domain/board';
import { useNow } from '@/hooks/useNow';
import { TabBar } from '@/ui/TabBar';
import { colors } from '@/ui/theme';

export default function TabsLayout() {
  const { snapshot, alertsSeenAt } = useWorkspace();
  // Los avisos dependen del tiempo (p. ej. un cronómetro olvidado): basta con recalcular cada minuto.
  const now = useNow(true, 60_000);
  const unread = useMemo(
    () => (snapshot ? unreadCount(buildAlerts(snapshot, now), alertsSeenAt) : 0),
    [snapshot, now, alertsSeenAt],
  );
  const running = !!snapshot && !!activeSessionOf(snapshot.sessions, snapshot.userId);

  return (
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgMid } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Proyectos' }} />
      <Tabs.Screen name="board" options={{ title: 'Tablero' }} />
      <Tabs.Screen name="timer" options={{ title: 'Cronómetro', tabBarBadge: running ? '●' : undefined }} />
      <Tabs.Screen name="alerts" options={{ title: 'Avisos', tabBarBadge: unread > 0 ? unread : undefined }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
