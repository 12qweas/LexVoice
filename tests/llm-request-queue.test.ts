import { describe, expect, it, vi } from "vitest";
import { LlmRequestQueue } from "../src/llm/request-queue";

describe("LlmRequestQueue", () => {
  it("removes an aborted request before it starts", async () => {
    const queue = new LlmRequestQueue();
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const first = queue.enqueue(1, async () => {
      await firstGate;
      return "first";
    });
    const controller = new AbortController();
    const secondRun = vi.fn(async () => "second");
    const second = queue.enqueue(2, secondRun, controller.signal);

    controller.abort();
    await expect(second).rejects.toMatchObject({ name: "AbortError" });
    expect(secondRun).not.toHaveBeenCalled();
    expect(queue.items).toHaveLength(0);

    releaseFirst();
    await expect(first).resolves.toBe("first");
  });

  it("rejects an already-aborted request without enqueueing it", async () => {
    const queue = new LlmRequestQueue();
    const controller = new AbortController();
    controller.abort();
    const run = vi.fn(async () => "never");

    await expect(queue.enqueue(1, run, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(run).not.toHaveBeenCalled();
    expect(queue.items).toHaveLength(0);
  });
});
