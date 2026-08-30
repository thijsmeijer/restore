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
import { SQLiteExerciseLibraryRepository } from '@/db/repositories/exercise-library-repository';
import type { LibraryExercise } from '@/features/library/library';

type LibraryState =
  | { readonly status: 'loading'; readonly exercises: readonly [] }
  | {
      readonly status: 'ready';
      readonly exercises: readonly LibraryExercise[];
    }
  | { readonly status: 'error'; readonly exercises: readonly [] };

type LibraryContextValue = LibraryState & {
  readonly reload: () => Promise<void>;
  readonly setFavorite: (
    exerciseId: string,
    favorite: boolean,
  ) => Promise<boolean>;
  readonly setAvoided: (
    exerciseId: string,
    avoided: boolean,
  ) => Promise<boolean>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: PropsWithChildren) {
  const sqliteDatabase = useSQLiteContext();
  const repository = useMemo(
    () =>
      new SQLiteExerciseLibraryRepository(
        new ExpoSQLiteConnection(sqliteDatabase),
      ),
    [sqliteDatabase],
  );
  const [state, setState] = useState<LibraryState>({
    status: 'loading',
    exercises: [],
  });

  const reload = useCallback(async () => {
    setState({ status: 'loading', exercises: [] });
    try {
      const exercises = await repository.list();
      setState({ status: 'ready', exercises });
    } catch {
      setState({ status: 'error', exercises: [] });
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    void repository
      .list()
      .then((exercises) => {
        if (active) setState({ status: 'ready', exercises });
      })
      .catch(() => {
        if (active) setState({ status: 'error', exercises: [] });
      });

    return () => {
      active = false;
    };
  }, [repository]);

  const updateLocalPreference = useCallback(
    (
      exerciseId: string,
      update: (item: LibraryExercise) => LibraryExercise,
    ) => {
      setState((current) =>
        current.status !== 'ready'
          ? current
          : {
              status: 'ready',
              exercises: current.exercises.map((item) =>
                item.exercise.id === exerciseId ? update(item) : item,
              ),
            },
      );
    },
    [],
  );

  const setFavorite = useCallback(
    async (exerciseId: string, favorite: boolean): Promise<boolean> => {
      try {
        const result = await repository.setFavorite(exerciseId, favorite);
        if (!result.ok) return false;
        updateLocalPreference(exerciseId, (item) => ({
          ...item,
          preference: { ...item.preference, favorite },
        }));
        return true;
      } catch {
        return false;
      }
    },
    [repository, updateLocalPreference],
  );

  const setAvoided = useCallback(
    async (exerciseId: string, avoided: boolean): Promise<boolean> => {
      try {
        const result = await repository.setAvoided(exerciseId, avoided);
        if (!result.ok) return false;
        updateLocalPreference(exerciseId, (item) => ({
          ...item,
          preference: {
            ...item.preference,
            avoidState: avoided ? 'permanent' : 'none',
            avoidUntil: null,
          },
        }));
        return true;
      } catch {
        return false;
      }
    },
    [repository, updateLocalPreference],
  );

  return (
    <LibraryContext.Provider
      value={{ ...state, reload, setAvoided, setFavorite }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (context === null) {
    throw new Error('useLibrary must be used inside LibraryProvider.');
  }
  return context;
}
