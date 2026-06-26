// 思考档参数注入的纯函数回归测试。运行：npm test
import { describe, it, expect } from "vitest";
import { getThinkingControl, applyThinkingParam } from "../src/llm/thinking";

describe("getThinkingControl（能不能调节 + 属于哪个参数家族）", () => {
  it("enable_thinking 家族：MiMo / 硅基 / 百炼", () => {
    expect(getThinkingControl("https://api.xiaomimimo.com/v1", "mimo-v2.5-pro")?.family).toBe("enable_thinking");
    expect(getThinkingControl("https://api.siliconflow.cn/v1/chat/completions", "Qwen/Qwen3-32B")?.family).toBe("enable_thinking");
    expect(getThinkingControl("https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen3-235b")?.family).toBe("enable_thinking");
  });
  it("thinking:{type} 家族：DeepSeek / 火山 / 智谱", () => {
    expect(getThinkingControl("https://api.deepseek.com", "deepseek-reasoner")?.family).toBe("thinking_type");
    expect(getThinkingControl("https://ark.cn-beijing.volces.com/api/v3", "doubao-seed-1-6")?.family).toBe("thinking_type");
    expect(getThinkingControl("https://open.bigmodel.cn/api/paas/v4", "glm-4.6")?.family).toBe("thinking_type");
  });
  it("reasoning_effort 家族：仅推理模型可控", () => {
    expect(getThinkingControl("https://api.openai.com/v1", "gpt-5.5")?.family).toBe("reasoning_effort");
    expect(getThinkingControl("https://api.openai.com/v1", "o3")?.family).toBe("reasoning_effort");
    // 非推理模型（gpt-4o）→ 不可控
    expect(getThinkingControl("https://api.openai.com/v1", "gpt-4o")).toBeNull();
  });
  it("未知服务 → 不可控（null，UI 应灰掉）", () => {
    expect(getThinkingControl("https://api.example.com/v1", "some-model")).toBeNull();
    expect(getThinkingControl("", "")).toBeNull();
  });
});

describe("applyThinkingParam（注入对应参数；default/不可控时不动 payload）", () => {
  const mimo = "https://api.xiaomimimo.com/v1";
  const ds = "https://api.deepseek.com";
  const oai = "https://api.openai.com/v1";

  it("enable_thinking：fast→false，reasoning→true", () => {
    expect(applyThinkingParam({}, "fast", mimo, "mimo-v2.5-pro")).toEqual({ enable_thinking: false });
    expect(applyThinkingParam({}, "reasoning", mimo, "mimo-v2.5-pro")).toEqual({ enable_thinking: true });
  });
  it("thinking:{type}：fast→disabled，reasoning→enabled", () => {
    expect(applyThinkingParam({}, "fast", ds, "deepseek-chat")).toEqual({ thinking: { type: "disabled" } });
    expect(applyThinkingParam({}, "reasoning", ds, "deepseek-reasoner")).toEqual({ thinking: { type: "enabled" } });
  });
  it("reasoning_effort：fast→low，reasoning→high", () => {
    expect(applyThinkingParam({}, "fast", oai, "gpt-5.5")).toEqual({ reasoning_effort: "low" });
    expect(applyThinkingParam({}, "reasoning", oai, "gpt-5.5")).toEqual({ reasoning_effort: "high" });
  });
  it("default 档不动 payload", () => {
    expect(applyThinkingParam({ model: "x" }, "auto", mimo, "mimo-v2.5-pro")).toEqual({ model: "x" });
    expect(applyThinkingParam({ model: "x" }, undefined as any, mimo, "mimo-v2.5-pro")).toEqual({ model: "x" });
  });
  it("服务不可控时不动 payload（即使选了 fast）", () => {
    expect(applyThinkingParam({ model: "x" }, "fast", oai, "gpt-4o")).toEqual({ model: "x" });
    expect(applyThinkingParam({ model: "x" }, "fast", "https://api.example.com/v1", "foo")).toEqual({ model: "x" });
  });
});
