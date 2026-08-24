import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  requestUrl: vi.fn(),
}));

import { callLlmWithContinuation, fetchLlmModelList, getLlmConfigIssue, getNextLlmOutputBudget, isLlmContextLimitError, isLlmOutputBudgetError, isLlmOutputParameterError, isTransientLlmError, readLlmSseStream, requestLlmChatCompletion, requestLlmChatCompletionViaObsidian, resolveLlmModelListEndpoint } from "../src/llm/core";
import { applyLearnedLlmCapability, getEffectiveLlmOutputBudget, getLearnedLlmOutputCeiling, getLearnedLlmOutputParameter, rememberLlmOutputCeiling, resetLearnedLlmCapabilities } from "../src/llm/output-budget";
import { DashScopeStreamingClient, OpenAIRealtimeTranscriptionClient, OpenAIRealtimeTranslationClient } from "../src/asr/clients";
import { assertSafeServiceEndpoint, canOmitServiceApiKey, getServiceEndpointSecurityIssue, isLocalLlmEndpoint, isSharedAddressSpaceHost } from "../src/shared/util-llm-endpoint";

describe("service endpoint transport security", () => {
  it("允许公网 HTTPS/WSS", () => {
    expect(getServiceEndpointSecurityIssue("https://api.example.com/v1", "http")).toBe("");
    expect(getServiceEndpointSecurityIssue("wss://api.example.com/realtime", "websocket")).toBe("");
  });

  it("只对明确的本地或私网地址允许 HTTP/WS", () => {
    const localHttpEndpoints = [
      "http://localhost:11434/v1",
      "http://localhost.:11434/v1",
      "http://api.localhost:11434/v1",
      "http://[::ffff:127.0.0.1]:8000/v1",
      "http://127.0.0.2:8000/v1",
      "http://10.0.0.8:8000/v1",
      "http://172.16.0.8:8000/v1",
      "http://192.168.1.8:8000/v1",
      "http://169.254.1.8:8000/v1",
      "http://[fd00::1]:8000/v1",
      "http://[fe80::1]:8000/v1",
      "http://speechbox.local:8000/v1",
    ];
    for (const endpoint of localHttpEndpoints) {
      expect(getServiceEndpointSecurityIssue(endpoint, "http"), endpoint).toBe("");
    }
    expect(getServiceEndpointSecurityIssue("ws://192.168.1.8:9000/realtime", "websocket")).toBe("");
  });

  it("允许 Tailscale 共享地址空间使用 HTTP/WS，但不按本地模型调度", () => {
    const endpoints = [
      "http://100.64.0.0:11434/v1",
      "http://100.100.100.100:11434/v1",
      "http://100.127.255.255:11434/v1",
      "http://[::ffff:6440:1]:11434/v1",
    ];
    for (const endpoint of endpoints) {
      expect(getServiceEndpointSecurityIssue(endpoint, "http"), endpoint).toBe("");
      expect(canOmitServiceApiKey(endpoint), endpoint).toBe(true);
      expect(isLocalLlmEndpoint(endpoint), endpoint).toBe(false);
    }
    expect(getServiceEndpointSecurityIssue("ws://100.64.0.1:9000/realtime", "websocket")).toBe("");
    expect(isSharedAddressSpaceHost("100.64.0.1")).toBe(true);
  });

  it("严格限制 Tailscale 共享地址空间边界", () => {
    for (const endpoint of [
      "http://100.63.255.255:11434/v1",
      "http://100.128.0.0:11434/v1",
    ]) {
      expect(getServiceEndpointSecurityIssue(endpoint, "http"), endpoint).toContain("公网地址必须使用 HTTPS");
      expect(canOmitServiceApiKey(endpoint), endpoint).toBe(false);
    }
  });

  it("阻止公网 HTTP/WS、伪私网地址和错误协议", () => {
    expect(() => assertSafeServiceEndpoint("http://api.example.com/v1", "http", "大模型服务地址"))
      .toThrow("公网地址必须使用 HTTPS");
    expect(() => assertSafeServiceEndpoint("ws://api.example.com/realtime", "websocket", "实时转写服务地址"))
      .toThrow("公网地址必须使用 WSS");
    expect(() => assertSafeServiceEndpoint("http://10.999.1.1/v1", "http"))
      .toThrow("格式无效");
    expect(() => assertSafeServiceEndpoint("ftp://192.168.1.8/model", "http"))
      .toThrow("协议不受支持");
  });

  it("LLM 配置检查会在请求前报告不安全端点", () => {
    expect(getLlmConfigIssue({
      llmEndpoint: "http://api.example.com/v1",
      llmApiKey: "secret",
      llmModel: "model",
    })).toContain("公网地址必须使用 HTTPS");
    expect(getLlmConfigIssue({
      llmEndpoint: "http://127.0.0.1:11434/v1",
      llmApiKey: "",
      llmModel: "model",
    })).toBe("");
    expect(getLlmConfigIssue({
      llmEndpoint: "http://100.100.100.100:11434/v1",
      llmApiKey: "",
      llmModel: "model",
    })).toBe("");
  });

  it("LLM 请求和模型列表在网络调用前阻止公网 HTTP", async () => {
    const plugin = {
      settings: {
        llmEndpoint: "http://api.example.com/v1",
        llmApiKey: "secret",
        llmModel: "model",
      },
    };
    await expect(requestLlmChatCompletion(plugin, [{ role: "user", content: "secret text" }], {}))
      .rejects.toThrow("公网地址必须使用 HTTPS");
    await expect(fetchLlmModelList("http://api.example.com/v1", "secret"))
      .rejects.toThrow("公网地址必须使用 HTTPS");
    await expect(requestLlmChatCompletionViaObsidian(
      "http://api.example.com/v1/chat/completions",
      { Authorization: "Bearer secret" },
      JSON.stringify({ messages: [{ role: "user", content: "secret text" }] }),
      1000,
    )).rejects.toThrow("公网地址必须使用 HTTPS");
  });

  it("所有流式 ASR 客户端都在创建 WebSocket 前阻止公网 WS", async () => {
    const clients = [
      new DashScopeStreamingClient({
        endpoint: "ws://api.example.com/realtime",
        apiKey: "secret",
        model: "model",
      }),
      new OpenAIRealtimeTranscriptionClient({
        endpoint: "ws://api.example.com/realtime",
        apiKey: "secret",
        model: "model",
      }),
      new OpenAIRealtimeTranslationClient({
        endpoint: "ws://api.example.com/realtime",
        apiKey: "secret",
        model: "model",
      }),
    ];
    for (const client of clients) {
      await expect(client.connect()).rejects.toThrow("公网地址必须使用 WSS");
    }
  });
});

