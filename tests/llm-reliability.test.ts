import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  requestUrl: vi.fn(),
}));

import { fetchLlmModelList, getLlmConfigIssue, isTransientLlmError, readLlmSseStream, requestLlmChatCompletion, requestLlmChatCompletionViaObsidian } from "../src/llm/core";
import { DashScopeStreamingClient, OpenAIRealtimeTranscriptionClient, OpenAIRealtimeTranslationClient } from "../src/asr/clients";
import { assertSafeServiceEndpoint, getServiceEndpointSecurityIssue } from "../src/shared/util-llm-endpoint";

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
