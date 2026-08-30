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
import { SQLiteExerciseLibraryRepository } from '@/db/repositories/exercise-library-repository';
import { SQLiteGenerationCatalogRepository } from '@/db/repositories/generation-catalog-repository';
import { SQLiteRoutineRepository } from '@/db/repositories/routine-repository';
import { SQLiteUserProfileRepository } from '@/db/repositories/user-profile-repository';
import { useCheckIns } from '@/features/check-in/check-in-context';
import {
  DefaultRoutineService,
  type RoutineDetails,
  type RoutineOperationFailureCode,
  type RoutineOperationResult,
  type RoutineService,
} from '@/features/routine/routine-service';

type RoutineState = {
  readonly status: 'loading' | 'ready' | 'working' | 'error';
  readonly details: RoutineDetails | null;
  readonly failureCode: RoutineOperationFailureCode | null;
};

type RoutineContextValue = RoutineState & {
  readonly reloadLatest: () => Promise<void>;
  readonly loadById: (routineId: string) => Promise<boolean>;
  readonly generate: () => Promise<RoutineOperationResult>;
  readonly regenerate: (routineId: string) => Promise<RoutineOperationResult>;
  readonly replace: (
    routineId: string,
    itemOrder: number,
    replacementExerciseId: string,
  ) => Promise<RoutineOperationResult>;
};

const RoutineContext = createContext<RoutineContextValue | null>(null);

function createRoutineService(
  database: ConstructorParameters<typeof ExpoSQLiteConnection>[0],
): RoutineService {
  const connection = new ExpoSQLiteConnection(database);
  return new DefaultRoutineService({
    routines: new SQLiteRoutineRepository(connection),
    checkIns: new SQLiteCheckInRepository(connection),
    profiles: new SQLiteUserProfileRepository(connection),
    library: new SQLiteExerciseLibraryRepository(connection),
    catalog: new SQLiteGenerationCatalogRepository(connection),
  });
}

export function RoutineProvider({ children }: PropsWithChildren) {
  const sqliteDatabase = useSQLiteContext();
  const checkIns = useCheckIns();
  const service = useMemo(
    () => createRoutineService(sqliteDatabase),
    [sqliteDatabase],
  );
  const [state, setState] = useState<RoutineState>({
    status: 'loading',
    details: null,
    failureCode: null,
  });

  const readLatest = useCallback(async (): Promise<RoutineState> => {
    if (checkIns.status !== 'ready' || checkIns.latest === null) {
      return { status: 'ready', details: null, failureCode: null };
    }
    try {
      const existing = await service.getLatestForCheckIn(checkIns.latest.id);
      if (existing !== null) {
        return { status: 'ready', details: existing, failureCode: null };
      }
      const result = await service.generateLatest();
      return result.ok
        ? { status: 'ready', details: result.details, failureCode: null }
        : { status: 'ready', details: null, failureCode: result.code };
    } catch {
      return { status: 'error', details: null, failureCode: null };
    }
  }, [checkIns.latest, checkIns.status, service]);

  useEffect(() => {
    let active = true;
    void readLatest().then((nextState) => {
      if (active) setState(nextState);
    });
    return () => {
      active = false;
    };
  }, [readLatest]);

  const resolveLatest = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading' }));
    setState(await readLatest());
  }, [readLatest]);

  const loadById = useCallback(
    async (routineId: string): Promise<boolean> => {
      setState((current) => ({ ...current, status: 'loading' }));
      try {
        const details = await service.getById(routineId);
        setState({ status: 'ready', details, failureCode: null });
        return details !== null;
      } catch {
        setState({ status: 'error', details: null, failureCode: null });
        return false;
      }
    },
    [service],
  );

  const perform = useCallback(
    async (
      operation: () => Promise<RoutineOperationResult>,
    ): Promise<RoutineOperationResult> => {
      setState((current) => ({ ...current, status: 'working' }));
      try {
        const result = await operation();
        setState(
          result.ok
            ? { status: 'ready', details: result.details, failureCode: null }
            : {
                status: 'ready',
                details: state.details,
                failureCode: result.code,
              },
        );
        return result;
      } catch {
        const result = {
          ok: false,
          code: 'routine_operation_failed',
        } as const;
        setState((current) => ({ ...current, status: 'error' }));
        return result;
      }
    },
    [state.details],
  );

  const generate = useCallback(
    () => perform(() => service.generateLatest()),
    [perform, service],
  );
  const regenerate = useCallback(
    (routineId: string) => perform(() => service.regenerate(routineId)),
    [perform, service],
  );
  const replace = useCallback(
    (routineId: string, itemOrder: number, replacementExerciseId: string) =>
      perform(() =>
        service.replace(routineId, itemOrder, replacementExerciseId),
      ),
    [perform, service],
  );

  return (
    <RoutineContext.Provider
      value={{
        ...state,
        generate,
        loadById,
        regenerate,
        reloadLatest: resolveLatest,
        replace,
      }}
    >
      {children}
    </RoutineContext.Provider>
  );
}

export function useRoutines(): RoutineContextValue {
  const context = useContext(RoutineContext);
  if (context === null) {
    throw new Error('useRoutines must be used inside RoutineProvider.');
  }
  return context;
}
