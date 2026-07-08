import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  normalizePath: (path: string) => String(path || "").replace(/\\/g, "/").replace(/\/+/g, "/"),
  TFile: class TFile {},
  TFolder: class TFolder {},
}));

import { getTranscribeRequestTimeoutMs } from "../src/asr/transcribe";

describe("getTranscribeRequestTimeoutMs", () => {
  it("本地服务固定 10 分钟，与体积无关", () => {
    expect(getTranscribeRequestTimeoutMs({ endpoint: "http://127.0.0.1:8000/v1/audio/transcriptions" }, 100 * 1024 * 1024))
      .toBe(10 * 60 * 1000);
    expect(getTranscribeRequestTimeoutMs({ endpoint: "http://localhost:8000/v1/audio/transcriptions" }))
      .toBe(10 * 60 * 1000);
  });

  it("云端无体积信息时保持 120 秒基础超时", () => {
    expect(getTranscribeRequestTimeoutMs({ endpoint: "https://api.siliconflow.cn/v1/audio/transcriptions" }))
      .toBe(120 * 1000);
    expect(getTranscribeRequestTimeoutMs({ endpoint: "https://api.siliconflow.cn/v1/audio/transcriptions" }, 0))
      .toBe(120 * 1000);
  });

  it("云端按体积追加 ≈1s/50KB：3 分钟 WAV（约 5.8MB）≈ 233 秒", () => {
    const bytes = Math.round(5.8 * 1024 * 1024);
    const ms = getTranscribeRequestTimeoutMs({ endpoint: "https://api.siliconflow.cn/v1/audio/transcriptions" }, bytes);
    expect(ms).toBe((120 + Math.ceil(bytes / 51200)) * 1000);
    expect(ms).toBeGreaterThanOrEqual(230 * 1000);
    expect(ms).toBeLessThanOrEqual(240 * 1000);
  });

  it("上传追加封顶 180 秒（总计 300 秒）", () => {
    expect(getTranscribeRequestTimeoutMs({ endpoint: "https://api.siliconflow.cn/v1/audio/transcriptions" }, 1024 * 1024 * 1024))
      .toBe(300 * 1000);
  });
});
