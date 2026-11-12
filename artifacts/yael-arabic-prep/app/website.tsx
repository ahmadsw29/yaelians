import React from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/expo';
import { getBillingCatalog } from '@workspace/api-client-react';
import WebWelcome from '@/components/WebWelcome';

export default function Website() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const catalog = useQuery({ queryKey: ['billing-catalog'], queryFn: () => getBillingCatalog(), retry: false });
  return <WebWelcome
    priceLabel={catalog.data?.priceLabel ?? null}
    checkoutEnabled={catalog.data?.checkoutEnabled ?? false}
    loading={catalog.isPending}
    error={catalog.isError ? 'تعذّر تحميل حالة الاشتراك. أعد المحاولة؛ يمكنك إنشاء حساب أو تسجيل الدخول في الأثناء.' : undefined}
    onRetry={() => void catalog.refetch()}
    onStart={() => router.push(isSignedIn ? '/subscribe' : '/(auth)/sign-up')}
    onSignIn={() => router.push(isSignedIn ? '/subscribe' : '/(auth)/sign-in')}
    onPrivacy={() => router.push('/web-policy?section=privacy')}
    onTerms={() => router.push('/web-policy?section=terms')}
  />;
}
