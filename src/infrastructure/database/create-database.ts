import { DatabaseUnavailableError, type SqlDriver } from './sql-driver';

export const DATABASE_NAME = 'seekora.db';

export async function openKnowledgeDatabase(): Promise<SqlDriver> {
  throw new DatabaseUnavailableError('The offline library needs an Android or iOS build. It is unavailable in the web preview.');
}
