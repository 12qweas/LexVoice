import { describe, expect, it } from "vitest";
import {
  LIVE_ASR_BACKLOG_CRITICAL_MS,
  LIVE_ASR_BACKLOG_WARN_MS,
  LIVE_ASR_CIRCUIT_COOLDOWN_MS,
  classifyLiveAsrBacklog,
  createLiveAsrCircuitState,
  isLiveAsrCircuitOpen,
  recordLiveAsrFailure,
  recordLiveAsrSuccess,
  summarizeLiveAsrJobs,
} from "../src/asr/live-segment-policy";

describe("live ASR segment policy", () => {
  it("summarizes disk-spooled jobs without retaining payloads", () => {
    const now = 100_000;
    const jobs = [
      { id: "a", queuedAtMs: 90_000, sizeBytes: 100, durationMs: 60_000, state: "spooling" as const },
      { id: "b", queuedAtMs: 95_000, sizeBytes: 250, durationMs: 120_000, state: "transcribing" as const },
    ];
    expect(summarizeLiveAsrJobs(jobs, now)).toEqual({
      count: 2,
      totalBytes: 350,
      totalDurationMs: 180_000,
      oldestAgeMs: 10_000,
      spoolingCount: 1,
      queuedCount: 0,
      transcribingCount: 1,
    });
  });

  it("classifies warning and critical backlog by pending audio duration", () => {
    const base = { count: 1, totalBytes: 1, oldestAgeMs: 0, spoolingCount: 0, queuedCount: 1, transcribingCount: 0 };
    expect(classifyLiveAsrBacklog({ ...base, totalDurationMs: LIVE_ASR_BACKLOG_WARN_MS - 1 })).toBe("normal");
    expect(classifyLiveAsrBacklog({ ...base, totalDurationMs: LIVE_ASR_BACKLOG_WARN_MS })).toBe("warning");
    expect(classifyLiveAsrBacklog({ ...base, totalDurationMs: LIVE_ASR_BACKLOG_CRITICAL_MS })).toBe("critical");
  });

  it("opens after three transient failures and resets after success", () => {
    const now = 200_000;
    let state = createLiveAsrCircuitState();
    state = recordLiveAsrFailure(state, "timeout 1", true, now);
    state = recordLiveAsrFailure(state, "timeout 2", true, now + 1);
    expect(isLiveAsrCircuitOpen(state, now + 2)).toBe(false);
    state = recordLiveAsrFailure(state, "429", true, now + 2);
    expect(isLiveAsrCircuitOpen(state, now + 3)).toBe(true);
    expect(state.openUntilMs).toBe(now + 2 + LIVE_ASR_CIRCUIT_COOLDOWN_MS);
    expect(recordLiveAsrSuccess()).toEqual(createLiveAsrCircuitState());
  });

  it("does not open the circuit for deterministic configuration errors", () => {
    const state = recordLiveAsrFailure(createLiveAsrCircuitState(), "missing api key", false, 10);
    expect(state).toEqual(createLiveAsrCircuitState());
  });
});
