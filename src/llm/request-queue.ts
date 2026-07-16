export type LlmQueueItem<T = unknown> = {
  priority: number;
  seq: number;
  run: () => Promise<T> | T;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  signal?: AbortSignal;
  detachAbort?: () => void;
};

export function createQueueAbortError(): Error {
  const error = new Error("LLM request cancelled");
  error.name = "AbortError";
  return error;
}

export class LlmRequestQueue {
  items: LlmQueueItem[] = [];
  running = 0;
  seq = 0;

  enqueue<T>(priority: number, run: () => Promise<T> | T, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(createQueueAbortError());
    return new Promise<T>((resolve, reject) => {
      const item: LlmQueueItem<T> = {
        priority: Number(priority) || 1,
        seq: ++this.seq,
        run,
        resolve,
        reject,
        signal,
      };
      if (signal) {
        const onAbort = () => {
          const index = this.items.indexOf(item as LlmQueueItem);
          if (index < 0) return;
          this.items.splice(index, 1);
          item.detachAbort?.();
          reject(createQueueAbortError());
        };
        signal.addEventListener("abort", onAbort, { once: true });
        item.detachAbort = () => signal.removeEventListener("abort", onAbort);
      }
      this.items.push(item as LlmQueueItem);
      this.pump();
    });
  }

  pump(): void {
    if (this.running > 0) return;
    const next = this.items
      .sort((a, b) => (a.priority - b.priority) || (a.seq - b.seq))
      .shift();
    if (!next) return;
    next.detachAbort?.();
    this.running += 1;
    void Promise.resolve()
      .then(() => {
        if (next.signal?.aborted) throw createQueueAbortError();
        return next.run();
      })
      .then(next.resolve, next.reject)
      .finally(() => {
        this.running = Math.max(0, this.running - 1);
        this.pump();
      });
  }
}
