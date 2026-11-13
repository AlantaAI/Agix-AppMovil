import { Alert } from 'react-native';

/** Pregunta de confirmación nativa. Resuelve true si la persona acepta. */
export function confirm(title: string, message: string, okLabel: string, destructive = false): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
