import { describe, expect, it } from "vitest";
import {
  getBriefingMergeDesiredTokens,
  getBriefingMergeMaxTokens,
  getLlmOutputCeiling,
} from "../src/llm/config";

describe("LLM 输出预算策略", () => {
  it("新模型和未知模型不再继承历史 8K 默认上限", () => {
    const stats = { durationMs: 3 * 60 * 60 * 1000, transcriptChars: 120000, segmentCount: 48 };
    const desired = getBriefingMergeDesiredTokens(stats);

    expect(desired).toBeGreaterThan(32000);
    expect(getLlmOutputCeiling({ llmModel: "mimo-v2.5-pro" })).toBe(0);
    expect(getLlmOutputCeiling({ llmModel: "custom-gateway-model" })).toBe(0);
    expect(getBriefingMergeMaxTokens(stats, { llmModel: "custom-gateway-model" })).toBe(desired);
    expect(getBriefingMergeMaxTokens(stats)).toBe(desired);
  });

  it("不再根据模型名称猜测输出上限", () => {
    expect(getLlmOutputCeiling({ llmModel: "deepseek-chat" })).toBe(0);
    expect(getLlmOutputCeiling({ llmModel: "deepseek-v4-pro" })).toBe(0);
    expect(getLlmOutputCeiling({ llmModel: "gpt-4" })).toBe(0);
  });
});
