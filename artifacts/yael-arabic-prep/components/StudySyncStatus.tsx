import { Pressable, Text, View } from 'react-native';
import { useStudy } from '@/lib/StudyProvider';
import { useColors } from '@/hooks/useColors';

export function StudySyncStatus() {
  const { loading, message, pending, legacy, busy, refresh, migrate, keepCloud, recovery, recoverOutbox } = useStudy();
  const c = useColors();
  if (!loading && !message && !pending && !legacy && !recovery) return null;
  return <View style={{ padding: 14, gap: 10 }}>
    {loading && <Text style={{ color: c.foreground, textAlign: 'right' }}>جارٍ تحميل التقدّم…</Text>}
    {!!message && <Text accessibilityRole="alert" style={{ color: c.foreground, textAlign: 'right' }}>{message}</Text>}
    {!!recovery && <>
      <Text accessibilityRole="alert" style={{ color: c.foreground, textAlign: 'right' }}>
        {recovery.problem === 'invalid-events'
          ? `وجدنا بيانات غير صالحة في قائمة الدروس المحفوظة. يمكن استعادة ${recovery.validCount} من الدروس السليمة. الدروس غير الصالحة (${recovery.invalidCount}) ستبقى في نسخة أصلية محفوظة على هذا الجهاز، ولن تُرسل.`
          : 'تعذّرت قراءة قائمة الدروس المحفوظة. لم نحذفها؛ لا يمكن استعادة دروس منها تلقائيًا. يمكنك حفظ نسخة أصلية على هذا الجهاز والمتابعة دون استعادة دروس.'}
      </Text>
      <Pressable disabled={busy} accessibilityRole="button" onPress={recoverOutbox}>
        <Text style={{ color: c.primary, textAlign: 'right' }}>
          {busy ? 'جارٍ حفظ النسخة والاستعادة…' : recovery.validCount
            ? `حفظ النسخة الأصلية واستعادة ${recovery.validCount} درس سليم`
            : 'حفظ النسخة الأصلية والمتابعة'}
        </Text>
      </Pressable>
    </>}
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
