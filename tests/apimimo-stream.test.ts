import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  normalizePath: (path: string) => String(path || "").replace(/\\/g, "/").replace(/\/+/g, "/"),
  TFile: class TFile {},
  TFolder: class TFolder {},
}));

import { applyApimimoSseData, pickAsrRetryDelayMs, estimateApimimoAudioSeconds } from "../src/asr/transcribe";

function makeAcc() {
  return { text: "", finishReason: null, done: false };
}

describe("applyApimimoSseData", () => {
  it("跨多个事件累加 delta.content", () => {
    const acc = makeAcc();
    applyApimimoSseData(acc, JSON.stringify({ choices: [{ delta: { content: "今天" } }] }));
    applyApimimoSseData(acc, JSON.stringify({ choices: [{ delta: { content: "开会" } }] }));
    applyApimimoSseData(acc, JSON.stringify({ choices: [{ delta: { content: "讨论预算。" } }] }));

    expect(acc.text).toBe("今天开会讨论预算。");
    expect(acc.done).toBe(false);
    expect(acc.finishReason).toBeNull();
  });

  it("[DONE] 置 done=true，不改动已累积文本", () => {
    const acc = makeAcc();
    applyApimimoSseData(acc, JSON.stringify({ choices: [{ delta: { content: "结论" } }] }));
    applyApimimoSseData(acc, "[DONE]");

    expect(acc.done).toBe(true);
    expect(acc.text).toBe("结论");
  });

  it("捕获 finish_reason（含末包同时带 delta 的情况）", () => {
    const acc = makeAcc();
    applyApimimoSseData(acc, JSON.stringify({ choices: [{ delta: { content: "完" }, finish_reason: null }] }));
    expect(acc.finishReason).toBeNull(); // null 不算捕获

    applyApimimoSseData(acc, JSON.stringify({ choices: [{ delta: { content: "毕" }, finish_reason: "stop" }] }));
    expect(acc.finishReason).toBe("stop");
    expect(acc.text).toBe("完毕");

    const accLen = makeAcc();
    applyApimimoSseData(accLen, JSON.stringify({ choices: [{ delta: {}, finish_reason: "length" }] }));
    expect(accLen.finishReason).toBe("length");
  });

  it("非法 JSON 事件被忽略，acc 原样返回", () => {
    const acc = makeAcc();
    applyApimimoSseData(acc, JSON.stringify({ choices: [{ delta: { content: "有效" } }] }));
    const returned = applyApimimoSseData(acc, "{broken json!!");

    expect(returned).toBe(acc);
    expect(acc.text).toBe("有效");
    expect(acc.done).toBe(false);
    expect(acc.finishReason).toBeNull();
  });

  it("空 payload 与缺 choices 的事件同样忽略", () => {
    const acc = makeAcc();
    applyApimimoSseData(acc, "");
    applyApimimoSseData(acc, JSON.stringify({ id: "x", object: "chat.completion.chunk" }));

    expect(acc.text).toBe("");
    expect(acc.done).toBe(false);
  });

  it("message.content 全文兜底：仅在比已累积文本更长时整体替换", () => {
    // 更长 → 替换
    const acc = makeAcc();
    applyApimimoSseData(acc, JSON.stringify({ choices: [{ delta: { content: "前半" } }] }));
    applyApimimoSseData(acc, JSON.stringify({ choices: [{ message: { content: "前半后半完整全文" } }] }));
    expect(acc.text).toBe("前半后半完整全文");

    // 更短 → 不覆盖已收全的增量
    const acc2 = makeAcc();
    applyApimimoSseData(acc2, JSON.stringify({ choices: [{ delta: { content: "已经收到的完整增量文本" } }] }));
    applyApimimoSseData(acc2, JSON.stringify({ choices: [{ message: { content: "短兜底" } }] }));
    expect(acc2.text).toBe("已经收到的完整增量文本");

    // 等长 → 也不替换（严格「更长」）
    const acc3 = makeAcc();
    applyApimimoSseData(acc3, JSON.stringify({ choices: [{ delta: { content: "一样长" } }] }));
    applyApimimoSseData(acc3, JSON.stringify({ choices: [{ message: { content: "另三字" } }] }));
    expect(acc3.text).toBe("一样长");
  });
});

describe("pickAsrRetryDelayMs", () => {
  it("错误信息带 Retry-After → 按服务端秒数 + 0-2s 抖动", () => {
    for (let i = 0; i < 20; i++) {
      const ms = pickAsrRetryDelayMs("转写失败 429 Too Many Requests；服务限流；Retry-After: 30s", i + 1);
      expect(ms).toBeGreaterThanOrEqual(30000);
      expect(ms).toBeLessThan(32000);
    }
  });

  it("Retry-After 支持中文冒号", () => {
    const ms = pickAsrRetryDelayMs("限流；Retry-After：5", 1);
    expect(ms).toBeGreaterThanOrEqual(5000);
    expect(ms).toBeLessThan(7000);
  });

  it("Retry-After 过大时封顶 90s（≤92s）", () => {
    for (let i = 0; i < 20; i++) {
      const ms = pickAsrRetryDelayMs("Retry-After: 600", 1);
      expect(ms).toBe(90000);
      expect(ms).toBeLessThanOrEqual(92000);
    }
  });

  it("429 / 限流 / rate limit → 30-45s 长退避", () => {
    for (const msg of ["转写失败 429 Too Many Requests", "服务限流，请稍后重试", "Rate limit exceeded", "too many requests"]) {
      for (let i = 0; i < 20; i++) {
        const ms = pickAsrRetryDelayMs(msg, i + 1);
        expect(ms).toBeGreaterThanOrEqual(30000);
        expect(ms).toBeLessThan(45000);
      }
    }
  });

  it("不把 4290 之类的数字误判为 429", () => {
    const ms = pickAsrRetryDelayMs("转写失败 500；trace 42900", 1);
    expect(ms).toBeGreaterThanOrEqual(1200);
    expect(ms).toBeLessThan(2000);
  });

  it("普通瞬时错误 / 空消息 → 1.2-2s 短退避", () => {
    for (const msg of ["转写请求超时：120 秒内没有响应", "network error", ""]) {
      for (let i = 0; i < 20; i++) {
        const ms = pickAsrRetryDelayMs(msg, i + 1);
        expect(ms).toBeGreaterThanOrEqual(1200);
        expect(ms).toBeLessThan(2000);
      }
    }
  });
});

describe("estimateApimimoAudioSeconds", () => {
  it("wav 按 32,000 字节/秒（16kHz 单声道 16-bit）", () => {
    expect(estimateApimimoAudioSeconds({ size: 320000 }, "audio/wav")).toBe(10);
    // 3 分钟 wav 块 ≈ 5.76MB → 180s → 配速间隔 180*160 = 28.8s
    expect(estimateApimimoAudioSeconds({ size: 180 * 32000 }, "audio/wav")).toBe(180);
  });

  it("mp3（及其它非 wav）按 16,000 字节/秒估", () => {
    expect(estimateApimimoAudioSeconds({ size: 160000 }, "audio/mpeg")).toBe(10);
    expect(estimateApimimoAudioSeconds({ size: 160000 }, "")).toBe(10);
  });

  it("mime 缺省时回退 blob.type；非法体积按 0 处理", () => {
    expect(estimateApimimoAudioSeconds({ size: 32000, type: "audio/wav" }, "")).toBe(1);
    expect(estimateApimimoAudioSeconds({ size: -5 }, "audio/wav")).toBe(0);
    expect(estimateApimimoAudioSeconds(null, "audio/wav")).toBe(0);
  });
});
