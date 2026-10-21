import { Text, View } from 'react-native';
import { useAuth } from '@clerk/expo';
import FlashcardsScreen from '@/components/FlashcardsScreen';
import { useColors } from '@/hooks/useColors';

export default function FlashcardsRoute() {
  const { userId, isLoaded } = useAuth();
  const c = useColors();
  if (!isLoaded || !userId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: c.background }}>
        <Text style={{ color: c.mutedForeground, textAlign: 'center', writingDirection: 'rtl' }}>{isLoaded ? 'سجّل الدخول لتستخدم البطاقات.' : 'جارٍ التحميل…'}</Text>
      </View>
    );
  }
  return <FlashcardsScreen key={userId} userId={userId} />;
}
