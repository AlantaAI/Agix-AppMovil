import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { AuthProvider, useAuth } from '@/data/AuthProvider';
import { WorkspaceProvider } from '@/data/WorkspaceProvider';
import { ToastProvider } from '@/ui/Toast';
import { colors } from '@/ui/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
  });
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <ToastProvider>
            <RootStack ready={fontsLoaded || !!fontError} />
          </ToastProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** Con sesión se ve la app; sin sesión, solo el acceso. */
function RootStack({ ready }: { ready: boolean }) {
  const { status } = useAuth();
  const settled = ready && status !== 'loading';

  useEffect(() => {
    if (settled) void SplashScreen.hideAsync().catch(() => undefined);
  }, [settled]);

  if (!settled) return null;
  const signedIn = status === 'signedIn';
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgMid } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="task/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="new-task" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
