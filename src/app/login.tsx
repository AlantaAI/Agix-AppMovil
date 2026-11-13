import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/data/AuthProvider';
import { WEB_URL, isSupabaseConfigured } from '@/lib/env';
import { Backdrop } from '@/ui/Backdrop';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { AgixMark, AgixWordmark } from '@/ui/Logo';
import { Text } from '@/ui/Text';
import { colors } from '@/ui/theme';
import { warning } from '@/ui/haptics';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { signIn, enterDemo } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  // Entrada: la placa cae con rebote y luego aparece el formulario.
  const mark = useState(() => new Animated.Value(0))[0];
  const form = useState(() => new Animated.Value(0))[0];
  const shake = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.sequence([
      Animated.spring(mark, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 14 }),
      Animated.timing(form, { toValue: 1, duration: 380, delay: 250, useNativeDriver: true }),
    ]).start();
  }, [mark, form]);

  const shakeForm = () => {
    warning();
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 7, -7, 0].map(v => Animated.timing(shake, { toValue: v, duration: 55, useNativeDriver: true })),
    ).start();
  };

  const submit = async () => {
    if (!EMAIL.test(email.trim())) {
      setError('Escribe un correo válido.');
      shakeForm();
      return;
    }
    if (!password) {
      setError('Escribe tu contraseña.');
      shakeForm();
      return;
    }
    setBusy(true);
    setError(null);
    const message = await signIn(email, password);
    setBusy(false);
    if (message) {
      setError(message);
      shakeForm();
    }
  };

  return (
    <Backdrop>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Animated.View
              style={{
                transform: [
                  { translateY: mark.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) },
                  { scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                  { rotate: mark.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '0deg'] }) },
                ],
                opacity: mark,
              }}
            >
              <AgixMark size={78} />
            </Animated.View>
            <AgixWordmark fontSize={46} animated />
            <Text variant="label" color={colors.onBgMuted} align="center">Tu tablero ágil, también en el bolsillo</Text>
          </View>

          <Animated.View
            style={{
              opacity: form,
              transform: [
                { translateY: form.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                { translateX: shake },
              ],
            }}
          >
            {isSupabaseConfigured ? (
              <Card raised style={styles.card}>
                <View style={styles.cardHead}>
                  <Text variant="title">Iniciar sesión</Text>
                  <Text variant="caption" color={colors.textMuted}>Usa las mismas credenciales que en la web.</Text>
                </View>
                <Field
                  label="Correo"
                  value={email}
                  onChangeText={t => { setEmail(t); setError(null); }}
                  placeholder="tu@correo.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="username"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                <Field
                  ref={passwordRef}
                  label="Contraseña"
                  value={password}
                  onChangeText={t => { setPassword(t); setError(null); }}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  right={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      hitSlop={10}
                      onPress={() => setShowPassword(v => !v)}
                      style={styles.eye}
                    >
                      <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                    </Pressable>
                  }
                />
                {error && (
                  <View style={styles.error} accessibilityRole="alert">
                    <Feather name="alert-circle" size={17} color={colors.danger} />
                    <Text variant="caption" weight="bold" color={colors.danger} style={styles.flex}>{error}</Text>
                  </View>
                )}
                <Button label="Entrar" size="lg" full loading={busy} onPress={submit} />
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void WebBrowser.openBrowserAsync(WEB_URL)}
                  style={styles.link}
                >
                  <Text variant="caption" color={colors.textMuted} align="center">
                    ¿Aún no tienes cuenta? <Text variant="caption" weight="black" color={colors.accent}>Créala en la web</Text>
                  </Text>
                </Pressable>
              </Card>
            ) : (
              <Card raised style={styles.card}>
                <View style={styles.cardHead}>
                  <Text variant="title">Falta conectar Supabase</Text>
                  <Text variant="body" color={colors.textMuted}>
                    Copia <Text weight="black">mobile/.env.example</Text> a <Text weight="black">.env</Text> con la URL y la clave
                    anónima que usa la web, y vuelve a abrir la app.
                  </Text>
                </View>
                <Button label="Probar con datos de ejemplo" icon="play-circle" size="lg" full onPress={enterDemo} />
                <Text variant="caption" color={colors.textMuted} align="center">
                  La demostración guarda todo en este dispositivo y no toca ninguna cuenta.
                </Text>
              </Card>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 28, maxWidth: 480, width: '100%', alignSelf: 'center' },
  brand: { alignItems: 'center', gap: 6 },
  card: { gap: 16, padding: 20 },
  cardHead: { gap: 4 },
  eye: { padding: 8 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.dangerSubtle,
  },
  link: { paddingVertical: 4 },
});
