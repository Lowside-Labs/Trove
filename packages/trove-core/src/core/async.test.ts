import { describe, expect, it, vi } from "vitest";
import { isRateLimitError, retryTask, settleConcurrently } from "./async.js";

describe("core async helpers", () => {
  it("settles concurrent work while preserving input order", async () => {
    const results = await settleConcurrently({
      items: [1, 2, 3],
      concurrency: 2,
      worker: async (value) => {
        if (value === 2) {
          throw new Error("boom");
        }

        await new Promise((resolve) => setTimeout(resolve, value === 1 ? 20 : 0));
        return value * 10;
      },
    });

    expect(results).toEqual([
      { status: "fulfilled", value: 10 },
      expect.objectContaining({ status: "rejected" }),
      { status: "fulfilled", value: 30 },
    ]);
  });

  it("retries retryable work until it succeeds", async () => {
    let attempts = 0;

    const result = await retryTask({
      retries: 2,
      minTimeout: 0,
      maxTimeout: 0,
      factor: 1,
      shouldRetry: isRateLimitError,
      task: async () => {
        attempts += 1;

        if (attempts < 3) {
          throw new Error("request failed with 429: Too many requests");
        }

        return "ok";
      },
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("does not retry non-retryable work", async () => {
    let attempts = 0;
    const onFailedAttempt = vi.fn();

    await expect(
      retryTask({
        retries: 3,
        shouldRetry: isRateLimitError,
        onFailedAttempt,
        task: async () => {
          attempts += 1;
          throw new Error("request failed with 401");
        },
      }),
    ).rejects.toThrow("request failed with 401");

    expect(attempts).toBe(1);
    expect(onFailedAttempt).not.toHaveBeenCalled();
  });
});
