import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  requestUrl: vi.fn(),
}));

import { isTransientLlmError, readLlmSseStream } from "../src/llm/core";

describe("LLM transient error classification", () => {
  it("把发送阶段和读取阶段的超时归为可重试", () => {
    expect(isTransientLlmError(new Error("LLM 调用超时：60 秒内没有响应"))).toBe(true);
    expect(isTransientLlmError(new Error("LLM 调用超时：60 秒内没有新数据"))).toBe(true);
    expect(isTransientLlmError(new Error("LLM 响应流中断：未收到正文或结束标记"))).toBe(true);
  });

  it("用户主动取消不能重试", () => {
    const error = new Error("LLM 调用已取消");
    error.name = "AbortError";
    expect(isTransientLlmError(error)).toBe(false);
  });
});

describe("readLlmSseStream completion contract", () => {
  it("连接关闭但没有结束标记时，把已有正文标为 aborted", async () => {
    const res = {
      body: null,
      text: async () => 'data: {"choices":[{"delta":{"content":"半截正文"}}]}\n',
    };
    await expect(readLlmSseStream(res, () => {})).resolves.toEqual({
      content: "半截正文",
      finishReason: "aborted",
    });
  });

  it("没有正文也没有结束标记时显式失败", async () => {
    const res = { body: null, text: async () => "" };
    await expect(readLlmSseStream(res, () => {})).rejects.toThrow("响应流中断");
  });

  it("端点忽略 stream 并返回普通 JSON 时保留正常 finish_reason", async () => {
    const res = {
      body: null,
      text: async () => JSON.stringify({ choices: [{ message: { content: "完整正文" }, finish_reason: "stop" }] }),
    };
    await expect(readLlmSseStream(res, () => {})).resolves.toEqual({
      content: "完整正文",
      finishReason: "stop",
    });
  });
});
