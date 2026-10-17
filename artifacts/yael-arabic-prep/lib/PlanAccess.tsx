import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useAuth, useClerk } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import {
  chooseStudyPlan, claimStudyActivity, getStudyPlanAccess, useGetStudyPlanAccess,
  type StudyPlanAccess,
  type StudyActivityClaimResult,
} from '@workspace/api-client-react';
import { getStudyAuthOptions } from './study-auth';

export type SelectedPlan = StudyPlanAccess['plan'];
type Activity = 'vocabulary' | 'timed-section';
type DailyUse = StudyPlanAccess['usage'];
type AccessContextValue = {
  ready: boolean;
  plan: SelectedPlan;
  isPremium: boolean;
  usage: DailyUse;
  chooseFree: () => Promise<void>;
  claimActivity: (activity: Activity, key: string) => Promise<boolean>;
  startVocabularyRound: (key: string) => Promise<StudyActivityClaimResult>;
};

const emptyUsage = (): DailyUse => ({
  date: new Date().toISOString().slice(0, 10),
  vocabularyRounds: 0,
  timedSections: 0,
  timedKeys: [],
});
const AccessContext = createContext<AccessContextValue | null>(null);

export function PlanAccessProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const clerk = useClerk();
  const client = useQueryClient();
  const queryKey = ['plan-access', userId];
  const authOptions = useCallback(() => getStudyAuthOptions(
    () => clerk.session ?? null,
    userId ?? null,
    () => true,
  ), [clerk, userId]);
  const query = useGetStudyPlanAccess({
    query: {
      queryKey,
      enabled: isLoaded && !!userId,
      retry: false,
      queryFn: async ({ signal }) => getStudyPlanAccess({ ...await authOptions(), signal }),
    },
  });

  const chooseFree = useCallback(async () => {
    if (!userId) throw new Error('Sign in before saving a plan.');
    const response = await chooseStudyPlan({ plan: 'free' }, await authOptions());
    client.setQueryData(queryKey, response);
  }, [authOptions, client, userId]);

  const claimActivity = useCallback(async (activity: Activity, key: string) => {
    if (!userId) return false;
    const response = await claimStudyActivity({ activity, key }, await authOptions());
    client.setQueryData(queryKey, response.access);
    return response.allowed;
  }, [authOptions, client, userId]);
  const startVocabularyRound = useCallback(async (key: string) => {
    if (!userId) throw new Error('Sign in before starting practice.');
    const response = await claimStudyActivity({ activity: 'vocabulary', key }, await authOptions());
    client.setQueryData(queryKey, response.access);
    return response;
  }, [authOptions, client, userId]);

  const ready = isLoaded && (!userId || query.isSuccess || query.isError);
  const value = useMemo<AccessContextValue>(() => ({
    ready,
    plan: query.data?.plan ?? null,
    isPremium: query.data?.plan === 'premium',
    usage: query.data?.usage ?? emptyUsage(),
    chooseFree,
    claimActivity,
    startVocabularyRound,
  }), [ready, query.data, chooseFree, claimActivity, startVocabularyRound]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function usePlanAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error('PlanAccessProvider missing');
  return value;
}
