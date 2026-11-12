import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

/** A slow connection must never be mistaken for a permanently frozen app. */
export function StartupStatus({ compact = false }: { compact?: boolean }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  const p = useColors();
  return <View testID="startup-status" style={{ flex: 1, width: '100%', alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16, backgroundColor: p.background }}>
    <ActivityIndicator size={compact ? 'small' : 'large'} color={p.primary} />
    <Text accessibilityLiveRegion="polite" style={{ color: p.foreground, fontSize: 18, textAlign: 'center' }}>
      {slow ? 'الاتصال يستغرق وقتًا أطول من المعتاد' : 'جارٍ فتح Yaelians…'}
    </Text>
    {slow && <>
      <Text style={{ color: p.mutedForeground, textAlign: 'center', lineHeight: 24 }}>تحقّق من اتصالك. تقدّمك محفوظ ولن تحتاج لبدء حساب جديد.</Text>
      {Platform.OS === 'web' && <Pressable accessibilityRole="button" onPress={() => window.location.reload()}
        style={{ paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, backgroundColor: p.primary }}>
        <Text style={{ color: p.primaryForeground, fontWeight: '700' }}>حاول مجددًا</Text>
      </Pressable>}
    </>}
  </View>;
}
