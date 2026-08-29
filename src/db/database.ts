export type DatabaseValue = string | number | null | Uint8Array;

export interface DatabaseRunResult {
  readonly changes: number;
  readonly lastInsertRowId: number;
}

export interface DatabaseExecutor {
  execAsync(sql: string): Promise<void>;
  runAsync(
    sql: string,
    ...params: readonly DatabaseValue[]
  ): Promise<DatabaseRunResult>;
  getFirstAsync<T>(
    sql: string,
    ...params: readonly DatabaseValue[]
  ): Promise<T | null>;
  getAllAsync<T>(
    sql: string,
    ...params: readonly DatabaseValue[]
  ): Promise<T[]>;
}

export interface DatabaseConnection extends DatabaseExecutor {
  withExclusiveTransactionAsync(
    task: (transaction: DatabaseExecutor) => Promise<void>,
  ): Promise<void>;
}
