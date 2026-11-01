import type { ForecastTrainingPayload } from '@/api/aiApi';

export type TrainingLogSource = 'system' | 'payload' | 'user' | 'account' | 'transaction' | 'budget' | 'category';
export type TrainingLogEntry = {
  id: number;
  timestamp: number;
  stage: 'data' | 'training' | 'complete';
  status: 'running' | 'info' | 'data' | 'success' | 'warning' | 'error';
  source?: TrainingLogSource;
  userId?: number;
  message: string;
  detail?: string;
};
export type TrainingLogDraft = Omit<TrainingLogEntry, 'id' | 'timestamp'>;
export type TrainingLogLine = Omit<TrainingLogEntry, 'detail'> & { key: string; lineNumber: number };

export const trainingLogSources: Record<TrainingLogSource, string> = {
  system: 'SYSTEM', payload: 'PAYLOAD', user: 'USER', account: 'ACCOUNT',
  transaction: 'TRANSACTION', budget: 'BUDGET', category: 'CATEGORY',
};

/** Serialize every field from the prepared snapshot, including empty collections. */
export function* trainingPayloadLogs(payload: ForecastTrainingPayload, names: ReadonlyMap<number, string>): Generator<TrainingLogDraft> {
  const { users, ...settings } = payload;
  yield { stage: 'data', status: 'data', source: 'payload', message: `payload = ${JSON.stringify(settings)}` };
  const collections = [
    ['accounts', 'account'], ['transactions', 'transaction'], ['budgets', 'budget'], ['categories', 'category'],
  ] as const;
  for (const [userIndex, user] of users.entries()) {
    const { accounts, transactions, budgets, categories, ...metadata } = user;
    const path = `users[${userIndex}]`;
    const name = names.get(user.userId);
    yield { stage: 'data', status: 'info', source: 'user', userId: user.userId,
      message: `${name || `Người dùng #${user.userId}`} · ${accounts.length} tài khoản · ${transactions.length} giao dịch · ${budgets.length} ngân sách · ${categories.length} danh mục` };
    yield { stage: 'data', status: 'data', source: 'user', userId: user.userId, message: `${path} = ${JSON.stringify(metadata)}` };
    for (const [key, source] of collections) {
      if (!user[key].length) {
        yield { stage: 'data', status: 'data', source, userId: user.userId, message: `${path}.${key} = []` };
      }
      for (const [index, record] of user[key].entries()) {
        yield { stage: 'data', status: 'data', source, userId: user.userId,
          message: `${path}.${key}[${index}] = ${JSON.stringify(record)}` };
      }
    }
  }
}

export function trainingLogLines(entries: TrainingLogEntry[]): TrainingLogLine[] {
  let lineNumber = 0;
  return entries.flatMap(entry => [entry.message, ...(entry.detail ? [entry.detail] : [])]
    .flatMap(text => text.split(/\r?\n/))
    .map((message, index) => ({ ...entry, message, key: `${entry.id}:${index}`, lineNumber: ++lineNumber })));
}
