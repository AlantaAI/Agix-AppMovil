import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Text } from './Text';
import { colors } from './theme';
import { tap } from './haptics';

type IconName = ComponentProps<typeof Feather>['name'];

const ICONS: Record<string, IconName> = {
  index: 'grid',
  board: 'columns',
  timer: 'clock',
  alerts: 'bell',
  profile: 'user',
};

/**
 * Barra inferior como la del mockup: la pestaña activa lleva una «píldora»
 * rosada detrás del ícono. Los avisos muestran un contador y el cronómetro un
 * punto cuando está en marcha (vía `tabBarBadge`).
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} role="tablist">
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = index === state.index;
        const label = options.title ?? route.name;
        const badge = options.tabBarBadge;
        const color = focused ? colors.accent : colors.textSecondary;
        const onPress = () => {
          tap();
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        const a11yBadge = typeof badge === 'number' ? `, ${badge} sin leer` : badge ? ', en marcha' : '';
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={`${label}${a11yBadge}`}
            onPress={onPress}
            style={styles.item}
          >
            <View style={[styles.pill, focused && styles.pillActive]}>
              <Feather name={ICONS[route.name] ?? 'circle'} size={21} color={color} />
              {badge !== undefined && badge !== '' && (
                typeof badge === 'number'
                  ? <View style={styles.badge}><Text weight="black" color="#ffffff" style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View>
                  : <View style={styles.dot} />
              )}
            </View>
            <Text variant="caption" weight={focused ? 'black' : 'bold'} color={color} style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 3,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  pill: { width: 52, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.accentSubtle },
  label: { fontSize: 11.5, lineHeight: 15 },
  badge: {
    position: 'absolute',
    top: -3,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
  dot: {
    position: 'absolute', top: 2, right: 10, width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.accentBright, borderWidth: 2, borderColor: '#ffffff',
  },
});
