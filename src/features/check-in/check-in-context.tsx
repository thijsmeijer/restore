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
import { SQLiteCheckInRepository } from '@/db/repositories/check-in-repository';
import type {
  CheckIn,
  CheckInInput,
  SaveCheckInResult,
} from '@/features/check-in/check-in';

type CheckInState =
  | { readonly status: 'loading'; readonly latest: null }
  | { readonly status: 'ready'; readonly latest: CheckIn | null }
  | { readonly status: 'error'; readonly latest: null };

type CheckInContextValue = CheckInState & {
  readonly reload: () => Promise<void>;
  readonly save: (input: CheckInInput) => Promise<SaveCheckInResult>;
};

const CheckInContext = createContext<CheckInContextValue | null>(null);

export function CheckInProvider({ children }: PropsWithChildren) {
  const sqliteDatabase = useSQLiteContext();
  const repository = useMemo(
    () => new SQLiteCheckInRepository(new ExpoSQLiteConnection(sqliteDatabase)),
    [sqliteDatabase],
  );
  const [state, setState] = useState<CheckInState>({
    status: 'loading',
    latest: null,
  });

  const reload = useCallback(async () => {
    setState({ status: 'loading', latest: null });
    try {
      const latest = await repository.getLatest();
      setState({ status: 'ready', latest });
    } catch {
      setState({ status: 'error', latest: null });
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    void repository
      .getLatest()
      .then((latest) => {
        if (active) setState({ status: 'ready', latest });
      })
      .catch(() => {
        if (active) setState({ status: 'error', latest: null });
      });

    return () => {
      active = false;
    };
  }, [repository]);

  const save = useCallback(
    async (input: CheckInInput): Promise<SaveCheckInResult> => {
      const result = await repository.save(input);
      if (result.ok) {
        setState({ status: 'ready', latest: result.checkIn });
      }
      return result;
    },
    [repository],
  );

  return (
    <CheckInContext.Provider value={{ ...state, reload, save }}>
      {children}
    </CheckInContext.Provider>
  );
}

export function useCheckIns(): CheckInContextValue {
  const context = useContext(CheckInContext);
  if (context === null) {
    throw new Error('useCheckIns must be used inside CheckInProvider.');
  }
  return context;
}
