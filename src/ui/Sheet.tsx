import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { colors } from './theme';

/** Hoja inferior modal (selector de proyecto, opciones). Se cierra tocando fuera. */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <Text variant="heading" style={styles.title}>{title}</Text>
          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: colors.backdrop },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.border,
    maxHeight: '80%',
    paddingTop: 10,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#c9d5f5', marginBottom: 10 },
  title: { paddingHorizontal: 20, marginBottom: 8 },
  content: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
});