describe("LLM 模型列表地址", () => {
  it("使用百炼模型列表接口而不是兼容对话接口下的 models", () => {
    expect(resolveLlmModelListEndpoint("https://dashscope.aliyuncs.com/compatible-mode/v1"))
      .toBe("https://dashscope.aliyuncs.com/api/v1/models");
    expect(resolveLlmModelListEndpoint("https://workspace-123.cn-beijing.maas.aliyuncs.com/compatible-mode/v1"))
      .toBe("https://workspace-123.cn-beijing.maas.aliyuncs.com/api/v1/models");
  });

  it("其他 OpenAI 兼容服务仍使用标准 models 地址", () => {
    expect(resolveLlmModelListEndpoint("https://api.example.com/v1"))
      .toBe("https://api.example.com/v1/models");
  });
});

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

describe("LLM 输出预算兼容", () => {
  it("上下文超限和输出预算拒绝分开处理", () => {
    const contextError = { status: 400, message: "maximum context length exceeded" };
    expect(isLlmContextLimitError(contextError)).toBe(true);
    expect(isLlmOutputBudgetError(contextError)).toBe(false);
    expect(isLlmOutputBudgetError({ status: 400, message: "max_tokens is too large" })).toBe(true);
  });

  it("只在服务端明确要求时切换 max_completion_tokens", () => {
    expect(isLlmOutputParameterError({
      status: 400,
      message: "max_tokens is not supported for this model; use max_completion_tokens instead",
    })).toBe(true);
    expect(isLlmOutputParameterError({ status: 400, message: "max_tokens is too large" })).toBe(false);
  });

  it("记忆的是端点实际能力，不按模型名称预置", () => {
    resetLearnedLlmCapabilities();
    const settings = { llmEndpoint: "https://llm.example/v1", llmModel: "future-model" };
    expect(getLearnedLlmOutputCeiling(settings)).toBe(0);
    expect(getLearnedLlmOutputParameter(settings)).toBe("max_tokens");
  });

  it("能力缓存只会收紧，不会因一次较小成功请求误判上限", () => {
    resetLearnedLlmCapabilities();
    const settings = { llmEndpoint: "https://llm.example/v1", llmModel: "future-model" };
    rememberLlmOutputCeiling(settings, 64000);
    expect(getEffectiveLlmOutputBudget(settings, { payload: { max_tokens: 128000 } })).toBe(64000);
    expect(applyLearnedLlmCapability(settings, { max_tokens: 128000 }).max_tokens).toBe(64000);
    rememberLlmOutputCeiling(settings, 128000);
    expect(getLearnedLlmOutputCeiling(settings)).toBe(64000);
  });

  it("只把明确的输出预算错误识别为可降档", () => {
    expect(isLlmOutputBudgetError({ status: 400, message: "max_tokens is too large" })).toBe(true);
    expect(isLlmOutputBudgetError({ status: 400, message: "invalid api key" })).toBe(false);
    expect(isLlmOutputBudgetError({ status: 413, message: "output token limit" })).toBe(false);
  });

  it("输出预算按有限阶梯降档，不无限重试", () => {
    expect(getNextLlmOutputBudget({ payload: { max_tokens: 600000 } })).toBe(384000);
    expect(getNextLlmOutputBudget({ payload: { max_tokens: 128000 } })).toBe(64000);
    expect(getNextLlmOutputBudget({ payload: { max_tokens: 8192 } })).toBe(4096);
    expect(getNextLlmOutputBudget({ payload: { max_tokens: 4096 } })).toBe(0);
  });
});

