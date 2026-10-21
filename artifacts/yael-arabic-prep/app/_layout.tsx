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
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, useAuth, useClerk } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { ThemeProvider, useColors } from '@/hooks/useColors';
import { StudyProvider } from '@/lib/StudyProvider';
import { StudyLoadingScreen } from '@/components/StudyLoadingScreen';
import { AccountDeletionProvider } from '@/lib/AccountDeletion';
import { PlanAccessProvider, usePlanAccess } from '@/lib/PlanAccess';

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
  return isLoaded ? <StudyProvider><PlanAccessProvider><RootLayoutNav /><StudyLoadingScreen /></PlanAccessProvider></StudyProvider> : <StartupMessage />;
}

function RootLayoutNav() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { addListener } = useClerk();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const palette = useColors();
  const { ready: planReady, plan } = usePlanAccess();
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

  const firstSegment = segments[0];
  let redirectTo: '/welcome' | '/plans' | '/plans?reason=premium-exam' | '/(tabs)' | null = null;
  if (isLoaded) {
    if (!isSignedIn && firstSegment !== 'welcome' && firstSegment !== '(auth)') {
      redirectTo = '/welcome';
    } else if (isSignedIn && planReady && !plan && firstSegment !== 'plans') {
      redirectTo = '/plans';
    } else if (isSignedIn && planReady && plan === 'free' && firstSegment === 'exam') {
      redirectTo = '/plans?reason=premium-exam';
    } else if (isSignedIn && planReady && plan && (firstSegment === 'welcome' || firstSegment === '(auth)')) {
      redirectTo = '/(tabs)';
    }
  }
  // Keep the root navigator mounted while guards redirect. Replacing it with a
  // Redirect tears down its state and can repeatedly remount the same route.
  useEffect(() => {
    if (navigationState?.key && redirectTo) router.replace(redirectTo);
  }, [navigationState?.key, redirectTo, router]);

  return (
    <>
    <Stack screenOptions={{ headerBackTitle: 'رجوع' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="plans" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="exam" options={{ headerShown: false }} />
      <Stack.Screen name="exam-library" options={{ headerShown: false }} />
      <Stack.Screen name="source-session" options={{ headerShown: false }} />
      <Stack.Screen name="study" options={{ headerShown: false }} />
      <Stack.Screen name="restatement" options={{ headerShown: false }} />
      <Stack.Screen name="flashcards" options={{ headerShown: false }} />
    </Stack>
    {redirectTo && <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={palette.primary} />
    </View>}
    </>
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
