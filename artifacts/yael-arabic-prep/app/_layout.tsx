import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import colors from '@/constants/colors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, useAuth, useClerk } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { ThemeProvider } from '@/hooks/useColors';
import { StudyProvider } from '@/lib/StudyProvider';
import { AccountDeletionProvider } from '@/lib/AccountDeletion';

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function StartupMessage() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16, backgroundColor: colors.light.background }}>
      <ActivityIndicator size="large" color={colors.light.primary} />
      <Text style={{ color: colors.light.foreground, fontSize: 20, textAlign: 'center' }}>جارٍ تجهيز رحلتك مع كلمة…</Text>
      <Text style={{ color: colors.light.mutedForeground, textAlign: 'center', lineHeight: 24 }}>قد يستغرق الاتصال الآمن بضع ثوانٍ. تأكّد من اتصالك بالإنترنت.</Text>
    </View>
  );
}

function ReadyNavigation() {
  const { isLoaded } = useAuth();
  return isLoaded ? <StudyProvider><RootLayoutNav /></StudyProvider> : <StartupMessage />;
}

function RootLayoutNav() {
  const { getToken } = useAuth();
  const { addListener } = useClerk();
  const previousUser = React.useRef<string | null | undefined>(undefined);

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  useEffect(() => addListener(({ user }) => {
    const nextUser = user?.id ?? null;
    if (previousUser.current !== undefined && previousUser.current !== nextUser) {
      queryClient.clear();
    }
    previousUser.current = nextUser;
  }), [addListener]);

  return (
    <Stack screenOptions={{ headerBackTitle: 'رجوع' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="exam" options={{ headerShown: false }} />
      <Stack.Screen name="exam-library" options={{ headerShown: false }} />
      <Stack.Screen name="source-session" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return <StartupMessage />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} proxyUrl={proxyUrl}>
          <ThemeProvider>
            <ErrorBoundary>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <AccountDeletionProvider><ReadyNavigation /></AccountDeletionProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </ErrorBoundary>
          </ThemeProvider>
        </ClerkProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
