import { Image, StyleSheet, View } from 'react-native';
import type { Person } from '@/data/types';
import { avatarColor, displayName, initials } from '@/domain/people';
import { Text } from './Text';

/** Iniciales (o foto) de una persona, con un color estable. */
export function Avatar({ person, id, size = 30 }: { person?: Person; id: string; size?: number }) {
  const name = displayName(person, '?');
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (person?.avatarUrl) {
    return <Image source={{ uri: person.avatarUrl }} style={[styles.ring, style]} accessibilityLabel={name} />;
  }
  return (
    <View style={[styles.ring, style, { backgroundColor: avatarColor(id) }]} accessibilityLabel={name}>
      <Text weight="black" color="#ffffff" style={{ fontSize: size * 0.38, lineHeight: size * 0.5 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

/** Varios avatares solapados; muestra «+N» si no caben. */
export function AvatarStack({ ids, people, size = 28, max = 3 }: { ids: string[]; people: Record<string, Person>; size?: number; max?: number }) {
  const shown = ids.slice(0, max);
  const rest = ids.length - shown.length;
  return (
    <View style={styles.stack}>
      {shown.map((id, i) => (
        <View key={id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar id={id} person={people[id]} size={size} />
        </View>
      ))}
      {rest > 0 && (
        <View style={[styles.ring, styles.more, { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.3 }]}>
          <Text weight="black" color="#1b3bd6" style={{ fontSize: size * 0.36 }}>+{rest}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderWidth: 2, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stack: { flexDirection: 'row', alignItems: 'center' },
  more: { backgroundColor: '#dbe7ff' },
});
