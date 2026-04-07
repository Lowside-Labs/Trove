import PQueue from "p-queue";
import pRetry, { AbortError } from "p-retry";

export interface SettleConcurrentlyOptions<TInput, TResult> {
  items: readonly TInput[];
  concurrency: number;
  worker: (item: TInput, index: number) => Promise<TResult>;
}

export async function settleConcurrently<TInput, TResult>({
  items,
  concurrency,
  worker,
}: SettleConcurrentlyOptions<TInput, TResult>): Promise<PromiseSettledResult<TResult>[]> {
  const queue = new PQueue({ concurrency: Math.max(1, concurrency) });

  return Promise.all(
    items.map((item, index) =>
      queue.add(async () => {
        try {
          const value = await worker(item, index);
          return { status: "fulfilled", value } satisfies PromiseFulfilledResult<TResult>;
        } catch (reason) {
          return { status: "rejected", reason } satisfies PromiseRejectedResult;
        }
      }),
    ),
  );
}

export interface RetryTaskOptions<T> {
  task: () => Promise<T>;
  retries: number;
  shouldRetry?: (error: unknown) => boolean;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
  onFailedAttempt?: (args: { error: unknown; attemptNumber: number; retriesLeft: number }) => void;
}

export async function retryTask<T>({
  task,
  retries,
  shouldRetry,
  minTimeout = 500,
  maxTimeout = 5_000,
  factor = 2,
  onFailedAttempt,
}: RetryTaskOptions<T>): Promise<T> {
  return pRetry(
    async () => {
      try {
        return await task();
      } catch (error) {
        if (shouldRetry && !shouldRetry(error)) {
          throw new AbortError(error instanceof Error ? error : new Error(String(error)));
        }
        throw error;
      }
    },
    {
      retries,
      minTimeout,
      maxTimeout,
      factor,
      randomize: true,
      onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
        onFailedAttempt?.({ error, attemptNumber, retriesLeft });
      },
    },
  );
}

export function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b429\b/.test(message) || /too many requests/i.test(message);
}
