import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { POLICY_PAGES } from '@/lib/public-policies';

/** Public links stay reachable whether or not checkout or account access works. */
export function PublicPolicyLinks({ onPrivacy, onTerms }: {
  onPrivacy: () => void;
  onTerms: () => void;
}) {
  const router = useRouter();
  const c = useColors();
  return <View style={styles.links} accessibilityLabel="الأسعار والسياسات">
    {POLICY_PAGES.map(page => <Pressable key={page.id}
      testID={`public-link-${page.id}`} accessibilityRole="link"
      onPress={page.id === 'privacy' ? onPrivacy : page.id === 'terms' ? onTerms
        : () => router.push(`/web-policy?section=${page.id}`)}
      style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[styles.text, { color: c.mutedForeground }]}>{page.label}</Text>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 8, flexShrink: 1 },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 8 },
  text: { fontSize: 14, lineHeight: 24, textDecorationLine: 'underline', textAlign: 'right', writingDirection: 'rtl' },
});
