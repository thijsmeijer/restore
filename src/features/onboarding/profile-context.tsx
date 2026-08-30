import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ExpoSQLiteConnection } from '@/db/expo-sqlite-adapter';
import { SQLiteUserProfileRepository } from '@/db/repositories/user-profile-repository';
import type {
  OnboardingProfileInput,
  SaveProfileResult,
  UserProfile,
} from '@/features/onboarding/profile';

type ProfileState =
  | { readonly status: 'loading'; readonly profile: null }
  | { readonly status: 'ready'; readonly profile: UserProfile | null }
  | { readonly status: 'error'; readonly profile: null };

type ProfileContextValue = ProfileState & {
  readonly reload: () => Promise<void>;
  readonly save: (input: OnboardingProfileInput) => Promise<SaveProfileResult>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: PropsWithChildren) {
  const sqliteDatabase = useSQLiteContext();
  const repository = useMemo(
    () =>
      new SQLiteUserProfileRepository(new ExpoSQLiteConnection(sqliteDatabase)),
    [sqliteDatabase],
  );
  const [state, setState] = useState<ProfileState>({
    status: 'loading',
    profile: null,
  });

  const reload = useCallback(async () => {
    setState({ status: 'loading', profile: null });
    try {
      const profile = await repository.get();
      setState({ status: 'ready', profile });
    } catch {
      setState({ status: 'error', profile: null });
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    void repository
      .get()
      .then((profile) => {
        if (active) setState({ status: 'ready', profile });
      })
      .catch(() => {
        if (active) setState({ status: 'error', profile: null });
      });

    return () => {
      active = false;
    };
  }, [repository]);

  const save = useCallback(
    async (input: OnboardingProfileInput): Promise<SaveProfileResult> => {
      const result = await repository.save(input);
      if (result.ok) {
        setState({ status: 'ready', profile: result.profile });
      }
      return result;
    },
    [repository],
  );

  return (
    <ProfileContext.Provider value={{ ...state, reload, save }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (context === null) {
    throw new Error('useProfile must be used inside ProfileProvider.');
  }
  return context;
}
