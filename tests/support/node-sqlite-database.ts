import { DatabaseSync } from 'node:sqlite';

import type {
  DatabaseConnection,
  DatabaseExecutor,
  DatabaseRunResult,
  DatabaseValue,
} from '@/db/database';

function bindValues(
  values: readonly DatabaseValue[],
): (string | number | null | Uint8Array)[] {
  return [...values];
}

export class NodeSQLiteDatabase implements DatabaseConnection {
  private readonly database = new DatabaseSync(':memory:');

  public async execAsync(sql: string): Promise<void> {
    this.database.exec(sql);
  }

  public async runAsync(
    sql: string,
    ...params: readonly DatabaseValue[]
  ): Promise<DatabaseRunResult> {
    const result = this.database.prepare(sql).run(...bindValues(params));
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid),
    };
  }

  public async getFirstAsync<T>(
    sql: string,
    ...params: readonly DatabaseValue[]
  ): Promise<T | null> {
    const row = this.database.prepare(sql).get(...bindValues(params));
    return row === undefined ? null : (row as T);
  }

  public async getAllAsync<T>(
    sql: string,
    ...params: readonly DatabaseValue[]
  ): Promise<T[]> {
    return this.database.prepare(sql).all(...bindValues(params)) as T[];
  }

  public async withExclusiveTransactionAsync(
    task: (transaction: DatabaseExecutor) => Promise<void>,
  ): Promise<void> {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      await task(this);
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  public close(): void {
    this.database.close();
  }
}
