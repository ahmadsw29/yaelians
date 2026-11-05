import React, { useEffect, useRef, useState } from 'react';
import { formatDisplayDateTime } from '@/lib/display-numbers';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { getTimedSession, saveTimedSession, useGetTimedSession } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { getStudyAuthOptions } from '@/lib/study-auth';
import { catchUp, loadSourceSession, parseSourceSession, storageKey, type SourceMode, type SourceSession, type SourceSessionExam } from '@/lib/source-session';
import { restatementSessionKey } from '@/lib/restatement-practice';

type Action = 'backup' | 'restore' | 'guest';
type Props = {
  userId?: string; exam: SourceSessionExam; mode: SourceMode; section: number | null; focused: boolean;
  session: SourceSession | null;
  onRestore: (session: SourceSession) => Promise<void>;
  loadGuest?: () => Promise<string | null>;
};

export default function SourceSessionBackup({ userId, exam, mode, section, focused, session, onRestore, loadGuest }: Props) {
  const c = useColors();
  const router = useRouter();
  const { session: authSession } = useSession();
  const identity = useRef(authSession);
  identity.current = authSession;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const queryClient = useQueryClient();
  const slot = `${exam.id}:${mode}:${mode === 'training' ? section : 'all'}:${focused ? 'restatement' : 'mixed'}`;
  const queryKey = ['timed-backup', userId, slot];
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(!session);
  const active = () => alive.current && identity.current?.user.id === userId;
  const options = () => getStudyAuthOptions(() => identity.current ?? null, userId ?? null, active);
  const backup = useGetTimedSession(slot, { query: {
    queryKey, enabled: !!userId, retry: false, staleTime: 0,
    queryFn: async () => {
      const value = await getTimedSession(slot, await options());
      if (!active()) throw new Error('Account changed');
      return value;
    },
  } });

  async function confirm() {
    if (!action || busy || !userId) return;
    const selected = action;
    setAction(null); setBusy(true); setMessage('');
    try {
      if (selected === 'backup') {
        if (!session || !backup.data || backup.isError) throw new Error('Backup unavailable');
        const saved = await saveTimedSession(slot, {
          revision: backup.data.revision, session: JSON.stringify(catchUp(session, Date.now())),
        }, await options());
        if (!active()) return;
        queryClient.setQueryData(queryKey, saved);
        setMessage('حُفظت نسخة في حسابك. أعد النسخ بعد أي تغييرات جديدة.');
      } else {
        let raw: string | null;
        if (selected === 'guest') {
          raw = loadGuest ? await loadGuest()
            : await loadSourceSession(restatementSessionKey(storageKey(undefined, exam.id, mode, section), focused));
        } else {
          const latest = await getTimedSession(slot, await options());
          if (!active()) return;
          queryClient.setQueryData(queryKey, latest);
          raw = latest.session;
        }
        if (!active()) return;
        if (!raw) { setMessage(selected === 'guest' ? 'لا توجد محاولة ضيف محفوظة لهذا القسم على الجهاز.' : 'لا توجد نسخة محفوظة لهذا القسم في حسابك.'); return; }
        const restored = catchUp(parseSourceSession(raw, exam, mode, section), Date.now());
        await onRestore(restored);
        if (!active()) return;
        setMessage(selected === 'guest'
          ? 'نُسخت محاولة الضيف إلى جلسة حسابك على هذا الجهاز فقط. اضغط «نسخ إلى الحساب» لنقلها للسحابة. بقي الأصل دون تغيير.'
          : 'استُعيدت النسخة من حسابك مع المواعيد الأصلية؛ قد ينتهي الوقت أثناء غيابك.');
      }
    } catch (error) {
      if (!active()) return;
      if (typeof error === 'object' && error !== null && 'status' in error && error.status === 409) {
        // Never silently overwrite another device. Refresh, then require a new
        // explicit replacement choice using the updated revision.
        await backup.refetch();
        if (active()) setMessage('تغيّرت النسخة على جهاز آخر. استعدها أولًا أو اختر النسخ مجددًا لاستبدالها عمدًا.');
      } else setMessage('تعذّرت العملية. لم تُحذف المحاولة الأصلية. تحقق من الاتصال وصلاحية الجلسة ثم أعد المحاولة.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const styles = StyleSheet.create({
    card: { padding: 16, gap: 10, borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.card },
    text: { color: c.foreground, textAlign: 'right', fontSize: 14, lineHeight: 22 },
    button: { padding: 12, borderWidth: 1, borderColor: c.primary, borderRadius: 12 },
    label: { color: c.primary, textAlign: 'center', fontWeight: '700' },
  });
  function button(label: string, press: () => void, id: string, disabled = false) {
    return <Pressable testID={id} accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy} onPress={press} style={[styles.button, (disabled || busy) && { opacity: 0.5 }]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>;
  }
  return <View style={styles.card}>
    {button(expanded ? 'إخفاء النسخ والاستعادة' : 'النسخ والاستعادة عبر الأجهزة', () => setExpanded(!expanded), 'timed-toggle')}
    {expanded && <>
    <Text style={styles.text}>نسخة احتياطية للتدريب المؤقّت • منفصلة عن إحصاءات التعلّم</Text>
    {!userId ? <>
      <Text style={styles.text}>محاولات الضيف تبقى على هذا الجهاز. سجّل الدخول ثم اختر «نقل محاولة الضيف» داخل القسم لنقلها بإذنك.</Text>
      {button('تسجيل الدخول', () => router.push('/(auth)/sign-in'), 'timed-sign-in')}
    </> : <>
      <Text style={styles.text}>{busy ? 'جارٍ تنفيذ العملية…' : backup.isPending ? 'جارٍ التحقق من نسخة الحساب…'
        : backup.isError ? 'تعذّر التحقق من نسخة الحساب. المحاولة المحلية لم تتغيّر.'
        : backup.data?.savedAt ? `آخر نسخة للحساب: ${formatDisplayDateTime(backup.data.savedAt)} • التغييرات اللاحقة محلية حتى تنسخها مجددًا.`
        : 'لا توجد نسخة للحساب لهذا القسم حتى الآن.'}</Text>
      {button('تحديث حالة النسخة', () => { void backup.refetch(); }, 'timed-refresh', backup.isFetching)}
      {button('نسخ إلى الحساب', () => setAction('backup'), 'timed-backup', !session || !backup.data || backup.isError || backup.isFetching)}
      {button('استعادة من الحساب', () => setAction('restore'), 'timed-restore', !backup.data?.session || backup.isError)}
      {button('نقل محاولة الضيف من هذا الجهاز', () => setAction('guest'), 'timed-import-guest')}
      {action && <View style={{ gap: 10 }}>
        <Text accessibilityRole="alert" style={styles.text}>{action === 'backup'
          ? 'سيستبدل هذا آخر نسخة لهذا القسم في حسابك بمحاولتك الحالية. لا تُضاف نقاط أو إحصاءات.'
          : action === 'guest' ? 'ستستبدل محاولة الضيف محاولتك المحلية لهذا الحساب. يبقى أصل الضيف ونسخة السحابة دون تغيير حتى تختار النسخ.'
          : 'ستستبدل نسخة الحساب محاولتك المحلية لهذا القسم. لا يبدأ الوقت من جديد؛ تبقى المواعيد الأصلية.'}</Text>
        {button('تأكيد', () => { void confirm(); }, 'timed-confirm')}
        {button('إلغاء', () => setAction(null), 'timed-cancel')}
      </View>}
    </>}
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>}
    </>}
  </View>;
}
