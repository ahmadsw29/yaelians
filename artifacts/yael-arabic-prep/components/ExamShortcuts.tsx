import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ARABIC_BOLD_FONT, ARABIC_FONT } from '@/constants/typography';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export default function ExamShortcuts() {
  const c = useColors();
  const router = useRouter();
  return <View style={styles.group}>
    <Pressable testID="home-training" accessibilityRole="button"
      onPress={() => router.push('/source-session')}
      style={({ pressed }) => [styles.card, { backgroundColor: c.secondary, borderColor: c.primary, opacity: pressed ? 0.8 : 1 }]}>
      <Ionicons name="timer-outline" size={29} color={c.primary} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: c.foreground }]}>تدريب 20 دقيقة</Text>
        <Text style={[styles.detail, { color: c.foreground }]}>22 سؤالًا متنوعًا • ابدأ أو أكمل محاولتك</Text>
      </View>
      <Ionicons name="arrow-back" size={20} color={c.primary} />
    </Pressable>
    <Pressable testID="home-exam-library" accessibilityRole="button"
      onPress={() => router.push('/exam-library')}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.8 : 1 }]}>
      <Ionicons name="library-outline" size={26} color={c.primary} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: c.foreground }]}>مكتبة نماذجك</Text>
        <Text style={[styles.detail, { color: c.mutedForeground }]}>اختر قسمًا للتدريب أو نموذجًا كاملًا، مع الحلول والشروحات</Text>
      </View>
      <Ionicons name="chevron-back" size={20} color={c.mutedForeground} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  group: { gap: 14 },
  card: { flexDirection: 'row-reverse', alignItems: 'center', padding: 16, gap: 12, borderWidth: 1, borderRadius: 22, minHeight: 88 },
  copy: { flex: 1, gap: 5 },
  title: { fontFamily: ARABIC_BOLD_FONT, fontSize: 18, textAlign: 'right', writingDirection: 'rtl' },
  detail: { fontFamily: ARABIC_FONT, fontSize: 12, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
});
