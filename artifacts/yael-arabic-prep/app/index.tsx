import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { ActivityIndicator, View } from 'react-native';
import { usePlanAccess } from '@/lib/PlanAccess';
import { useColors } from '@/hooks/useColors';

export default function IndexRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const { ready, plan } = usePlanAccess();
  const colors = useColors();
  if (!isLoaded || (isSignedIn && !ready)) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>;
  }
  if (!isSignedIn) return <Redirect href="/welcome" />;
  if (!plan) return <Redirect href="/plans" />;
  return <Redirect href="/(tabs)" />;
}
