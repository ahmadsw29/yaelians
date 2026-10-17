import { Pressable, Text, View } from 'react-native';
import { useStudy } from '@/lib/StudyProvider';
import { useColors } from '@/hooks/useColors';

export function StudySyncStatus() {
  const { loading, message, pending, legacy, busy, refresh, migrate, keepCloud } = useStudy();
  const c = useColors();
  if (!loading && !message && !pending && !legacy) return null;
  return <View style={{ padding: 14, gap: 10 }}>
    {loading && <Text style={{ color: c.foreground, textAlign: 'right' }}>جارٍ تحميل التقدّم…</Text>}
    {!!message && <Text accessibilityRole="alert" style={{ color: c.foreground, textAlign: 'right' }}>{message}</Text>}
    {!!pending && <Text style={{ color: c.foreground, textAlign: 'right' }}>{pending} دروس محفوظة على الجهاز بانتظار المزامنة، وغير مضافة للأرقام السحابية بعد.</Text>}
    {!!legacy && <>
      <Text style={{ color: c.foreground, textAlign: 'right' }}>وجدنا تقدّمًا قديمًا لهذا الحساب على هذا الجهاز: {legacy.lessonsCompleted} دروس، {legacy.xp} نقطة. يمكنك استيراده فقط إذا كان التقدّم السحابي فارغًا. لن ندمجه أو نستبدله تلقائيًا، وستبقى النسخة المحلية محفوظة. تقدّم الضيف منفصل. اختر قبل مزامنة الدروس الجديدة.</Text>
      <Pressable disabled={busy || loading} accessibilityRole="button" onPress={migrate}>
        <Text style={{ color: c.primary, textAlign: 'right' }}>استيراد التقدّم المحلي إلى حسابي</Text>
      </Pressable>
      <Pressable disabled={busy} accessibilityRole="button" onPress={keepCloud}>
        <Text style={{ color: c.primary, textAlign: 'right' }}>استخدام السحابة وإبقاء النسخة القديمة على الجهاز</Text>
      </Pressable>
    </>}
    {(!!message || !!pending) && <Pressable disabled={busy} accessibilityRole="button" onPress={refresh}>
      <Text style={{ color: c.primary, textAlign: 'right' }}>{busy ? 'جارٍ المزامنة…' : 'إعادة المحاولة'}</Text>
    </Pressable>}
  </View>;
}
