import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
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
import { Stack, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, useAuth, useClerk } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { ThemeProvider, useColors } from '@/hooks/useColors';
import { StudyProvider } from '@/lib/StudyProvider';
import { StudyLoadingScreen } from '@/components/StudyLoadingScreen';
import { AccountDeletionProvider } from '@/lib/AccountDeletion';
import { PlanAccessProvider, usePlanAccess } from '@/lib/PlanAccess';
import { FloatingTranslator } from '@/components/FloatingTranslator';
import { DailyGoalsProvider } from '@/lib/DailyGoalsProvider';
import { DailyGoalsPrompt } from '@/components/DailyGoals';
import { WebInstallProvider } from '@/lib/WebInstall';
import { StartupStatus } from '@/components/StartupStatus';

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function StartupMessage() {
  return <StartupStatus />;
}

function ReadyNavigation() {
  const { isLoaded, userId } = useAuth();
  return isLoaded ? <StudyProvider><PlanAccessProvider><DailyGoalsProvider key={userId ?? 'guest'} userId={userId}><RootLayoutNav /><StudyLoadingScreen /></DailyGoalsProvider></PlanAccessProvider></StudyProvider> : <StartupMessage />;
}

function RootLayoutNav() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const { addListener } = useClerk();
  const segments = useSegments();
  const pathname = usePathname();
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
  // The index route owns initial routing. Two simultaneous redirect owners
  // can race between native plan pages and web subscription pages.
  const indexRoute = pathname === '/' && firstSegment !== '(tabs)';
  const publicWeb = firstSegment === 'website' || firstSegment === 'web-policy';
  const billingWeb = firstSegment === 'subscribe' || firstSegment === 'billing-return';
  const accountWeb = firstSegment === '(tabs)' && segments[1] === 'profile';
  let redirectTo: '/welcome' | '/website' | '/subscribe' | '/plans' | '/plans?reason=premium-exam' | '/(tabs)' | null = null;
  if (isLoaded && !indexRoute) {
    if (!isSignedIn && firstSegment !== 'welcome' && firstSegment !== '(auth)' && !publicWeb) {
      redirectTo = Platform.OS === 'web' ? '/website' : '/welcome';
    } else if (isSignedIn && planReady && Platform.OS === 'web' && plan !== 'premium' && !publicWeb && !billingWeb && !accountWeb) {
      redirectTo = '/subscribe';
    } else if (Platform.OS === 'web' && (publicWeb || billingWeb || accountWeb)) {
      // Marketing, policy and verification pages remain reachable after sign-in.
    } else if (isSignedIn && planReady && !plan && firstSegment !== 'plans') {
      redirectTo = '/plans';
    } else if (isSignedIn && planReady && plan === 'free' && firstSegment === 'exam') {
      redirectTo = '/plans?reason=premium-exam';
    } else if (isSignedIn && planReady && plan && (firstSegment === 'welcome' || firstSegment === '(auth)')) {
      redirectTo = '/(tabs)';
    }
  }
  const verifyingAccess = Platform.OS === 'web' && isSignedIn && !planReady && !indexRoute && !publicWeb && !billingWeb && firstSegment !== '(auth)';
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
      <Stack.Screen name="website" options={{ headerShown: false }} />
      <Stack.Screen name="subscribe" options={{ headerShown: false }} />
      <Stack.Screen name="billing-return" options={{ headerShown: false }} />
      <Stack.Screen name="web-policy" options={{ headerShown: false }} />
      <Stack.Screen name="plans" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="exam" options={{ headerShown: false }} />
      <Stack.Screen name="exam-library" options={{ headerShown: false }} />
      <Stack.Screen name="source-session" options={{ headerShown: false }} />
      <Stack.Screen name="reading" options={{ headerShown: false }} />
      <Stack.Screen name="study" options={{ headerShown: false }} />
      <Stack.Screen name="restatement" options={{ headerShown: false }} />
      <Stack.Screen name="flashcards" options={{ headerShown: false }} />
    </Stack>
    {isLoaded && isSignedIn && userId && !redirectTo && !publicWeb && !billingWeb && (Platform.OS !== 'web' || plan === 'premium') && <FloatingTranslator key={`translator:${userId}`} userId={userId} />}
    <DailyGoalsPrompt key={`goals:${userId ?? 'guest'}`} enabled={!!(isLoaded && isSignedIn && userId && !redirectTo && planReady && plan && (Platform.OS !== 'web' || plan === 'premium') && firstSegment === '(tabs)' && segments[1] !== 'practice')} />
    {(redirectTo || verifyingAccess) && <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center' }}>
      <StartupStatus compact />
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

  // Browser text can render with system fallbacks while fonts download.
  // Do not serialize authentication and navigation behind four font requests.
  if (Platform.OS !== 'web' && !fontsLoaded && !fontError) return <StartupMessage />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} proxyUrl={proxyUrl}>
          <ThemeProvider>
            <ErrorBoundary>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <WebInstallProvider><AccountDeletionProvider><ReadyNavigation /></AccountDeletionProvider></WebInstallProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </ErrorBoundary>
          </ThemeProvider>
        </ClerkProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
