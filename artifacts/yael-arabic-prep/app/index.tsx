import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Platform } from 'react-native';
import { usePlanAccess } from '@/lib/PlanAccess';
import { StartupStatus } from '@/components/StartupStatus';

export default function IndexRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const { ready, plan } = usePlanAccess();
  if (!isLoaded || (isSignedIn && !ready)) {
    return <StartupStatus compact />;
  }
  if (Platform.OS === 'web') {
    if (!isSignedIn) return <Redirect href="/website" />;
    return <Redirect href={plan === 'premium' ? '/(tabs)' : '/subscribe'} />;
  }
  if (!isSignedIn) return <Redirect href="/welcome" />;
  if (!plan) return <Redirect href="/plans" />;
  return <Redirect href="/(tabs)" />;
}
