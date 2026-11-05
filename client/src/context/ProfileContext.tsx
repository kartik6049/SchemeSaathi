/**
 * Questionnaire state: the user's answers and current step.
 * Persisted to localStorage so a refresh doesn't lose progress (FR-04).
 * Nothing here is ever sent anywhere except POST /api/match.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from '../lib/storage';
import type { Profile, ProfileValue } from '../lib/types';

const KEY = 'ss.profile';

interface Saved {
  answers: Profile;
  step: number;
}

interface ProfileState extends Saved {
  setAnswer: (key: string, value: ProfileValue | undefined) => void;
  setAnswers: (answers: Profile) => void;
  setStep: (step: number) => void;
  reset: () => void;
  hasProgress: boolean;
}

const ProfileContext = createContext<ProfileState | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Saved>(() => storage.get<Saved>(KEY, { answers: {}, step: 1 }));

  useEffect(() => {
    storage.set(KEY, state);
  }, [state]);

  const setAnswer = useCallback((key: string, value: ProfileValue | undefined) => {
    setState((s) => ({ ...s, answers: { ...s.answers, [key]: value } }));
  }, []);
  const setAnswers = useCallback((answers: Profile) => setState((s) => ({ ...s, answers })), []);
  const setStep = useCallback((step: number) => setState((s) => ({ ...s, step })), []);
  const reset = useCallback(() => {
    storage.remove(KEY);
    setState({ answers: {}, step: 1 });
  }, []);

  const value = useMemo<ProfileState>(
    () => ({
      ...state,
      setAnswer,
      setAnswers,
      setStep,
      reset,
      hasProgress: Object.values(state.answers).some((v) => v !== undefined),
    }),
    [state, setAnswer, setAnswers, setStep, reset],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}
