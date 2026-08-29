import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  DatabaseConnection,
  DatabaseExecutor,
  DatabaseRunResult,
  DatabaseValue,
} from '@/db/database';

type ExpoDatabaseExecutor = Pick<
  SQLiteDatabase,
  'execAsync' | 'getAllAsync' | 'getFirstAsync' | 'runAsync'
>;

class ExpoSQLiteExecutor implements DatabaseExecutor {
  public constructor(private readonly database: ExpoDatabaseExecutor) {}

  public execAsync(sql: string): Promise<void> {
    return this.database.execAsync(sql);
  }

  public async runAsync(
    sql: string,
    ...params: readonly DatabaseValue[]
  ): Promise<DatabaseRunResult> {
    return this.database.runAsync(sql, ...params);
  }

  public getFirstAsync<T>(
    sql: string,
    ...params: readonly DatabaseValue[]
  ): Promise<T | null> {
    return this.database.getFirstAsync<T>(sql, ...params);
  }

  public getAllAsync<T>(
    sql: string,
    ...params: readonly DatabaseValue[]
  ): Promise<T[]> {
    return this.database.getAllAsync<T>(sql, ...params);
  }
}

export class ExpoSQLiteConnection
  extends ExpoSQLiteExecutor
  implements DatabaseConnection
{
  public constructor(private readonly sqliteDatabase: SQLiteDatabase) {
    super(sqliteDatabase);
  }

  public withExclusiveTransactionAsync(
    task: (transaction: DatabaseExecutor) => Promise<void>,
  ): Promise<void> {
    return this.sqliteDatabase.withExclusiveTransactionAsync(
      async (transaction) => {
        await task(new ExpoSQLiteExecutor(transaction));
      },
    );
  }
}