describe("最终纪要截断恢复", () => {
  it("首次 length 且正文为空时关闭深度思考并继续恢复正文", async () => {
    const responses = [
      { choices: [{ message: { content: "" }, finish_reason: "length" }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, completion_tokens_details: { reasoning_tokens: 5 } } },
      { choices: [{ message: { content: "" }, finish_reason: "length" }], usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14, completion_tokens_details: { reasoning_tokens: 4 } } },
      { choices: [{ message: { content: "恢复后的完整正文" }, finish_reason: "stop" }], usage: { prompt_tokens: 12, completion_tokens: 6, total_tokens: 18 } },
    ];
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => responses.shift(),
    }));
    vi.stubGlobal("window", {
      fetch: fetchMock,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    });
    try {
      const plugin = {
        settings: {
          llmEndpoint: "https://api.deepseek.com",
          llmApiKey: "test-key",
          llmModel: "deepseek-v4-flash",
          thinkingMode: "reasoning",
        },
        addTaskMeter: vi.fn(),
      };
      const result = await callLlmWithContinuation(
        plugin,
        "system",
        "user",
        { stream: false, thinkingMode: "reasoning", payload: { max_tokens: 128000 } },
        { maxContinuations: 3 },
      );

      expect(result).toMatchObject({
        text: "恢复后的完整正文",
        finishReason: "stop",
        truncated: false,
        continuations: 1,
        continuationAttempts: 1,
        usage: {
          promptTokens: 32,
          completionTokens: 15,
          reasoningTokens: 9,
          totalTokens: 47,
        },
      });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("空续写只计尝试次数并记录明确诊断", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "" }, finish_reason: "length" }] }),
    }));
    vi.stubGlobal("window", {
      fetch: fetchMock,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    });
    try {
      const logDiagnostic = vi.fn(async () => undefined);
      const result = await callLlmWithContinuation({
        settings: {
          llmEndpoint: "https://api.deepseek.com",
          llmApiKey: "test-key",
          llmModel: "deepseek-v4-flash",
          thinkingMode: "reasoning",
        },
        logDiagnostic,
      }, "system", "user", { stream: false, thinkingMode: "reasoning" }, { maxContinuations: 1 });

      expect(result).toMatchObject({ text: "", truncated: true, continuations: 0, continuationAttempts: 1 });
      expect(logDiagnostic.mock.calls.map((call) => call[1])).toContain("llm.continuation_empty");
    } finally {
      vi.unstubAllGlobals();
    }
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
      usage: null,
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
      usage: null,
    });
  });

  it("流式响应保留 token 与 reasoning 用量", async () => {
    const res = {
      body: null,
      text: async () => [
        'data: {"choices":[{"delta":{"content":"正文"}}]}',
        'data: {"choices":[{"finish_reason":"stop"}],"usage":{"prompt_tokens":20,"completion_tokens":8,"total_tokens":28,"completion_tokens_details":{"reasoning_tokens":3}}}',
        "data: [DONE]",
      ].join("\n"),
    };
    await expect(readLlmSseStream(res, () => {})).resolves.toMatchObject({
      content: "正文",
      finishReason: "stop",
      usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 },
    });
  });
});
