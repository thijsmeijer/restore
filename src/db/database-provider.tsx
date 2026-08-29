import { SQLiteProvider } from 'expo-sqlite';
import type { PropsWithChildren } from 'react';

import { initializeDatabase } from '@/db/initialize-database';

export const restoreDatabaseName = 'restore.db';

export function RestoreDatabaseProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider
      databaseName={restoreDatabaseName}
      onInit={initializeDatabase}
    >
      {children}
    </SQLiteProvider>
  );
}
