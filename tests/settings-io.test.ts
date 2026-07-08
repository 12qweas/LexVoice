import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  normalizePath: (path: string) => String(path || "").replace(/\\/g, "/").replace(/\/+/g, "/"),
  TFile: class TFile {},
  TFolder: class TFolder {},
}));

import {
  SETTINGS_SCHEMA_VERSION,
  extractLexVoiceJobItems,
  normalizeLexVoiceSettings,
  serializeLexVoiceSettings,
} from "../src/shared/settings-io";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";

// 模拟真实的「保存 → 落盘 → 重启读回」链路：
// saveAll 写 { settings: serialize(...) } 且经过 JSON 深拷贝落盘（saveData），
// loadAll 再 normalizeLexVoiceSettings(saved)。JSON round-trip 能同时暴露 undefined 被丢弃等问题。
// （saveAll 里的 API Key 混淆层 transformApiKeyFieldsDeep 包在 serialize 之外、读回时先解混淆，
// 对 normalize/serialize 本身是透明的，故这里按明文测试。）
function roundTrip(settings: any) {
  const persisted = JSON.parse(JSON.stringify({ settings: serializeLexVoiceSettings(settings) }));
  return normalizeLexVoiceSettings(persisted);
}

describe("settings-io round-trip（白名单防丢键兜底）", () => {
  it("serialize 输出携带 schemaVersion", () => {
    const a = normalizeLexVoiceSettings({});
    expect(serializeLexVoiceSettings(a).schemaVersion).toBe(SETTINGS_SCHEMA_VERSION);
  });

  it("默认设置：DEFAULT_SETTINGS 的每个顶层键都必须在 normalize→serialize→normalize 后原样存活", () => {
    const a = normalizeLexVoiceSettings({});
    const b = roundTrip(a);
    // serialize 是重建式白名单：任何没登记的键会在这里现形（b[key] 回退成默认值或丢失）。
    // 若本测试对某个键失败：
    //  - 真属遗漏 → 去 settings-io.ts 的 serialize 登记该键（参照 sedimentAutoExtract 修法）；
    //  - 确属派生/瞬态键 → 在此显式排除并注释原因（当前没有此类键）。
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      expect(b[key], `设置键 "${key}" 在保存-读回 round-trip 后丢失或漂移`).toEqual(a[key]);
    }
  });

  it("非默认值改动：跨分组抽样修改后 round-trip 必须逐项存活", () => {
    const a = normalizeLexVoiceSettings({});

    // —— 白名单脚枪第三例（回归钉子）：sedimentAutoExtract 曾因未登记 serialize 而保存即丢 ——
    a.sedimentAutoExtract = true;

    // 字符串路径类
    a.audioFolder = "自定义/录音库";
    a.mdFolder = "自定义/纪要目录";
    a.inboxFolder = "收件箱";
    a.reportBrandName = "测试公司";
    a.customVocabulary = "术语A，术语B";

    // 布尔开关类（含「默认 true 改 false」这种最容易被 || 兜底吃掉的方向）
    a.inboxAutoImport = false;
    a.consolidatedLayout = false;
    a.autoRenameWithTitle = false;
    a.showFloatingBall = false;
    a.enableRealtimeOutline = false;
    a.diagnosticsLogEnabled = false;
    a.autoCheckUpdates = false;
    a.writeDailyMeetingOverview = false;
    a.filterShortRecordings = false;
    a.keepSegmentAudioFiles = true;

    // 数值类
    a.maxRetries = 7;
    a.segmentIntervalMinutes = 10;
    a.asrConcurrency = 2;
    a.realtimeOutlineDebounceMs = 9000;

    // 枚举/受限值类
    a.captureMode = "mix-virtual";
    a.bubbleSize = "small";
    a.thinkingMode = "fast";
    a.peopleContextMode = "hotwords";
    a.polishMode = "meeting";

    // 嵌套持久化：快速口述（asr 子对象 + prompt + 落点）
    a.quickDictationTarget = "clipboard";
    a.quickDictationPrompt = "自定义X";
    a.quickDictationAsr = {
      endpoint: "https://asr.example.com/v1/audio/transcriptions",
      apiKey: "sk-qd-test",
      model: "whisper-test",
      language: "zh",
    };

    // LLM 工作字段 + 配置库
    a.llmEndpoint = "https://llm.example.com/v1/chat/completions";
    a.llmApiKey = "sk-llm-test";
    a.llmModel = "test-model";
    a.llmProfiles = [
      { id: "p1", name: "测试配置", endpoint: "https://llm.example.com/v1", apiKey: "sk-p1", model: "m1" },
    ];
    a.activeLlmProfile = "p1";

    // 转写 provider 注册表（嵌套 bag）
    a.activeTranscribeProvider = "openai";
    a.transcribeProviders.siliconflow.apiKey = "sk-asr-test";

    // 招聘模块
    a.recruitFeatureUnlocked = true;
    a.recruitJdFolderPath = "岗位JD";

    // UI 位置对象
    a.floatingBallPos = { left: 10, top: 20 };

    const b = roundTrip(a);

    expect(b.sedimentAutoExtract, "sedimentAutoExtract（历史丢失键回归）").toBe(true);

    expect(b.audioFolder).toBe("自定义/录音库");
    expect(b.mdFolder).toBe("自定义/纪要目录");
    expect(b.inboxFolder).toBe("收件箱");
    expect(b.reportBrandName).toBe("测试公司");
    expect(b.customVocabulary).toBe("术语A，术语B");

    expect(b.inboxAutoImport).toBe(false);
    expect(b.consolidatedLayout).toBe(false);
    expect(b.autoRenameWithTitle).toBe(false);
    expect(b.showFloatingBall).toBe(false);
    expect(b.enableRealtimeOutline).toBe(false);
    expect(b.diagnosticsLogEnabled).toBe(false);
    expect(b.autoCheckUpdates).toBe(false);
    expect(b.writeDailyMeetingOverview).toBe(false);
    expect(b.filterShortRecordings).toBe(false);
    expect(b.keepSegmentAudioFiles).toBe(true);

    expect(b.maxRetries).toBe(7);
    expect(b.segmentIntervalMinutes).toBe(10);
    expect(b.asrConcurrency).toBe(2);
    expect(b.realtimeOutlineDebounceMs).toBe(9000);

    expect(b.captureMode).toBe("mix-virtual");
    expect(b.bubbleSize).toBe("small");
    expect(b.thinkingMode).toBe("fast");
    expect(b.peopleContextMode).toBe("hotwords");
    expect(b.polishMode).toBe("meeting");

    expect(b.quickDictationTarget).toBe("clipboard");
    expect(b.quickDictationPrompt).toBe("自定义X");
    expect(b.quickDictationAsr).toEqual({
      endpoint: "https://asr.example.com/v1/audio/transcriptions",
      apiKey: "sk-qd-test",
      model: "whisper-test",
      language: "zh",
    });

    expect(b.llmEndpoint).toBe("https://llm.example.com/v1/chat/completions");
    expect(b.llmApiKey).toBe("sk-llm-test");
    expect(b.llmModel).toBe("test-model");
    expect(b.llmProfiles).toEqual([
      { id: "p1", name: "测试配置", endpoint: "https://llm.example.com/v1", apiKey: "sk-p1", model: "m1" },
    ]);
    expect(b.activeLlmProfile).toBe("p1");

    expect(b.activeTranscribeProvider).toBe("openai");
    expect(b.transcribeProviders.siliconflow.apiKey).toBe("sk-asr-test");

    expect(b.recruitFeatureUnlocked).toBe(true);
    expect(b.recruitJdFolderPath).toBe("岗位JD");

    expect(b.floatingBallPos).toEqual({ left: 10, top: 20 });
  });

  it("二次 round-trip 稳定（不会每次保存都漂移一点）", () => {
    const a = normalizeLexVoiceSettings({});
    a.sedimentAutoExtract = true;
    a.quickDictationTarget = "clipboard";
    const b = roundTrip(a);
    const c = roundTrip(b);
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      expect(c[key], `设置键 "${key}" 在第二次 round-trip 后漂移`).toEqual(b[key]);
    }
  });
});

describe("extractLexVoiceJobItems", () => {
  it("按 backgroundJobs.items → jobs.items → queue 的优先级取任务列表", () => {
    expect(extractLexVoiceJobItems({ backgroundJobs: { items: [{ id: 1 }] } })).toEqual([{ id: 1 }]);
    expect(extractLexVoiceJobItems({ jobs: { items: [{ id: 2 }] } })).toEqual([{ id: 2 }]);
    expect(extractLexVoiceJobItems({ queue: [{ id: 3 }] })).toEqual([{ id: 3 }]);
  });

  it("无数据/坏数据回退空数组", () => {
    expect(extractLexVoiceJobItems(undefined)).toEqual([]);
    expect(extractLexVoiceJobItems(null)).toEqual([]);
    expect(extractLexVoiceJobItems({ backgroundJobs: { items: "not-array" } })).toEqual([]);
  });
});
