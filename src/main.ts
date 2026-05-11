// @ts-nocheck
import * as obsidian from "obsidian";

const DEFAULT_SETTINGS = {
  audioFolder: "LexVoice/录音",
  mdFolder: "LexVoice/转写纪要",
  noteFileNameFormatNew: "YYYY-MM-DD HHmm",

  // —— 转写：多 provider 注册表 ——
  transcribeEndpoint: "https://api.siliconflow.cn/v1/audio/transcriptions",  // 兼容字段（旧版 / 兜底）
  transcribeApiKey: "",
  transcribeModel: "FunAudioLLM/SenseVoiceSmall",
  transcribeLanguage: "auto",

  activeTranscribeProvider: "siliconflow",
  transcribeProviders: {
    siliconflow: {
      name: "SiliconFlow",
      endpoint: "https://api.siliconflow.cn/v1/audio/transcriptions",
      apiKey: "",
      model: "FunAudioLLM/SenseVoiceSmall",
      language: "auto",
      hint: "国内访问稳定，便宜。准确度中等。",
    },
    openai: {
      name: "OpenAI 官方",
      endpoint: "https://api.openai.com/v1/audio/transcriptions",
      apiKey: "",
      model: "gpt-4o-transcribe",
      language: "",
      hint: "切片转写。准确度天花板。中文人名/专业术语识别强。需海外网络。",
    },
    "openai-realtime": {
      name: "OpenAI Realtime · 语音转写",
      endpoint: "wss://api.openai.com/v1/realtime",
      apiKey: "",
      model: "gpt-realtime-whisper",
      language: "",
      hint: "流式 ASR，边说边出字幕。$0.017/min ≈ ¥7.2/小时。",
    },
    "openai-realtime-translate": {
      name: "OpenAI Realtime · 语音翻译",
      endpoint: "wss://api.openai.com/v1/realtime/translations",
      apiKey: "",
      model: "gpt-realtime-translate",
      language: "",
      targetLanguage: "zh",
      hint: "流式翻译，70+ 输入 → 13 输出。$0.034/min ≈ ¥14.4/小时。",
    },
    dashscope: {
      name: "阿里云百炼 Paraformer Realtime",
      endpoint: "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
      apiKey: "",
      model: "paraformer-realtime-v2",
      language: "",
      hint: "国内最便宜的流式 ASR，约 ¥3.6/小时。",
    },
    custom: {
      name: "其他转写服务",
      endpoint: "",
      apiKey: "",
      model: "",
      language: "",
      hint: "适合企业内部网关、自建转写服务或第三方转写服务。",
    },
    local: {
      name: "本地转写服务",
      endpoint: "http://127.0.0.1:8000/v1/audio/transcriptions",
      apiKey: "",
      model: "whisper-large-v3",
      language: "zh",
      hint: "适合 Xinference、faster-whisper-server、whisper.cpp 等本地服务；需要能接收音频文件上传并返回 text。",
    },
  },

  llmEndpoint: "https://api.siliconflow.cn/v1/chat/completions",
  llmApiKey: "",
  llmModel: "",
  llmServicePreset: "siliconflow",

  polishMode: "meeting",
  polishPromptInterview: "",
  polishPromptMeeting: "",
  polishPromptHuddle: "",
  polishPromptMonologue: "",
  polishPromptLearning: "",
  polishPromptRecruit: "",

  // 提示词管理：内置提示词负责稳定底稿，自定义提示词负责用户自己的 Prompt 规则
  promptTemplates: {},  // { [id]: { id, mode, name, description, baseMode, prompt, customMode, createdAt, updatedAt } }
  activeTemplateByMode: {},  // 兼容旧数据；自定义提示词使用 { [id]: id }

  // 结构化程度：loose（散文为主）/ balanced（散文+列表，推荐）/ strict（多层嵌套列表）
  briefingStructureLevel: "balanced",

  briefingTranslationMode: "off",
  briefingTargetLanguage: "zh-CN",
  briefingCustomLanguage: "",
  briefingKeepOriginalTerms: true,
  briefingLanguageInstruction: "",

  industryProfile: {
    industry: "",
    scenarios: "",
    focus: "",
    outputPreference: "",
    generatedAt: null,
  },

  customVocabulary: "",
  vocabularyFile: "LexVoice/词汇表.md",

  inboxFolder: "",
  inboxAutoImport: true,
  inboxArchiveSubfolder: "processed",
  inboxStabilizeDelayMs: 3000,

  enableInterimOutput: true,
  segmentIntervalMinutes: 5,
  filterShortRecordings: true,

  captureMode: "mic",
  selectedVirtualDevice: "",  // 用户在设置里指定的虚拟声卡 deviceId；空则自动选第一个
  selectedMicrophoneDevice: "", // 用户在设置里指定的真实麦克风 deviceId；空则自动选第一个真实麦克风

  enableRealtimeOutline: true,
  realtimeOutlineDebounceMs: 1500,
  autoOpenOutlineOnRecord: true,

  autoRenameWithTitle: true,
  consolidatedLayout: true,

  maxRetries: 3,

  showFloatingBall: true,
  floatingBallPos: { left: 60, top: 120 },
  autoOpenNoteAfterFinish: true,
  writeDailyMeetingOverview: true,

  updateRepoUrl: "https://github.com/Lynn-x/LexVoice",
  updateBranch: "main",
  updatePluginDir: "",
  updateRawBaseUrl: "",
  autoCheckUpdates: true,
  lastUpdateCheckAt: null,
  availableUpdate: null,
  lastUpdateError: "",
  installedUpdateVersion: "",

  // 招聘面试模式上下文 —— 录音前注入 JD/简历，让 AI 评价有锚点
  recruitContext: {
    jd: "",
    resume: "",
    candidateName: "",
    position: "",
    round: "",
    interviewer: "",
    seniority: "",  // 初级 / 中级 / 高级 / 资深 / 总监
    savedAt: null,
  },
  recruitAlwaysAskOnStart: true,  // 每次开始招聘录音时弹 Modal 确认上下文
  recruitContextLibrary: [],      // 历史 JD 列表，便于快速复用
  recruitFeatureUnlocked: false,
};



function openLexVoiceExternalUrl(url) {
  // 桌面端优先走 Electron shell.openExternal —— 强制用系统默认浏览器，
  // 避免在 Obsidian 内嵌 webview 打开外部链接。
  try {
    const electron = require("electron");
    if (electron && electron.shell && typeof electron.shell.openExternal === "function") {
      electron.shell.openExternal(url);
      return;
    }
  } catch {}
  try { window.open(url, "_blank"); } catch (e) { console.warn("[LexVoice] open url failed", e); }
}

const SETTINGS_SCHEMA_VERSION = 3;
const LEGACY_VOCABULARY_FILE = "lexvoice 词汇表.md";
const SHORT_RECORDING_FILTER_MS = 3000;
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const UPDATE_PLUGIN_FILES = ["manifest.json", "main.js", "styles.css", "README.md"];
const LLM_SERVICE_PRESETS = [
  {
    id: "siliconflow",
    label: "硅基流动",
    endpoint: DEFAULT_SETTINGS.llmEndpoint,
    endpointHelp: "硅基流动的大模型对话接口地址。通常保持默认即可；LexVoice 会按 Chat Completions 请求发送。",
    keyHelp: "填写硅基流动控制台创建的访问密钥；如果你的语音转写也用硅基流动，可以复用同一把密钥。",
    modelPlaceholder: "按硅基流动控制台的模型名称填写",
    modelHelp: "填写硅基流动模型广场或控制台显示的完整模型标识。",
  },
  {
    id: "openai",
    label: "OpenAI",
    endpoint: "https://api.openai.com/v1",
    endpointHelp: "OpenAI 官方 API Base URL。填写到 /v1 即可，LexVoice 会自动补全 /chat/completions。",
    keyHelp: "填写 OpenAI 项目的 API Key。",
    modelPlaceholder: "按 OpenAI 模型名称填写",
    modelHelp: "填写 OpenAI 平台支持的 chat/completions 模型名称。",
  },
  {
    id: "poe",
    label: "Poe",
    endpoint: "https://api.poe.com/v1",
    endpointHelp: "Poe 的 OpenAI 兼容 API Base URL。填写到 /v1 即可，LexVoice 会自动补全 /chat/completions。",
    keyHelp: "填写 Poe API Key。Poe 侧的模型可用性和名称以 Poe API 页面为准。",
    modelPlaceholder: "按 Poe API Key 页面或模型列表显示的名称填写",
    modelHelp: "填写 Poe API 支持的 Bot 或模型名称，不要按其他平台的模型名猜。",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1",
    endpointHelp: "OpenRouter 的 OpenAI 兼容 API Base URL。LexVoice 会自动附加 OpenRouter 建议的应用识别请求头。",
    keyHelp: "填写 OpenRouter API Key。不同模型可能由不同上游提供商计费。",
    modelPlaceholder: "按 OpenRouter 模型列表填写，通常带提供商前缀",
    modelHelp: "填写 OpenRouter 模型列表中的完整模型 ID，通常类似 provider/model。",
  },
  {
    id: "moonshot",
    label: "Moonshot / Kimi",
    endpoint: "https://api.moonshot.cn/v1",
    endpointHelp: "Moonshot / Kimi 的 API Base URL。填写到 /v1 即可，LexVoice 会自动补全 /chat/completions。",
    keyHelp: "填写 Moonshot 控制台创建的 API Key。",
    modelPlaceholder: "按 Moonshot 控制台的 Kimi 模型名称填写",
    modelHelp: "填写 Moonshot 控制台当前可用的 Kimi 模型名称。",
  },
  {
    id: "dashscope",
    label: "阿里云百炼 / DashScope",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    endpointHelp: "阿里云百炼 OpenAI 兼容模式地址。国内站点通常使用 dashscope.aliyuncs.com/compatible-mode/v1。",
    keyHelp: "填写百炼控制台创建的 API Key。",
    modelPlaceholder: "按百炼控制台的模型名称填写",
    modelHelp: "填写百炼 OpenAI 兼容模式支持的模型名称。",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    endpoint: "https://api.deepseek.com",
    endpointHelp: "DeepSeek API Base URL。填写根地址即可，LexVoice 会自动补全 /chat/completions。",
    keyHelp: "填写 DeepSeek 平台创建的 API Key。",
    modelPlaceholder: "按 DeepSeek 控制台的模型名称填写",
    modelHelp: "填写 DeepSeek 控制台支持的模型名称。",
  },
  {
    id: "zhipu",
    label: "智谱 GLM",
    endpoint: "https://open.bigmodel.cn/api/paas/v4",
    endpointHelp: "智谱开放平台 API Base URL。填写到 /api/paas/v4 即可。",
    keyHelp: "填写智谱开放平台 API Key。",
    modelPlaceholder: "按智谱开放平台的模型名称填写",
    modelHelp: "填写智谱开放平台支持的 GLM 模型名称。",
  },
  {
    id: "volcengine",
    label: "火山方舟",
    endpoint: "https://ark.cn-beijing.volces.com/api/v3",
    endpointHelp: "火山方舟 OpenAI 兼容 API Base URL。不同地域可能不同，请以方舟控制台为准。",
    keyHelp: "填写火山方舟 API Key。",
    modelPlaceholder: "填写火山方舟推理接入点或模型标识",
    modelHelp: "火山方舟通常使用推理接入点 ID 或控制台给出的模型标识。",
  },
  {
    id: "hunyuan",
    label: "腾讯混元",
    endpoint: "https://api.hunyuan.cloud.tencent.com/v1",
    endpointHelp: "腾讯混元 OpenAI 兼容 API Base URL。填写到 /v1 即可。",
    keyHelp: "填写腾讯混元 API Key。",
    modelPlaceholder: "按腾讯混元控制台的模型名称填写",
    modelHelp: "填写腾讯混元控制台支持的模型名称。",
  },
  {
    id: "gemini-openai",
    label: "Google Gemini（OpenAI 兼容）",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
    endpointHelp: "Gemini 的 OpenAI 兼容入口。填写到 /v1beta/openai 即可。",
    keyHelp: "填写 Google AI Studio 或 Google Cloud 提供的 API Key。",
    modelPlaceholder: "按 Gemini API 的 OpenAI 兼容模型名称填写",
    modelHelp: "填写 Gemini OpenAI 兼容接口支持的模型名称。",
  },
  {
    id: "xai",
    label: "xAI",
    endpoint: "https://api.x.ai/v1",
    endpointHelp: "xAI API Base URL。填写到 /v1 即可。",
    keyHelp: "填写 xAI 控制台创建的 API Key。",
    modelPlaceholder: "按 xAI 控制台的模型名称填写",
    modelHelp: "填写 xAI 控制台支持的模型名称。",
  },
  {
    id: "groq",
    label: "Groq",
    endpoint: "https://api.groq.com/openai/v1",
    endpointHelp: "Groq 的 OpenAI 兼容 API Base URL。填写到 /openai/v1 即可。",
    keyHelp: "填写 Groq 控制台创建的 API Key。",
    modelPlaceholder: "按 Groq 控制台的模型名称填写",
    modelHelp: "填写 Groq 控制台支持的模型名称。",
  },
  {
    id: "mistral",
    label: "Mistral",
    endpoint: "https://api.mistral.ai/v1",
    endpointHelp: "Mistral API Base URL。填写到 /v1 即可。",
    keyHelp: "填写 Mistral 控制台创建的 API Key。",
    modelPlaceholder: "按 Mistral 控制台的模型名称填写",
    modelHelp: "填写 Mistral 控制台支持的模型名称。",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    endpoint: "https://api.perplexity.ai",
    endpointHelp: "Perplexity API Base URL。填写根地址即可，LexVoice 会自动补全 /chat/completions。",
    keyHelp: "填写 Perplexity 控制台创建的 API Key。",
    modelPlaceholder: "按 Perplexity 控制台的模型名称填写",
    modelHelp: "填写 Perplexity API 支持的模型名称。",
  },
  {
    id: "openai-compatible-gateway",
    label: "其他 OpenAI 兼容网关 / 中转站",
    endpoint: "",
    endpointHelp: "填写中转站提供的 OpenAI 兼容地址。可填完整 /chat/completions，也可填 Base URL。",
    keyHelp: "填写中转站提供的访问密钥；如果该网关不需要鉴权，可在本地服务场景下留空。",
    modelPlaceholder: "填写该中转站要求的模型名称",
    modelHelp: "以中转站控制台或文档显示的模型名称为准。",
  },
  {
    id: "ollama",
    label: "本地 Ollama",
    endpoint: "http://127.0.0.1:11434/v1",
    endpointHelp: "Ollama 本地 OpenAI 兼容地址。保持默认前请确认 Ollama 已启动。",
    keyHelp: "本地 Ollama 通常不需要访问密钥。",
    modelPlaceholder: "填写本地 Ollama 已安装的模型名称",
    modelHelp: "填写 `ollama list` 中已经安装的模型名称。",
  },
  {
    id: "lmstudio",
    label: "本地 LM Studio",
    endpoint: "http://127.0.0.1:1234/v1",
    endpointHelp: "LM Studio 本地 OpenAI 兼容地址。保持默认前请确认本地服务器已启动。",
    keyHelp: "本地 LM Studio 通常不需要访问密钥。",
    modelPlaceholder: "填写 LM Studio 当前加载的模型标识",
    modelHelp: "填写 LM Studio 当前服务暴露的模型标识；不确定时查看 LM Studio Server 面板。",
  },
  {
    id: "local-openai-compatible",
    label: "本地 OpenAI 兼容服务",
    endpoint: "http://127.0.0.1:8000/v1",
    endpointHelp: "本地 OpenAI 兼容服务地址，例如 vLLM、Xinference、llama.cpp server。请先启动服务。",
    keyHelp: "本地服务通常可留空；如果你给服务配置了鉴权，就填写对应密钥。",
    modelPlaceholder: "填写 vLLM / Xinference / llama.cpp 等本地服务的模型名称",
    modelHelp: "填写本地服务实际暴露的模型名称。",
  },
];

function isRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function pickDefined() {
  for (const value of arguments) {
    if (value !== undefined) return value;
  }
  return undefined;
}

function getLlmServicePreset(id) {
  return LLM_SERVICE_PRESETS.find(p => p.id === id) || null;
}

function comparableLlmEndpoint(endpoint) {
  return normalizeLlmEndpoint(endpoint).replace(/\/+$/, "").toLowerCase();
}

function inferLlmServicePresetId(settings) {
  const current = comparableLlmEndpoint(settings && settings.llmEndpoint);
  if (!current) return "";
  const matched = LLM_SERVICE_PRESETS.find(p => p.endpoint && comparableLlmEndpoint(p.endpoint) === current);
  return matched ? matched.id : "";
}

function getActiveLlmServicePresetId(settings) {
  const saved = settings && settings.llmServicePreset ? settings.llmServicePreset : "";
  const preset = getLlmServicePreset(saved);
  if (!preset) return inferLlmServicePresetId(settings);
  if (!preset.endpoint) return saved;
  return comparableLlmEndpoint(preset.endpoint) === comparableLlmEndpoint(settings && settings.llmEndpoint)
    ? saved
    : inferLlmServicePresetId(settings);
}

const SUPPORTED_AUDIO_INPUT_MODES = new Set(["mic", "mix-virtual", "virtualCable"]);

function normalizeAudioInputMode(mode) {
  if (mode === "mix") return "mix-virtual";
  if (mode === "system") return "virtualCable";
  return SUPPORTED_AUDIO_INPUT_MODES.has(mode) ? mode : "mic";
}

function audioInputModeLabel(mode) {
  const labels = {
    mic: "仅麦克风",
    "mix-virtual": "麦克风 + 电脑音频",
    virtualCable: "仅电脑音频",
  };
  return labels[normalizeAudioInputMode(mode)] || labels.mic;
}

function normalizeLexVoiceSettings(savedData) {
  const saved = isRecord(savedData) ? savedData : {};
  const raw = isRecord(saved.settings) ? saved.settings : saved;
  const defaults = cloneJson(DEFAULT_SETTINGS);
  const s = Object.assign({}, defaults, raw);

  const storage = raw.storage || {};
  s.audioFolder = pickDefined(storage.recordingLibraryPath, raw.audioFolder, defaults.audioFolder);
  s.mdFolder = pickDefined(storage.briefingNotePath, raw.mdFolder, defaults.mdFolder);
  s.inboxFolder = pickDefined(storage.inboxPath, raw.inboxFolder, defaults.inboxFolder);
  s.inboxAutoImport = pickDefined(storage.autoImportInbox, raw.inboxAutoImport, defaults.inboxAutoImport);
  s.inboxArchiveSubfolder = pickDefined(storage.archiveSubfolder, raw.inboxArchiveSubfolder, defaults.inboxArchiveSubfolder);
  s.inboxStabilizeDelayMs = pickDefined(storage.syncQuietMs, raw.inboxStabilizeDelayMs, defaults.inboxStabilizeDelayMs);

  const noteNaming = raw.noteNaming || {};
  s.noteFileNameFormatNew = pickDefined(noteNaming.sessionPattern, raw.noteFileNameFormatNew, defaults.noteFileNameFormatNew);
  s.autoOpenNoteAfterFinish = pickDefined(noteNaming.openAfterFinish, raw.autoOpenNoteAfterFinish, defaults.autoOpenNoteAfterFinish);
  s.autoRenameWithTitle = pickDefined(noteNaming.renameWithTitle, raw.autoRenameWithTitle, defaults.autoRenameWithTitle);
  s.consolidatedLayout = pickDefined(noteNaming.consolidatedLayout, raw.consolidatedLayout, defaults.consolidatedLayout);

  const capture = raw.capture || {};
  s.captureMode = normalizeAudioInputMode(pickDefined(capture.sourceMode, raw.captureMode, defaults.captureMode));
  s.selectedVirtualDevice = pickDefined(capture.virtualDeviceId, raw.selectedVirtualDevice, defaults.selectedVirtualDevice);
  s.selectedMicrophoneDevice = pickDefined(capture.microphoneDeviceId, raw.selectedMicrophoneDevice, defaults.selectedMicrophoneDevice);
  s.enableInterimOutput = pickDefined(capture.liveSegmentsEnabled, raw.enableInterimOutput, defaults.enableInterimOutput);
  s.segmentIntervalMinutes = pickDefined(capture.segmentMinutes, raw.segmentIntervalMinutes, defaults.segmentIntervalMinutes);
  s.filterShortRecordings = pickDefined(capture.discardVeryShortRecordings, raw.filterShortRecordings, defaults.filterShortRecordings);

  const speech = raw.speech || {};
  const savedProviders = speech.providers || raw.transcribeProviders || {};
  const defaultProviders = DEFAULT_SETTINGS.transcribeProviders;
  const providerIds = new Set(Object.keys(defaultProviders).concat(Object.keys(savedProviders)));
  s.transcribeProviders = {};
  for (const id of providerIds) {
    s.transcribeProviders[id] = Object.assign({}, defaultProviders[id] || {}, savedProviders[id] || {});
  }
  s.activeTranscribeProvider = pickDefined(speech.activeProviderId, raw.activeTranscribeProvider, defaults.activeTranscribeProvider);
  s.transcribeEndpoint = pickDefined(speech.compatEndpoint, raw.transcribeEndpoint, defaults.transcribeEndpoint);
  s.transcribeApiKey = pickDefined(speech.compatApiKey, raw.transcribeApiKey, defaults.transcribeApiKey);
  s.transcribeModel = pickDefined(speech.compatModel, raw.transcribeModel, defaults.transcribeModel);
  s.transcribeLanguage = pickDefined(speech.compatLanguage, raw.transcribeLanguage, defaults.transcribeLanguage);
  if (!savedProviders.siliconflow && (s.transcribeApiKey || s.transcribeModel || s.transcribeEndpoint)) {
    const sf = s.transcribeProviders.siliconflow;
    if (sf) {
      if (s.transcribeApiKey) sf.apiKey = s.transcribeApiKey;
      if (s.transcribeModel) sf.model = s.transcribeModel;
      if (s.transcribeEndpoint) sf.endpoint = s.transcribeEndpoint;
      if (s.transcribeLanguage) sf.language = s.transcribeLanguage;
    }
  }

  const composer = raw.composer || {};
  const promptOverrides = composer.modePromptOverrides || raw.modePromptOverrides || {};
  s.llmEndpoint = pickDefined(composer.endpoint, raw.llmEndpoint, defaults.llmEndpoint);
  s.llmApiKey = pickDefined(composer.apiKey, raw.llmApiKey, defaults.llmApiKey);
  s.llmModel = pickDefined(composer.model, raw.llmModel, defaults.llmModel);
  s.llmServicePreset = pickDefined(composer.servicePreset, raw.llmServicePreset, defaults.llmServicePreset);
  s.polishMode = pickDefined(composer.defaultMode, raw.polishMode, defaults.polishMode);
  s.polishPromptInterview = pickDefined(promptOverrides.interview, raw.polishPromptInterview, defaults.polishPromptInterview);
  s.polishPromptMeeting = pickDefined(promptOverrides.meeting, raw.polishPromptMeeting, defaults.polishPromptMeeting);
  s.polishPromptHuddle = pickDefined(promptOverrides.huddle, raw.polishPromptHuddle, defaults.polishPromptHuddle);
  s.polishPromptMonologue = pickDefined(promptOverrides.monologue, raw.polishPromptMonologue, defaults.polishPromptMonologue);
  s.polishPromptLearning = pickDefined(promptOverrides.learning, raw.polishPromptLearning, defaults.polishPromptLearning);
  s.polishPromptRecruit = pickDefined(promptOverrides.recruit, raw.polishPromptRecruit, defaults.polishPromptRecruit);
  s.briefingStructureLevel = pickDefined(composer.structureLevel, raw.briefingStructureLevel, defaults.briefingStructureLevel);
  const languagePolicy = composer.languagePolicy || raw.languagePolicy || {};
  s.briefingTranslationMode = pickDefined(languagePolicy.mode, raw.briefingTranslationMode, defaults.briefingTranslationMode);
  s.briefingTargetLanguage = pickDefined(languagePolicy.targetLanguage, raw.briefingTargetLanguage, defaults.briefingTargetLanguage);
  s.briefingCustomLanguage = pickDefined(languagePolicy.customLanguage, raw.briefingCustomLanguage, defaults.briefingCustomLanguage);
  s.briefingKeepOriginalTerms = pickDefined(languagePolicy.keepOriginalTerms, raw.briefingKeepOriginalTerms, defaults.briefingKeepOriginalTerms);
  s.briefingLanguageInstruction = pickDefined(languagePolicy.extraInstruction, raw.briefingLanguageInstruction, defaults.briefingLanguageInstruction);
  s.industryProfile = Object.assign({}, defaults.industryProfile, composer.industryProfile || raw.industryProfile || {});

  const vocabulary = raw.vocabulary || {};
  s.customVocabulary = pickDefined(vocabulary.inlineTerms, raw.customVocabulary, defaults.customVocabulary);
  s.vocabularyFile = pickDefined(vocabulary.notePath, raw.vocabularyFile, defaults.vocabularyFile);
  if (obsidian.normalizePath(s.vocabularyFile || "").toLowerCase() === LEGACY_VOCABULARY_FILE.toLowerCase()) {
    s.vocabularyFile = defaults.vocabularyFile;
  }

  const liveOutline = raw.liveOutline || {};
  s.enableRealtimeOutline = pickDefined(liveOutline.enabled, raw.enableRealtimeOutline, defaults.enableRealtimeOutline);
  s.realtimeOutlineDebounceMs = pickDefined(liveOutline.debounceMs, raw.realtimeOutlineDebounceMs, defaults.realtimeOutlineDebounceMs);
  s.autoOpenOutlineOnRecord = pickDefined(liveOutline.openOnCapture, raw.autoOpenOutlineOnRecord, defaults.autoOpenOutlineOnRecord);

  const dailyNote = raw.dailyNote || {};
  s.writeDailyMeetingOverview = pickDefined(dailyNote.meetingOverviewEnabled, raw.writeDailyMeetingOverview, defaults.writeDailyMeetingOverview);

  const retryPolicy = raw.retryPolicy || {};
  s.maxRetries = pickDefined(retryPolicy.maxAttempts, raw.maxRetries, defaults.maxRetries);

  const ui = raw.ui || {};
  s.showFloatingBall = pickDefined(ui.floatingControlEnabled, raw.showFloatingBall, defaults.showFloatingBall);
  s.floatingBallPos = Object.assign({}, defaults.floatingBallPos, ui.floatingControlPosition || raw.floatingBallPos || {});

  const recruiting = raw.recruiting || {};
  s.recruitContext = Object.assign({}, defaults.recruitContext, recruiting.context || raw.recruitContext || {});
  s.recruitAlwaysAskOnStart = pickDefined(recruiting.askBeforeCapture, raw.recruitAlwaysAskOnStart, defaults.recruitAlwaysAskOnStart);
  s.recruitContextLibrary = Array.isArray(recruiting.contextLibrary)
    ? recruiting.contextLibrary
    : (Array.isArray(raw.recruitContextLibrary) ? raw.recruitContextLibrary : []);
  s.recruitFeatureUnlocked = !!pickDefined(recruiting.unlocked, raw.recruitFeatureUnlocked, defaults.recruitFeatureUnlocked);
  if (!s.recruitFeatureUnlocked && s.polishMode === "recruit") s.polishMode = defaults.polishMode;

  const updates = raw.updates || {};
  s.updateRepoUrl = defaults.updateRepoUrl;
  s.updateBranch = defaults.updateBranch;
  s.updatePluginDir = defaults.updatePluginDir;
  s.updateRawBaseUrl = defaults.updateRawBaseUrl;
  s.autoCheckUpdates = pickDefined(updates.autoCheck, raw.autoCheckUpdates, defaults.autoCheckUpdates);
  s.lastUpdateCheckAt = pickDefined(updates.lastCheckedAt, raw.lastUpdateCheckAt, defaults.lastUpdateCheckAt);
  s.availableUpdate = pickDefined(updates.available, raw.availableUpdate, defaults.availableUpdate);
  s.lastUpdateError = pickDefined(updates.lastError, raw.lastUpdateError, defaults.lastUpdateError);
  s.installedUpdateVersion = pickDefined(updates.installedVersion, raw.installedUpdateVersion, defaults.installedUpdateVersion);

  // Prompt 模板管理：5 种模式各有一个 builtin 模板（prompt 留空表示用内置 MERGE_PROMPTS），
  // 用户可在此基础上新建变体。从旧的 polishPromptX 字段迁移：
  // 若旧字段非空且尚无对应 builtin，则保留为 builtin 的覆盖文本
  const tplBag = isRecord(raw.promptTemplates) ? raw.promptTemplates : {};
  const activeBag = isRecord(raw.activeTemplateByMode) ? raw.activeTemplateByMode : {};
  const PROMPT_MODES = ["learning", "interview", "meeting", "huddle", "monologue", "recruit"];
  s.promptTemplates = {};
  s.activeTemplateByMode = {};
  for (const m of PROMPT_MODES) {
    const builtinId = "builtin-" + m;
    const legacyKey = "polishPrompt" + m.charAt(0).toUpperCase() + m.slice(1);
    const legacyText = pickDefined(raw[legacyKey], "");
    // 收集该 mode 下已存在的所有模板
    const existingForMode = Object.values(tplBag).filter(t => t && t.mode === m);
    let builtin = existingForMode.find(t => t.id === builtinId);
    if (!builtin) {
      builtin = {
        id: builtinId,
        mode: m,
        name: "默认（内置）",
        prompt: legacyText || "",
        isBuiltin: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      // 已有 builtin：尊重保存的字段，但若 prompt 为空且 legacy 有值，迁回
      if (!builtin.prompt && legacyText) builtin.prompt = legacyText;
    }
    s.promptTemplates[builtin.id] = builtin;
    // 把同 mode 的非 builtin 也合并进来
    for (const t of existingForMode) {
      if (!t.id || t.id === builtinId) continue;
      s.promptTemplates[t.id] = Object.assign(
        { id: t.id, mode: m, name: t.name || "未命名", prompt: t.prompt || "", isBuiltin: false, createdAt: t.createdAt || new Date().toISOString(), updatedAt: t.updatedAt || new Date().toISOString() },
        t
      );
    }
    // active id：优先用持久化的，其次 builtin
    const savedActive = activeBag[m];
    if (savedActive && s.promptTemplates[savedActive]) s.activeTemplateByMode[m] = savedActive;
    else s.activeTemplateByMode[m] = builtin.id;
  }
  // 把不属于内置模式的模板也保留下来（不丢用户数据）。带 customMode 的模板会成为可直接调用的自定义模式。
  for (const id of Object.keys(tplBag)) {
    const t = tplBag[id];
    if (!t || !t.id) continue;
    if (!s.promptTemplates[id]) s.promptTemplates[id] = t;
  }
  for (const id of Object.keys(s.promptTemplates)) {
    const t = s.promptTemplates[id];
    if (!isCustomPromptModeTemplate(t)) continue;
    if (!t.name) t.name = "自定义提示词";
    if (!t.baseMode || !MODE_META[t.baseMode] || t.baseMode === "off") t.baseMode = "learning";
    t.mode = t.id;
    t.customMode = true;
    s.activeTemplateByMode[t.id] = t.id;
  }

  return s;
}

function serializeLexVoiceSettings(s) {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    storage: {
      recordingLibraryPath: s.audioFolder,
      briefingNotePath: s.mdFolder,
      inboxPath: s.inboxFolder,
      autoImportInbox: s.inboxAutoImport,
      archiveSubfolder: s.inboxArchiveSubfolder,
      syncQuietMs: s.inboxStabilizeDelayMs,
    },
    noteNaming: {
      sessionPattern: s.noteFileNameFormatNew,
      openAfterFinish: s.autoOpenNoteAfterFinish,
      renameWithTitle: s.autoRenameWithTitle,
      consolidatedLayout: s.consolidatedLayout,
    },
    capture: {
      sourceMode: s.captureMode,
      virtualDeviceId: s.selectedVirtualDevice,
      microphoneDeviceId: s.selectedMicrophoneDevice,
      liveSegmentsEnabled: s.enableInterimOutput,
      segmentMinutes: s.segmentIntervalMinutes,
      discardVeryShortRecordings: s.filterShortRecordings !== false,
    },
    speech: {
      activeProviderId: s.activeTranscribeProvider,
      compatEndpoint: s.transcribeEndpoint,
      compatApiKey: s.transcribeApiKey,
      compatModel: s.transcribeModel,
      compatLanguage: s.transcribeLanguage,
      providers: s.transcribeProviders || {},
    },
    composer: {
      endpoint: s.llmEndpoint,
      apiKey: s.llmApiKey,
      model: s.llmModel,
      servicePreset: s.llmServicePreset,
      defaultMode: s.polishMode,
      modePromptOverrides: {
        interview: s.polishPromptInterview || "",
        meeting: s.polishPromptMeeting || "",
        huddle: s.polishPromptHuddle || "",
        monologue: s.polishPromptMonologue || "",
        learning: s.polishPromptLearning || "",
        recruit: s.polishPromptRecruit || "",
      },
      structureLevel: s.briefingStructureLevel || "balanced",
      languagePolicy: {
        mode: s.briefingTranslationMode || "off",
        targetLanguage: s.briefingTargetLanguage || "zh-CN",
        customLanguage: s.briefingCustomLanguage || "",
        keepOriginalTerms: s.briefingKeepOriginalTerms !== false,
        extraInstruction: s.briefingLanguageInstruction || "",
      },
      industryProfile: s.industryProfile || {},
    },
    vocabulary: {
      inlineTerms: s.customVocabulary || "",
      notePath: s.vocabularyFile || "",
    },
    liveOutline: {
      enabled: s.enableRealtimeOutline,
      debounceMs: s.realtimeOutlineDebounceMs,
      openOnCapture: s.autoOpenOutlineOnRecord,
    },
    dailyNote: {
      meetingOverviewEnabled: s.writeDailyMeetingOverview !== false,
    },
    retryPolicy: {
      maxAttempts: s.maxRetries,
    },
    ui: {
      floatingControlEnabled: s.showFloatingBall,
      floatingControlPosition: s.floatingBallPos || {},
    },
    recruiting: {
      context: s.recruitContext || {},
      askBeforeCapture: s.recruitAlwaysAskOnStart,
      contextLibrary: Array.isArray(s.recruitContextLibrary) ? s.recruitContextLibrary : [],
      unlocked: !!s.recruitFeatureUnlocked,
    },
    updates: {
      repoUrl: s.updateRepoUrl || "",
      branch: s.updateBranch || "main",
      pluginDir: s.updatePluginDir || "",
      rawBaseUrl: s.updateRawBaseUrl || "",
      autoCheck: s.autoCheckUpdates !== false,
      lastCheckedAt: s.lastUpdateCheckAt || null,
      available: s.availableUpdate || null,
      lastError: s.lastUpdateError || "",
      installedVersion: s.installedUpdateVersion || "",
    },
    promptTemplates: s.promptTemplates || {},
    activeTemplateByMode: s.activeTemplateByMode || {},
  };
}

function extractLexVoiceJobItems(savedData) {
  const saved = isRecord(savedData) ? savedData : {};
  if (saved.backgroundJobs && Array.isArray(saved.backgroundJobs.items)) return saved.backgroundJobs.items;
  if (saved.jobs && Array.isArray(saved.jobs.items)) return saved.jobs.items;
  if (Array.isArray(saved.queue)) return saved.queue;
  return [];
}

function parseGithubRepoUrl(url) {
  const text = String(url || "").trim();
  const match = text.match(/^https?:\/\/github\.com\/([^\/\s]+)\/([^\/\s#?]+)(?:[\/#?].*)?$/i)
    || text.match(/^git@github\.com:([^\/\s]+)\/([^\/\s#?]+?)(?:\.git)?$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
}

function trimSlashes(value) {
  return String(value || "").trim().replace(/^\/+|\/+$/g, "");
}

function resolveUpdateRawBase(settings) {
  const rawBase = String(settings.updateRawBaseUrl || "").trim().replace(/\/+$/g, "");
  if (rawBase) return rawBase;
  const repo = parseGithubRepoUrl(settings.updateRepoUrl);
  if (!repo) return "";
  const branch = String(settings.updateBranch || "main").trim() || "main";
  const subdir = trimSlashes(settings.updatePluginDir || "");
  return "https://raw.githubusercontent.com/" + repo.owner + "/" + repo.repo + "/" + branch + (subdir ? "/" + subdir : "");
}

function joinUpdateUrl(rawBase, fileName) {
  return rawBase.replace(/\/+$/g, "") + "/" + fileName.replace(/^\/+/g, "");
}

async function fetchUpdateText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText + " · " + url);
  return await res.text();
}

async function fetchUpdateJson(url) {
  return JSON.parse(await fetchUpdateText(url));
}

function compareVersions(a, b) {
  const pa = String(a || "0").split(/[^\d]+/).filter(Boolean).map(Number);
  const pb = String(b || "0").split(/[^\d]+/).filter(Boolean).map(Number);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

function pluginBasePath(plugin) {
  const configDir = plugin.app.vault.configDir || ".obsidian";
  return obsidian.normalizePath(configDir + "/plugins/" + plugin.manifest.id);
}

function updateBackupStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function ensureAdapterFolder(adapter, folderPath) {
  const parts = obsidian.normalizePath(folderPath).split("/").filter(Boolean);
  let cur = "";
  for (const part of parts) {
    cur = cur ? cur + "/" + part : part;
    if (!(await adapter.exists(cur))) await adapter.mkdir(cur);
  }
}


// 用户面 5 大业务意图（recruit 走彩蛋解锁）。内部 key 保留旧字符串以避免迁移破坏老笔记 / tag / base 文件；
// huddle 是 meeting 的子风格，不再单列在新建录音下拉，但老 huddle 笔记仍能被识别和打开。
const MODE_META = {
  meeting:   { prefix: "工作纪要", emoji: "📝", label: "工作纪要", goal: "适合各种规模的工作会议：决议、待办、风险、同步同事进展。" },
  interview: { prefix: "访谈", emoji: "🎙", label: "访谈", goal: "适合外部访谈、用户调研、专家访谈，把问答转成洞察。" },
  monologue: { prefix: "个人笔记", emoji: "💭", label: "个人笔记", goal: "适合个人口述、灵感、复盘，把碎片表达整理成可用笔记。" },
  learning:  { prefix: "学习笔记", emoji: "📚", label: "学习笔记", goal: "适合 B 站、YouTube、课程、讲座、播客等高信息密度内容。" },
  recruit:   { prefix: "招聘评估", emoji: "👔", label: "招聘评估" },
  huddle:    { prefix: "圆桌讨论", emoji: "🤝", label: "圆桌讨论", goal: "保留以兼容旧笔记，新建录音请改用「工作纪要」。", legacy: true },
  off:       { prefix: "录音", emoji: "🎙", label: "关闭（仅转写）" },
};

// 新建录音下拉里出现的 4 个意图 + 1 个彩蛋；huddle 不出现（仅旧笔记兜底使用）
const STANDARD_POLISH_MODES = ["meeting", "interview", "monologue", "learning"];
const ALL_POLISH_MODES = ["meeting", "interview", "monologue", "learning", "recruit"];

function isRecruitFeatureUnlocked(settings) {
  return !!(settings && settings.recruitFeatureUnlocked);
}

function isCustomPromptModeTemplate(t) {
  return !!(t && t.customMode === true && typeof t.id === "string" && typeof t.mode === "string" && t.id === t.mode);
}

function makeCustomPromptModeId(seed) {
  const slug = String(seed || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return "custom-" + (slug || Date.now().toString(36)) + "-" + Math.random().toString(36).slice(2, 6);
}

function getCustomPromptModeTemplates(settings) {
  const tpls = settings && settings.promptTemplates && typeof settings.promptTemplates === "object" ? settings.promptTemplates : {};
  return Object.values(tpls)
    .filter(isCustomPromptModeTemplate)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh"));
}

function getCustomPromptModeTemplate(settings, mode) {
  const tpls = settings && settings.promptTemplates && typeof settings.promptTemplates === "object" ? settings.promptTemplates : {};
  const t = tpls[mode];
  return isCustomPromptModeTemplate(t) ? t : null;
}

function getBuiltInVisiblePolishModeKeys(settings) {
  return isRecruitFeatureUnlocked(settings) ? ALL_POLISH_MODES.slice() : STANDARD_POLISH_MODES.slice();
}

function getVisiblePolishModeKeys(settings) {
  const custom = getCustomPromptModeTemplates(settings).map((t) => t.id);
  return [...getBuiltInVisiblePolishModeKeys(settings), ...custom];
}

function getModeMeta(settings, mode) {
  if (MODE_META[mode]) return MODE_META[mode];
  const custom = getCustomPromptModeTemplate(settings, mode);
  if (custom) {
    const name = custom.name || "自定义提示词";
    return { prefix: name, emoji: "🧩", label: "自定义提示词：" + name, goal: custom.description || "用户自定义提示词。", baseMode: custom.baseMode || "learning", custom: true };
  }
  return MODE_META.meeting;
}

function isKnownPolishMode(settings, mode) {
  if (mode === "off") return true;
  if (mode === "recruit" && !isRecruitFeatureUnlocked(settings)) return false;
  return !!(MODE_META[mode] || getCustomPromptModeTemplate(settings, mode));
}

function getEffectivePolishMode(settings, requested, fallback) {
  const fb = fallback == null ? "meeting" : fallback;
  const mode = requested || (settings && settings.polishMode) || fb;
  if (mode === "off") return mode;
  if (isKnownPolishMode(settings, mode)) return mode;
  return fb;
}

function legacyPromptFieldForMode(mode) {
  const map = {
    interview: "polishPromptInterview",
    meeting: "polishPromptMeeting",
    huddle: "polishPromptHuddle",
    monologue: "polishPromptMonologue",
    learning: "polishPromptLearning",
    recruit: "polishPromptRecruit",
  };
  return map[mode] || "";
}

function getVisibleModeEntries(settings, includeOff) {
  const entries = getVisiblePolishModeKeys(settings).map((key) => [key, getModeMeta(settings, key).prefix]);
  return includeOff ? [["off", "关闭，仅转写"], ...entries] : entries;
}

const SHARED_DISCIPLINE = `## §3 写作纪律
- **信息密度门槛**：每条 bullet 必须含 [事实 / 判断 / 动作 / 风险] 之一。仅描述对话过程的句子（"双方就 X 进行了讨论"）一律删除。
- **直接引用**：每节最多 1–2 句加引号，其余转述。
- **第三人称客观叙述**：用角色名或职位，避免"你/我"（独白模式除外）。
- **时效标记拿不准就降级**（保守优于乐观）。
- **不出现**：值得注意的是 / 总的来说 / 综上所述 / 综合考虑 / 显而易见 / 不难发现 / 一方面…另一方面 / 破折号。

## §4 反幻觉
- 对话中**没出现**的人名、公司名、时间、数字一律不写。必要时标"（推断）"。
- 转写质量差或语义不清的段落 → 写"**此段转写质量不足，信息略**"，不硬凑。
- **任何条件性章节**（共识 / 分歧 / 话术预演 等）对话里没真实出现 → **整块跳过**，不为结构完整性编造。

## §5 严禁
- ❌ 在转写空白处补"经讨论"等填充语
- ❌ 编造未出现的角色名 / 数字 / 引用
- ❌ 把 LLM 自己的总结当作受访者/参会者的观点写入

## §6 可视化元素（按需触发，仅在对话真实出现时使用）

- **对比表**：当对话比较 2+ 选项（方案 A vs B、人选 A vs B、新旧机制对比），用 Markdown 表格——**行=维度，列=选项**。

| 维度 | 选项 A | 选项 B |
|---|---|---|
| <要素> | … | … |

- **Mermaid 流程图**：当对话含条件/流程逻辑（"如果 X 则 Y 否则 Z"、按顺序触发的多步骤决策），用 \`mermaid\` 代码块嵌入：

\`\`\`mermaid
flowchart TD
  A[起点] -->|条件1| B[结果1]
  A -->|条件2| C[结果2]
\`\`\`

- **Mermaid 饼图**：当对话出现明确占比/分配数字（如 25/25/25/15、贡献率 30%、X 占 Y%），用 \`mermaid\` 代码块嵌入：

\`\`\`mermaid
pie title <名称>
  "A" : 25
  "B" : 25
\`\`\`

**不为美观硬塞**——对话里没有真实对比/流程/占比时，**不要编造图表**。`;

// 结构化程度三档 —— 控制主体内容的层级深度
// LexVoice 视图（.base 文件）—— 自动创建到 LexVoice/视图/{按模式,场景}/ 目录下
const LEXVOICE_BASES_FOLDER = "LexVoice/视图";

const LV_BASE_DEFINITIONS = [
  // —— 按模式 ——
  {
    relPath: "按模式/所有会议.base",
    yaml: `filters:
  and:
    - file.hasTag("lexvoice/meeting")
properties:
  file.name:
    displayName: 笔记
  note.time:
    displayName: 时间
  note.主题:
    displayName: 主题
  note.参会人:
    displayName: 参会人
  note.tags:
    displayName: 标签
views:
  - type: table
    name: 列表
    order:
      - file.name
      - note.time
      - note.主题
      - note.参会人
      - note.tags
    sort:
      - property: note.time
        direction: DESC
`,
  },
  {
    relPath: "按模式/内部小会.base",
    yaml: `filters:
  and:
    - file.hasTag("lexvoice/huddle")
properties:
  file.name:
    displayName: 笔记
  note.time:
    displayName: 时间
  note.议题:
    displayName: 议题
  note.当事人:
    displayName: 当事人
  note.参谋:
    displayName: 参谋
views:
  - type: table
    name: 列表
    order:
      - file.name
      - note.time
      - note.议题
      - note.当事人
      - note.参谋
    sort:
      - property: note.time
        direction: DESC
`,
  },
  {
    relPath: "按模式/所有访谈.base",
    yaml: `filters:
  and:
    - file.hasTag("lexvoice/interview")
properties:
  file.name:
    displayName: 笔记
  note.time:
    displayName: 时间
  note.主题:
    displayName: 主题
  note.受访者:
    displayName: 受访者
  note.访问者:
    displayName: 访问者
views:
  - type: table
    name: 列表
    order:
      - file.name
      - note.time
      - note.主题
      - note.受访者
      - note.访问者
    sort:
      - property: note.time
        direction: DESC
`,
  },
  {
    relPath: "按模式/招聘面试.base",
    yaml: `filters:
  and:
    - file.hasTag("lexvoice/recruit")
properties:
  file.name:
    displayName: 笔记
  note.time:
    displayName: 时间
  note.候选人:
    displayName: 候选人
  note.应聘岗位:
    displayName: 岗位
  note.轮次:
    displayName: 轮次
  note.录用建议:
    displayName: 录用建议
views:
  - type: table
    name: 列表
    order:
      - file.name
      - note.time
      - note.候选人
      - note.应聘岗位
      - note.轮次
      - note.录用建议
    sort:
      - property: note.time
        direction: DESC
  - type: table
    name: 强烈推荐
    filters:
      and:
        - note.录用建议 == "强烈推荐"
    order:
      - file.name
      - note.time
      - note.候选人
      - note.应聘岗位
      - note.轮次
  - type: table
    name: 推荐
    filters:
      and:
        - note.录用建议 == "推荐"
    order:
      - file.name
      - note.time
      - note.候选人
      - note.应聘岗位
      - note.轮次
  - type: table
    name: 倾向不推荐
    filters:
      or:
        - note.录用建议 == "倾向不推荐"
        - note.录用建议 == "倾向不推荐（条件性）"
    order:
      - file.name
      - note.time
      - note.候选人
      - note.应聘岗位
      - note.轮次
`,
  },
  {
    relPath: "按模式/独白手记.base",
    yaml: `filters:
  and:
    - file.hasTag("lexvoice/monologue")
properties:
  file.name:
    displayName: 笔记
  note.time:
    displayName: 时间
  note.主题:
    displayName: 主题
views:
  - type: table
    name: 列表
    order:
      - file.name
      - note.time
      - note.主题
    sort:
      - property: note.time
        direction: DESC
`,
  },

  // —— 场景 ——
  {
    relPath: "场景/本周纪要.base",
    yaml: `filters:
  and:
    - file.hasTag("lexvoice")
    - date(note.time) >= date("today") - "7 days"
properties:
  file.name:
    displayName: 笔记
  note.time:
    displayName: 时间
  note.mode:
    displayName: 模式
  note.主题:
    displayName: 主题
  note.tags:
    displayName: 标签
views:
  - type: table
    name: 本周
    order:
      - file.name
      - note.time
      - note.mode
      - note.主题
      - note.tags
    sort:
      - property: note.time
        direction: DESC
`,
  },
  {
    relPath: "场景/招聘看板.base",
    yaml: `filters:
  and:
    - file.hasTag("lexvoice/recruit")
properties:
  file.name:
    displayName: 笔记
  note.time:
    displayName: 时间
  note.候选人:
    displayName: 候选人
  note.应聘岗位:
    displayName: 岗位
  note.轮次:
    displayName: 轮次
  note.录用建议:
    displayName: 建议
  note.tags:
    displayName: 主题词
views:
  - type: table
    name: 全部候选人
    order:
      - file.name
      - note.time
      - note.候选人
      - note.应聘岗位
      - note.轮次
      - note.录用建议
      - note.tags
    sort:
      - property: note.time
        direction: DESC
  - type: cards
    name: 卡片视图
    order:
      - note.候选人
      - note.应聘岗位
      - note.轮次
      - note.录用建议
      - note.time
`,
  },
  {
    relPath: "场景/决策与待办.base",
    yaml: `filters:
  or:
    - file.hasTag("lexvoice/meeting")
    - file.hasTag("lexvoice/huddle")
properties:
  file.name:
    displayName: 笔记
  note.time:
    displayName: 时间
  note.mode:
    displayName: 类型
  note.主题:
    displayName: 主题
  note.议题:
    displayName: 议题
  note.参会人:
    displayName: 参会人
  note.当事人:
    displayName: 当事人
  note.tags:
    displayName: 标签
views:
  - type: table
    name: 列表
    order:
      - file.name
      - note.time
      - note.mode
      - note.主题
      - note.议题
      - note.参会人
      - note.当事人
      - note.tags
    sort:
      - property: note.time
        direction: DESC
`,
  },
  {
    relPath: "场景/全部纪要总览.base",
    yaml: `filters:
  and:
    - file.hasTag("lexvoice")
properties:
  file.name:
    displayName: 笔记
  note.time:
    displayName: 时间
  note.mode:
    displayName: 模式
  note.主题:
    displayName: 主题
  note.议题:
    displayName: 议题
  note.候选人:
    displayName: 候选人
  note.tags:
    displayName: 主题词
views:
  - type: table
    name: 全部
    order:
      - file.name
      - note.time
      - note.mode
      - note.主题
      - note.议题
      - note.候选人
      - note.tags
    sort:
      - property: note.time
        direction: DESC
`,
  },
];

const STRUCTURE_LEVEL_INSTRUCTIONS = {
  loose: `**结构化程度：宽松**
- 以散文段落叙述为主，每个自然话题写成一段连贯的叙述
- 仅在原文本身就在分点（"第一是… 第二是…"）时才用列表
- 列表层级最多 1 级，列表项保持简洁
- 关键判断或原话用 \`> \` blockquote 引用
- 适合：闲谈、个人独白、非正式访谈`,

  balanced: `**结构化程度：均衡（默认）**
- 每个自然话题以一句话主论点起头（短散文或加粗短语）
- 主要支撑信息用列表展开，**列表层级 1–2 级**
- 列表项简洁可扫读（每项 ≤30 字），需要展开的细节单独成段散文
- 关键判断或原话用 \`> \` blockquote 引用
- 议题间存在归并关系时，用一句话 cross-reference
- **不是逐字转录**：合并相邻同主题碎片，去口头禅，但保留事实和判断
- 适合：常规会议、访谈、产品评审、工作复盘`,

  strict: `**结构化程度：严谨**
- 每个话题用主论点（一句话总结）开头，可加粗
- 用嵌套列表呈现完整逻辑层级：
  - 一级要点：核心子论点
    - 二级支撑：具体事实 / 案例 / 数据 / 异议
      - 三级细节：仅必要时使用，关键事实点
- **列表层级最多 3 级**，每级要点都简洁可扫读
- 关键判断或决议另起 \`> \` blockquote 引用
- 议题间的关联用一句话点明
- **强结构化提炼**：把口语化叙述转化为论点—支撑—证据的逻辑层级，不要逐字转录
- 适合：深度复盘、战略讨论、复杂决策会议`,
};

function buildStructureLevelInstruction(level) {
  return STRUCTURE_LEVEL_INSTRUCTIONS[level] || STRUCTURE_LEVEL_INSTRUCTIONS.balanced;
}

// 各模式的 YAML frontmatter schema —— LLM 必须按此 schema 输出
// Frontmatter schema —— 字段名优先用中文（除 mode 程序识别 / tags Obsidian 约定）
// 角色相关字段（受访者 / 访问者 / 参会人 / 当事人 / 参谋 / 候选人 / 面试官）
// 用户后期可手动改成"代号 → 真名"形式，触发"重新整理"时插件会按映射替换正文里的代号
const FRONTMATTER_SCHEMA = {
  learning: `主题: <一句话主题>
来源: <B站 / YouTube / 播客 / 课程 / 讲座 / 未提及>
语言: <中文 / 英文 / 日文 / 多语种 / 未提及>`,
  interview: `主题: <一句话主题>
受访者:
  - <受访者姓名；推断不确定时写代号如 "受访者A（推断）">
访问者: <访问者姓名；未提及写 "未提及">`,
  meeting: `主题: <一句话主题>
参会人:
  - <姓名 1；推断不确定时可用代号如 "业务需求方（推断）">
  - <姓名 2>`,
  huddle: `议题: <一句话议题>
当事人: <决策当事人>
参谋:
  - <参谋 1>`,
  monologue: `主题: <一句话主题>`,
  recruit: `候选人: <候选人姓名；未提及写 "未提及">
应聘岗位: <应聘岗位>
轮次: <初面 / 二面 / 终面 / 复试>
录用建议: <强烈推荐 / 推荐 / 倾向推荐 / 倾向不推荐 / 不推荐>`,
};

function buildPrompt(modeBody, isMerged, modeKey) {
  const inputDesc = isMerged
    ? `分段转写（含 \`===SEG N (MM:SS-MM:SS)===\` 分隔符，请先合并并抹平段切点处的断句）`
    : `原始转写文本`;
  const fmSchema = FRONTMATTER_SCHEMA[modeKey] || "";
  const frontmatterSection = fmSchema
    ? `**输出文件必须以 YAML frontmatter 开头**，仅包含以下精简字段（不要添加任何其他字段——\`mode\`/\`time\`/\`时长\`/\`状态\`/\`tags\` 由插件自动注入，**LLM 不要输出**；也不要输出 \`date\`/\`日期\`/\`location\`/\`decision\`/\`decisions\`/\`todos\`/\`type\`/\`status\`）：

\`\`\`yaml
---
${fmSchema}
---
\`\`\`

填入真实值；转写未提及的字段写 "未提及"，不要编造。frontmatter 后空一行，再开始 Markdown 内容。

**末尾必须输出多维度中文标签建议**（用于插件回写到 frontmatter.tags，方便用户从主题 / 项目 / 公司 / 人物 / 行业等多角度跨纪要检索）。在文档**最后一行**添加注释（不会渲染显示）：

\`\`\`html
<!-- lexvoice-tags: 主题/招聘流程, 主题/AI转型, 项目/晋升提名, 公司/示例科技, 人物/某负责人, 行业/HR -->
\`\`\`

**标签格式约定**：每个 tag 用「中文前缀 + 斜杠 + 具体词」的 nested 形式，让 Obsidian 的标签面板自动按维度分组。

**5 个维度（按需写，不强求每个都有）**：

- **主题** ✅ 必填（3–5 个）：核心议题或讨论领域。例 \`主题/招聘流程\`、\`主题/AI转型\`、\`主题/组织设计\`、\`主题/晋升机制\`、\`主题/数据治理\`
- **项目**（按需，0–3 个）：转写中明确出现的专有项目名。例 \`项目/晋升提名\`、\`项目/招聘流智能体\`、\`项目/Q2交付\`
- **公司**（按需，0–2 个）：公司或组织名（必须明确出现）。例 \`公司/示例科技\`、\`公司/示例集团\`
- **人物**（按需，0–3 个）：关键人名或角色（仅当 senior、有判断力、反复出现、或对结论关键时）。例 \`人物/某专家\`、\`人物/某负责人\`
- **行业**（可选，0–1 个）：行业或职能领域。例 \`行业/HR\`、\`行业/游戏\`、\`行业/汽车制造\`

**硬性要求**：

- 总数 5–10 个，主题维度至少 3 个
- 每个 tag 的"具体词"部分 ≤6 个汉字，避免空格和标点（"AI转型" 而非 "AI 转型"）
- 不要重复 mode 字段语义（**禁止** 输出 \`主题/招聘面试\`、\`主题/会议\`、\`主题/访谈\` 这类与 mode 重复的词）
- 转写中**没明确出现**的项目/公司/人物**一律不写**，不要编造
- 优先具体词（"招聘漏斗指标" 而非 "招聘"；"晋升提名项目" 而非 "项目"）
- 系统标签 \`lexvoice/<mode>\` 由代码自动注入，**不要在标签建议里重复**
`
    : "";
  return `你是录音整理助手。输入是一段${inputDesc}。按下方规则生成纪要。

${frontmatterSection}**整体结构原则**：顶部用 callout 做结构化速览（摘要、必要时的决策清单/录用建议），**主体内容贴近原文按实际推进顺序展开**——用三级标题 + 散文段落叙述，不强行套"讨论要点 / 分歧 / 暂行结论"等模板框。关键判断引用用普通 \`> \` blockquote 即可，不要为每个话题再套 callout。

**待办任务语法**：凡是正文中出现待办 / 行动项 / 下一步，请统一使用 Markdown todo 任务列表，不要用表格、普通项目符号或 \`TODO:\` 前缀。格式：\`- [ ] 责任人：<人> 事项：<具体动作> 截止：<时间>\`；如果位于 callout 内，保留引用前缀写成 \`> - [ ] ...\`。无法判断责任人或截止时间时写「未提及」，不要编造。

**Callout 使用纪律**（仅以下场景用 callout，其他一律散文叙述）：
- \`> [!info]\` 仅在具体模式模板已经给出信息卡时使用；工作纪要模式不要新增元数据卡片
- \`> [!abstract]\` 顶部摘要散文
- \`> [!success]\` / \`> [!important]\` 顶部决策清单或一句话定调（仅必要时）
- \`> [!ai-eval]\` 招聘模式专属 AI 评价
- \`> [!tip]\` 模式不匹配的软建议
- \`> [!question]\` 悬而未决/待澄清（仅在出现时）
- 其他正文一律不用 callout

**主体内容写作要求**（**结构化提炼**，不要逐字转录）：
- 把讨论的逻辑层级**结构化**呈现：议题/主论点 → 支撑（事实、案例、数据、异议）→ 关键细节
- 按讨论实际推进的脉络组织（不预设议程），但每个话题内部要做层级提炼
- 关键判断或具有信号量的原话用 \`> "<原话>"\` 引用
- **适度概括**：合并相邻的同主题碎片，去口头禅，但保留所有有信息量的判断和事实
- 议题间存在归并关系时，用一句话 cross-reference，不重复叙述

{{STRUCTURE_INSTRUCTION}}

${modeBody}

${SHARED_DISCIPLINE}

---

转写：
{{TRANSCRIPT}}`;
}


const BRIEFING_LANGUAGE_LABELS = {
  "zh-CN": "中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
};

function getBriefingTargetLanguage(settings) {
  const id = settings.briefingTargetLanguage || "zh-CN";
  if (id === "custom") return (settings.briefingCustomLanguage || "").trim() || "用户指定语言";
  return BRIEFING_LANGUAGE_LABELS[id] || id;
}

function buildBriefingLanguageInstruction(settings) {
  const mode = settings.briefingTranslationMode || "off";
  if (mode === "off") return "";
  const target = getBriefingTargetLanguage(settings);
  const keepTerms = settings.briefingKeepOriginalTerms !== false;
  const extra = (settings.briefingLanguageInstruction || "").trim();
  const parts = [
    "## 纪要语言与翻译策略",
    "- 只在 AI 整理后的纪要中处理语言；底部原始转写由程序保留，不要改写、删除或声称已替换原始转写。",
    "- 会议中可能混合多种语言。先理解语义，再按纪要结构整合，不要机械逐句翻译。",
    "- 目标语言：" + target + "。",
  ];
  if (mode === "translate") {
    parts.push("- 输出正文统一使用目标语言。除人名、公司名、产品名、代码、协议名、模型名等专有名词外，不做逐句双语对照。");
  } else if (mode === "bilingual") {
    parts.push("- 输出以目标语言为主；关键决策、争议点、术语首次出现或短直接引语可在括号中保留原文短语。不要做逐句双语对照。");
  }
  if (keepTerms) {
    parts.push("- 人名、组织名、产品名、模型名、代码标识、英文缩写和行业术语优先保留原写法；必要时在目标语言后括注原文。");
  }
  if (extra) parts.push("- 额外要求：" + extra);
  return parts.join("\n");
}

function applyBriefingLanguageInstruction(prompt, settings) {
  const instruction = buildBriefingLanguageInstruction(settings || {});
  return instruction ? prompt + "\n\n---\n\n" + instruction : prompt;
}

const MODE_BODIES = {
  learning: `## §0 适用判断
本模式用于把视频、播客、课程、讲座、公开课、直播回放或电脑音频监听内容整理成学习笔记。重点不是复刻字幕，而是提炼知识、保留论证、沉淀可复用条目。

适合：
- B 站 / YouTube 上的信息密度较高的视频
- 学术讲座、课程、论文解读、技术分享
- 外语音频，需要边理解边翻译关键内容
- 用户后续会通过 Paste、剪藏或知识库收纳进行二次整理的材料

不适合：
- 纯会议决策纪要（应使用会议纪要）
- 面向候选人评价的招聘面试（应使用招聘面试）
- 单人自言自语的灵感记录（应使用个人手记）

## §1 输出结构
请按以下顺序输出，但不要机械填充空模块。没有信息就跳过。

> [!info] 学习材料
> 主题：<一句话主题>
> 来源：<平台/视频/课程/讲座；未知写未提及>
> 语言：<中文/英文/多语种/未提及>
> 内容类型：<课程/讲座/访谈/论文解读/技术分享/纪录片/其他>

> [!abstract] 核心摘要
> 用 5–8 句话说明这段内容真正讲了什么、解决什么问题、最重要的结论是什么。不要写成宣传语。

### 一、学习要点
按知识点组织，而不是按转写顺序逐句复述。每个要点包含：
- 核心观点：一句话说明
- 论据或例子：来自音频/视频中的事实、数据、案例、类比
- 为什么重要：它改变了什么理解，或能用于什么判断

### 二、概念与术语
列出值得收纳的术语、概念、模型、方法。格式：
- **术语/概念**：解释。必要时补充原文表达或英文原词。

### 三、可收纳卡片
把内容拆成适合后续 Paste / 剪藏 / 知识库复用的原子卡片。每张卡片尽量短，避免大段复制。

#### 卡片：<卡片标题>
- 摘要：<2–4 句话>
- 适合放入：<主题/项目/课程/人物/概念>
- 标签建议：#学习 #视频笔记 #<具体主题>
- 可复用句：<可以直接复制到笔记里的高密度表达>

### 四、翻译与跨语言理解
如果转写中存在外语内容：
- 先用中文概括关键含义，不逐句双语对照。
- 保留人名、机构名、产品名、论文名、模型名、专业术语原文。
- 对关键术语给出「原文 → 中文解释」。
- 如果原文表达本身很重要，可以引用短句并给出中文解释。
如果没有明显外语内容，本节跳过。

### 五、值得追问的问题
列出 3–6 个进一步学习问题，帮助用户继续查资料、写笔记或形成自己的判断。

### 六、行动建议
如果内容包含方法、工具、论文、书单、实验或实践步骤，请整理成可执行清单。没有就跳过。

## §2 写作要求
- 优先提炼观点、证据、概念和关系，不要把字幕改写成流水账。
- 明确区分“视频中明确说了什么”和“整理者推断出的含义”。
- 重要结论要说明依据；没有依据时标注“转写中未提供充分依据”。
- 适合收纳的内容要短、清晰、有标题，方便用户后续通过 Paste 进入知识库。
- 对外语内容做理解型翻译，不要生成冗长逐句译文。
`,
  interview: `## §0 适用判断
本模式典型适用于：1 位访问者 + 1–3 位受访者，明确 Q&A 结构，对外传播或归档。

**重要**：即使当前对话不完全契合本模式特征（如出现内部小会、独白），**也按本骨架完整生成内容**，不要拒绝。
仅当**明显**不契合时（如纯独白），在文档**最末尾**追加：

> [!tip] 模式建议
> 本对话更像【<更契合的模式>】。理由：<一句>。下次可改用对应模式重新整理。

## §1 角色识别
- 标签：【访问者】/【受访者】（多人时【受访者A】【受访者B】），全篇一致。
- 推断依据：提问 vs 回答的结构、语气、内容角色。不确定标「（推断）」。

## §2 输出结构

### 顶部速览（结构化分析，使用 callout）

> [!info] 访谈信息
> 受访者：<推断；未提及写「未提及」> · 主题：<一句话> · 时长：<MM:SS>

> [!abstract] 摘要
> 写一段 150–250 字第三人称散文综述：访谈背景与主题 → 受访者核心立场 → 3–5 个最重要的观点 → 最值得注意的发现或悬而未决之处。不摘抄原话。

### 主要内容（贴近原文展开，散文叙述）

按访谈实际推进顺序展开。每个自然话题用三级标题（6–12 字概括话题主旨）。

每个话题正文：
- **散文段落叙述**为主：第三人称叙述受访者怎么展开这个话题、提了哪些事实和观点、举了什么例子。去口头禅，保留语感与判断
- **关键判断引用 1–2 句**：用普通 blockquote（即一个大于号加一个空格开头的行）突出确实有信号量的句子；不是 callout，是普通 blockquote
- **不强加** 「讨论要点 / 分歧 / 待澄清」 等模板段
- **保留信息密度**：每段含事实/判断/动作/风险之一，不写空话凑字数
- **不为结构完整性凑话题**：原文没展开的就不写

#### <话题 1>
<散文叙述。>

> 「<有信号量的原话>」 — <受访者>

<继续叙述。>

#### <话题 2>
…

### 悬而未问（仅当受访者闪避或访问者未追问时写）

普通无序列表：
- <具体闪避点或未追问点>

### 值得保留的原话（仅当真有 1–3 句强信息量原话时单列）

> 「<原话>」 — <受访者>

补充严禁：
- ❌ 把每个话题硬塞成「讨论要点 / 反驳 / 暂行结论」四件套
- ❌ 为结构完整性凑话题
- ❌ 把访问者引导词当作受访者观点
- ❌ 在主体内容里嵌套 callout（仅顶部速览用 callout）`,

  meeting: `## §0 适用判断
本模式典型适用于：≥3 人正式会议，有议程或明确决议/待办。

**重要**：即使当前对话不完全契合（如 2 人对话、无明确议程），**也按本骨架完整生成内容**，不要拒绝。
仅当**明显**不契合时（如纯独白），在文档**最末尾**追加：

> [!tip] 模式建议
> 本对话更像【<更契合的模式>】。理由：<一句>。下次可改用对应模式重新整理。

## §1 角色识别
- 优先用对话中出现的真实姓名/岗位代号（「新权」/「玉鹏」/「超哥」等），不要用【发言人 N】
- 仅当某段发言完全无法绑定到具体人时才用【发言人 N】
- 推断的角色加（推断），全篇一致

## §2 输出结构

### 顶部速览（结构化分析，使用 callout）

> [!abstract] 摘要
> 写一段 180–280 字第三人称散文综述：会议背景与目的 → 主要议题脉络 → 关键决议（保留/否决/新启动）→ 重要待办与时限 → 仍未解决的争议或风险。不摘抄原话。

> [!success] 决策与待办（仅在出现时写）
>
> 三类决策（无内容则跳过该子项）：
> - **保留**：<继续做的事项 — 原因>
> - **新启动**：<本次决定开干的事项 — 牵头人>
> - **否决**：<明确排除的选项 — 理由>
>
> 待办（无则跳过，必须使用 Markdown todo 任务语法；不要写成表格或普通列表）：
> - [ ] 责任人：<责任人> 事项：<具体动作> 截止：<何时之前> 优先级：<高/中/低>
>
> 截止时间避免「待定」，写「本周内/两周内/Q2 末/X 月 X 日前」等可锚定形式；无法判断责任人或截止时间时写「未提及」，不要编造。

### 主要议题（贴近原文展开，散文叙述）

按会议实际推进顺序展开（不预设议程）。每个议题用三级标题（6–12 字）。

每个议题正文：
- **散文叙述**：会议从什么前提推进到什么结论，谁在哪个节点提了什么观点，怎么形成共识或分歧
- **关键判断引用 1–2 句**：用普通 blockquote 突出有锚定意义的判断；情绪表达不引用
- **不强加** 「讨论要点 / 分歧 / 暂行结论」 三段式 —— 让议题真实形态决定写法
- 议题间存在归并关系时（A 议题谈到的事在 B 议题又提到），用一句话点 cross-reference，不重复叙述
- 适度概括：去口头禅、合并冗余表达，但**保留判断的原貌**

#### <议题 1>
<散文叙述讨论脉络与各方观点。>

> 「<有锚定意义的原话>」 — <发言人>

<继续叙述与暂行结论。>

#### <议题 2>
…

### 悬而未决（仅在出现时写）

普通无序列表：
- <未决条目>

补充严禁：
- ❌ 为每个议题硬套「讨论要点 / 分歧 / 暂行结论」三段式
- ❌ 在主体议题里大量嵌套 callout（仅顶部用 callout）
- ❌ 把「讨论了」当作「决定了」
- ❌ 没出现的待办为对称感凑出来
- ❌ 议题机械按发言时序排（要按主题归并）`,

  huddle: `## §0 适用判断
本模式典型适用于：2–5 人内部小会，多方贡献观点，有现实推进目标（决策/谈判准备/复盘/选项权衡）。

**重要**：即使当前对话不完全契合，**也按本骨架完整生成内容**，不要拒绝。
仅当**明显**不契合时（如纯独白），在文档**最末尾**追加：

> [!tip] 模式建议
> 本对话更像【<更契合的模式>】。理由：<一句>。下次可改用对应模式重新整理。

## §1 角色识别（生成前先判定，全篇一致）
- **禁用**「访问者/受访者」「主持人/嘉宾」这类主从标签
- 按发言内容判功能定位：决策当事人 / 参谋 / 执行者 / 合伙人 / 利益相关方
- **当事人优先级**：用户上下文明确指明 → 按指明的来；否则推断（谁面临具体决策、谁的处境是议题中心）；仍无法判定 → 用 A/B/C 并在信息卡加备注

## §2 输出结构

### 顶部速览（结构化分析，使用 callout）

> [!info] 对话信息
> 时间：<推断> · 时长：<MM:SS> · 议题：<一句话>
> 参会：<姓名/角色 — 功能定位>（例：某负责人（当事人） / 某参谋（辅助分析））

> [!abstract] 摘要
> 写一段 150–250 字第三人称散文综述：对话背景与诉求 → 当事人面临的核心抉择 → 主要议题与各方立场 → 关键结论或下一步行动 → 留待当事人继续思考的开放问题。

> [!important] 一句话定位
> ≤50 字。本次对话**解决了什么 + 悬置了什么**，一句两分句。

### 主要内容（贴近原文展开，散文叙述）

按对话实际推进的脉络组织（不预设议程）。每个议题用三级标题。

每个议题正文：
- **散文叙述**为主：当事人面临什么处境、参谋怎么戳破盲点、各方观点如何交锋
- **保留参谋的关键判断** —— 这是小会的核心价值，参谋的「戳破」必须保留并清晰呈现
- **关键引用**：用普通 blockquote 突出有信号的判断
- **不强加** 「共识 / 立场 / 分歧 / 待办」 四件套

#### <议题 1>
<散文叙述。>

> 「<参谋戳破的关键判断或当事人原话>」 — <角色>

<继续叙述与暂行结论。>

### 认知提醒（**本模式核心**，必有 1–3 条）

参谋戳破的盲点 / 当事人未察觉的偏差 / 沉没成本陷阱 / 隐性假设。每条 ≤2 行：

> [!important] 提醒 N
> **点题**：<一句话本质>
> **展开**：<一句话为什么是盲点>

### 自己要继续想的问题（主语是当事人，仅当出现时写）

≤7 条普通列表：
- <当事人能自己回答的问题>

### 话术预演（条件触发：仅当对话讨论了下一场谈话/沟通的应对策略时出现）

> [!question] 对方可能反问
> 「<可能的提问>」

**回应思路**：<散文叙述要点，不嵌 callout>

补充严禁：
- ❌ Q-A 一问一答格式（访谈体）
- ❌ 单列「值得保留的原话」金句墙（公开传播体）
- ❌ 「主持人」「嘉宾」「访问者」「受访者」标签
- ❌ 回避或转述参谋的提问（必须保留并归类）
- ❌ 在主体议题里嵌套 callout（仅顶部速览和「认知提醒」用 callout）`,

  monologue: `## §0 适用判断
本模式典型适用于：单人语音笔记、口述、灵感记录、自我反思。

**重要**：即使当前内容不完全契合（如出现多人对话），**也按本骨架完整生成内容**——多人对话场景按「主要发言人独白」处理。
仅当**明显**不契合时，在文档**最末尾**追加：

> [!tip] 模式建议
> 本对话更像【<更契合的模式>】。理由：<一句>。下次可改用对应模式重新整理。

## §1 视角
保持**第一人称叙述**，不用【说话人】标签。**保留作者原语气与句式风格**（这是独白模式的核心价值）。

## §2 输出结构

### 顶部速览（结构化分析，使用 callout）

> [!abstract] 摘要
> 写一段 100–200 字第一人称散文综述：本段独白的核心命题 → 主要思路或观察 → 最值得保留的洞察或问题。保留作者语气，不摘抄原话。

### 主要内容（贴近原文展开，保留作者语感）

按独白实际涌现的思绪顺序展开。每个自然主题用三级标题。

每个主题正文：
- **保留作者原语气与句式**：去口头禅、去重复字，但**不要改写**作者的表达方式
- 句式整理后保留判断的原貌
- 不要把散思碎念硬套成议程
- 适度概括：合并相邻的同主题碎片，但**保留每一个有信息量的判断**

#### <主题 1>
<整理后的独白段落，第一人称叙述，保留原语感。>

#### <主题 2>
…

### 值得保留的表达（仅当出现 1–3 句特别好的表达时写）

> 「<原话>」

### 延伸思考（仅当独白中能推出待展开的点时写）

普通列表：
- <从独白中能推出的待展开方向>

补充严禁：
- ❌ 用【说话人】标签
- ❌ 摘要式压缩观点（保留所有有信息量的表达）
- ❌ 改写作者风格
- ❌ 在主体内容里嵌套 callout（仅顶部摘要用 callout）`,

  recruit: `## §0 适用判断
本模式典型适用于：1 位面试官（或 1 个面试小组）+ 1 位候选人，目的是评估候选人是否适合某岗位。明确的「提问—回答—评估」结构。

**重要**：即使转写不完全契合（如出现 2 名面试官、群面、电话非正式聊），**也按本骨架完整生成内容**。
仅当**明显**不契合时（如纯访谈/独白/会议），在文档**最末尾**追加：

> [!tip] 模式建议
> 本对话更像【<访谈/会议/小会/独白>】。理由：<一句>。下次可改用对应模式重新整理。

## §1 角色识别
- 标签：【面试官】/【候选人】（多面试官时【面试官 A】【面试官 B】）
- 推断依据：发问的一方 = 面试官；陈述自身经历/技能/想法的一方 = 候选人
- 识别候选人姓名、应聘岗位（若提及）；未提及标「未提及」

## §0.5 评分校准纪律（**生成前先内化，每条都必须遵守**）

候选人在面试中表现出以下行为属于 **基础职业素养（baseline）**，**不计入亮点**：
- ❌ 诚实承认自己边界（「我没那么深」「我只做辅助」「主要由 PM 主导」）
- ❌ 对未闭环结果保持保守（「还在试运行」「还没看到结果」「跟我们的预期还有差距」）
- ❌ 不夸大自己贡献
- ❌ 配合面试官追问（基础礼貌）
- ❌ 能给出框架但缺少案例支撑

### 【硬规则 · 必须列入红旗】
- 项目结果未闭环、未量化、或仅为「试点/进行中」 → 红旗
- 候选人在某项目的**独立主导范围**需面试官追问超过 2 次才能定位 → 红旗（边界本身就不清）
- JD 要求行业/业务/技能与候选人背景有跨度，且无证据弥合 → 红旗
- 关键能力领域只有「接触过/听说过/在了解」级别认知 → 红旗
- 关键交付描述全靠模糊词（「提效了」「更准确」「帮助决策」）无量化 → 红旗
- 候选人主动提问停留在「职责边界澄清」层面（senior 应问「业务/组织/战略」层面）→ 红旗

### 【硬规则 · 追问数量当扣分信号】
- 某题需要 ≥2 个 ⛏ 追问才能挖到事实层 → 候选人未自主展开 → 该题评分**至少扣半档**
- 不要把「AI 生成大量追问建议」看作「题质量好」，而要看作「候选人没自主到位」

### 【硬规则 · 录用建议必须明确】
- 五档：【强烈推荐 / 推荐 / 倾向推荐（条件性）/ 倾向不推荐（条件性）/ 不推荐】
- **禁止用「待定」逃避明确判断**——如果信息不足以定论，写「倾向不推荐（除非二面能证明 X）」
- 倾向不推荐 ≠ 不推荐：前者留有「如果二面验证某具体点则可推进」的条件路径

## §0.6 评价方法 · 反向期待法（**像面试官一样思考**）

不要先看候选人说了什么再评价；先想 **达到 JD seniority 的标杆人应该长什么样**，再看候选人离标杆多远。

### 五步判断流程
1. **建立 reference**：列出 JD seniority 的标杆人在 3–5 个核心维度上应该有的表现
2. **测 gap**：每条 reference 对照候选人的真实表现，给「达到 / 偏离 / 完全未达」三档判断
3. **扫「潜在优势」**：候选人简历/陈述里所有「本可以加分」的资源（编程能力 / 跨界经验 / 行业资源 / 个人项目 / 开源贡献 / 特殊证书等），**逐项判断它在本场是否被激活**
4. **找最重失分点**：在所有 gap 里，**「潜在但未激活的优势」** 权重最高 —— 因为候选人不是「没有」而是「有却没用」，是 senior 候选人最大原罪
5. **一句话定调**：用「X，Y，**尤其是 Z**」句式，Z 放最重失分点

### 判断句 vs 描述句（必须用判断句）
- ❌ 描述句：「短板在于回答偏绕，抽象概念较多」/「经验匹配度较好」
- ✅ 判断句：「是个纯基础执行者」/「停留在转译需求层」/「编程能力没发展为优势」

### 失分排序（「尤其是」用哪个）
1. **未激活的优势** —— 候选人有 X 但本场 X 没被激活成优势。优先入「尤其是」
2. **硬不匹配** —— JD 明文要求 vs 候选人背景直接矛盾（行业、年限）
3. **核心能力 gap** —— JD 软性核心要求未达 senior 深度
4. 普通短板 —— 沟通、表达、临场

### AI 使用程度的提炼纪律（仅当 JD 涉及 AI 维度时适用）
- 「AI 使用画像」 章节是事实层，**先填该表再下评价结论**
- 候选人提到的所有 AI 工具/项目/陈述都要在表中出现（去口头禅，但不主观删减）
- 用 L0/L1/L2/L3 量表标定深度，不允许写空泛的「AI 敏锐度较好」
- 「未激活的优势」判断必须以 AI 使用画像的事实为依据

## §2 输出结构（**严格按此顺序：顶部结构化分析 + 主体贴近原文展开**）

### 顶部 · 结构化分析（这部分用表格和 callout，承担「评估快报」角色）

> [!info] 面试信息
> 候选人：<姓名/未提及> · 应聘岗位：<推断> · 面试时长：<MM:SS> · 面试官：<姓名/角色>
> 面试形式：<现场/线上/电话> · 轮次：<推断>

> [!important] 结论
> <一句话定调，≤80 字，判断句，必须用「X，Y，尤其是 Z」句式，Z 放最重失分点>
>
> 写作约束：
> - 必须 ≤80 字，判断句
> - 必须用「尤其是」句式
> - 「尤其是」 优先选「未激活的优势」
> - 不许出现「综合来看」「整体表现」等过渡空话

#### 候选人画像

写一段 150–250 字第三人称散文，展开「结论」的判断依据：候选人背景 → 各能力维度的实际表现 vs JD seniority 标杆人的差距 → 主要风险点。**不重复结论原文**，不再次溢美承认边界等基础职业素养。

#### AI 使用画像（仅当 JD 涉及 AI / 自动化 / 工具效率维度时出现）

候选人涉及 AI 的全部原话证据（按出现顺序，去口头禅保留原意）：

| # | 涉及内容 | 候选人原话/精炼 | 题号 |
|---|---|---|---|
| 1 | 提到的 AI 工具 | <列举> | 第 X 题 |
| 2 | 编程能力实际用法 | <精炼> | 第 X 题 |
| 3 | AI 项目角色 | <主导/辅助/接需求> | 第 X 题 |
| 4 | 对 AI 的认知判断 | <候选人主动表达的观点> | 第 X 题 |
| 5 | 对自己 AI 能力的边界陈述 | <候选人原话> | 第 X 题 |
| 6 | 个人 AI 项目 / 社区参与 | <证据/未提及> | — |

深度量表（4 维度独立标定）：

| 维度 | 等级 | 判断依据 |
|---|---|---|
| 工具使用层级 | L<0/1/2/3> | <从原话证据推导> |
| 思维定位 | L<0/1/2/3> | <被动接需求 / 主动找场景 / 能设计 AI 嵌入路径> |
| 编程能力激活度 | L<0/1/2/3> | <未激活 / 部分激活 / 完全转成优势> |
| 个人 AI 项目 / 社区参与 | L<0/1/2/3> | <未提及为 L0；浅提为 L1；有实质产出为 L2+> |

等级定义：L0 听过/有概念 · L1 工具型使用 · L2 日常嵌入 · L3 主导级（个人 AI 项目/二次开发/开源贡献）

vs JD 期望：JD 要求 L<x> · 候选人实际 L<y> · 差距：<一句客观>

#### 潜在优势核验

| 潜在加分点 | JD 是否需要 | 本场是否激活 | 判断 |
|---|---|---|---|
| <例：Python 编程> | ✓ | ✗ 仅做数据整理 | 未激活（关键失分） |
| <例：3 年晋升体系搭建> | ✓ | ✓ | 已激活 |
| <例：跨制造业到游戏> | ✗ | — | 反成劣势 |

若候选人无任何潜在加分点，写「未识别到候选人特有的潜在优势」，不留空表。

#### JD 匹配度

**硬性要求**

| JD 要求 | 评分 | 证据（题号） | 缺口 |
|---|---|---|---|
| <要求> | ⭐⭐⭐☆☆ | 第 X 题 | <未覆盖> |

**加分项**

| 加分项 | 是否验证 | 备注 |
|---|---|---|
| <加分项> | 未问及/已验证 | <备注> |

#### 两头不接诊断（仅当 JD 是多极化岗位时出现，否则跳过）

- A 端深度证据：<列举/未提供> → ⭐⭐⭐
- B 端深度证据：<列举/未提供> → ⭐⭐
- 诊断：<真双栖 / 偏科可考 / 两头不接>

若诊断为「两头不接」，录用建议**必须**倾向不推荐。

#### 通用素质

| 维度 | 评分 | 简评 |
|---|---|---|
| 思维逻辑 | ⭐⭐⭐☆☆ | <一句> |
| 沟通表达 | ⭐⭐⭐☆☆ | <一句> |
| 学习成长性 | ⭐⭐⭐☆☆ | <一句> |

候选人在 JD 锚点上未达 senior 深度时，通用素质中等不构成补分依据。

#### 录用建议

**建议**：<五档之一>

**判定路径**：
- 已明确证明达标的 JD 要求：<列举/无>
- 完全未问到或无法提供证据的：<列举>
- 综合：<一句>

**二面验证条件**（仅当选条件性档位时填）：
- 二面若能证明 <具体点 X> → 改推荐
- 二面若 <具体点 Y> 仍无法验证 → 改不推荐

---

### 主体 · 问答展开（**贴近原文，散文叙述，不再用 callout 套娃**）

按问题为单位组织。每个问题用四级标题（6–12 字概括）。**禁止**用「[!quote]」+「[!note]」+「[!ai-eval]」三个 callout 叠加。

每个问题块固定写法：

#### 问题 N：<主题>

**面试官问了什么**：散文一句概括提问意图与具体问法。可用普通 blockquote 引用 1 句关键问法（不是 callout）。

**候选人答了什么**：散文叙述候选人的回答展开过程。保留所有信息点，去口头禅。关键判断用普通 blockquote 引用 1–2 句。可用极简列表拆要点，但仅当候选人本身就在分点时。

> [!ai-eval] AI 评价
> 回答质量：⭐⭐⭐☆☆ — <一句话定调本质>
>
> 维度（**仅写适用的，不强凑 4 项**）：<专业深度 / 逻辑结构 / 真实感 / 临场应变 中适用的几项，散文一句一项>
>
> 可继续追问（必须能挖到事实层，不许「能不能再说说」这种泛问）：
> - ⛏ <具体追问 1>
> - ⛏ <具体追问 2>
>
> 红旗或亮点（**单边可选，不强凑对称**，仅当真有时写）：
> - <一句具体描述>

#### 问题 N+1：…

…

---

### 末尾区块（按需出现）

#### 候选人主动提问（仅当候选人主动提问时出现）

| 提问 | 反映的关切点 / 专业判断力 |
|---|---|
| 「<问题>」 | <一句解读，含「是否符合该 seniority 应有的提问深度」判断> |

#### 风险点与待澄清

普通列表，不分桶：
- <红旗类：简历自相矛盾 / 离职原因模糊 / 关键能力存疑 / ASR 不清需复核>
- <待澄清类：本场没问到、但 offer 前必须问清的点>

#### 后续行动

- [ ] <推进/淘汰/二面 — 责任人 — 具体时限>
- [ ] <若推进：背调重点询问的点>
- [ ] <若录用：onboarding 要重点关注的能力短板>

补充严禁：
- ❌ 编造候选人没说的经历或数据
- ❌ 「可继续追问」写成无效追问（「能不能再说说」）；必须是具体的、能挖到事实层的问题
- ❌ 把面试官的引导提示当作候选人观点
- ❌ AI 评价跳过 [!ai-eval] callout 用普通文本写——**仅 AI 评价用专属 callout**
- ❌ **把 baseline 当 bonus**——诚实/不夸大/承认边界/对未闭环保持保守，这些不计入亮点
- ❌ **默认及格**——某 JD 要求没问到就标「未验证」，不许默认 ⭐⭐⭐
- ❌ **用通用素质给 JD 不匹配补分**——沟通好不抵消行业不匹配
- ❌ **「待定」逃避**——必须给五档明确建议
- ❌ **追问数量当中性输出**——某题需 ≥2 个 ⛏ 才能挖到事实 = 候选人未自主展开 = 扣分
- ❌ **跨界岗位折中评分**——独立评 A 端和 B 端；两端都不达 senior 深度 = 两头不接 = 倾向不推荐
- ❌ **把候选人的初级问题当专业关切**——senior 候选人若只问「职责边界澄清」反而是红旗
- ❌ **在问答展开里给每个问题套 [!quote] + [!note] callout**——只有 AI 评价用 callout，其余散文叙述
- ❌ 评分尺度漂移——⭐⭐⭐☆☆ 是默认及格线，不是默认锚点；⭐⭐⭐⭐☆ 必须有可量化证据`,
};

const POLISH_PROMPTS = {
  learning: buildPrompt(MODE_BODIES.learning, false, "learning"),
  interview: buildPrompt(MODE_BODIES.interview, false, "interview"),
  meeting: buildPrompt(MODE_BODIES.meeting, false, "meeting"),
  huddle: buildPrompt(MODE_BODIES.huddle, false, "huddle"),
  monologue: buildPrompt(MODE_BODIES.monologue, false, "monologue"),
  recruit: buildPrompt(MODE_BODIES.recruit, false, "recruit"),
};

const INDUSTRY_META_PROMPT = `你是提示词优化专家。请基于用户的角色、工作任务和参考提示词，生成一份可直接用于 LexVoice 录音整理的自定义提示词。

【用户背景】
角色 / 行业：{{INDUSTRY}}
常见任务：
{{SCENARIOS}}
关注点：
{{FOCUS}}
输出偏好：
{{OUTPUT_PREFERENCE}}

【参考提示词】
{{MODE}}

参考提示词只用于确定大方向，不要照搬固定模板。请把 Prompt 写成适合用户真实工作的「自定义提示词」。

【生成目标】
- 只生成 1 份 Prompt，不要给多套方案。
- 这份 Prompt 会直接保存为一个可调用的提示词，用户会在录音、导入音频、重新整理时选择它。
- 输出应帮助大模型把转写内容整理成可读、可用、可复盘的 Markdown 笔记。
- 前面可以有结构化摘要、结论、待办或风险；待办 / 行动项必须使用 Markdown todo 任务语法 \`- [ ]\`，不要写成表格或普通项目符号；后面的展开部分应贴近讨论脉络，不要机械套框。
- 不要大量使用 Obsidian callout；除非非常必要，否则用普通标题、段落和列表。

【必须包含】
1. 角色定位：告诉模型它要扮演什么整理者。
2. 使用场景：说明什么录音适合用这份提示词。
3. 输出结构：给出稳定但不过度僵硬的 Markdown 结构。
4. 信息取舍：说明如何处理事实、判断、行动项、风险、引用和不确定内容；行动项必须要求输出为 \`- [ ]\` todo 任务。
5. 反幻觉要求：没有出现在转写里的内容不得编造；必要时标注不确定。
6. 语言要求：如果出现多语种内容，按用户偏好翻译或保留关键原词。
7. 最后一段必须包含原始转写占位符。

【最后一段必须原样保留】

原始转写：
{{TRANSCRIPT}}

【输出要求】
- 直接输出完整 Prompt 文本，不要代码块。
- 不要解释你为什么这样写。
- 必须保留 {{TRANSCRIPT}} 占位符。
- 不要输出“模式建议”“你可以切换到某模式”等给终端用户看的提示。`;


const MERGE_PROMPTS = {
  learning: buildPrompt(MODE_BODIES.learning, true, "learning"),
  interview: buildPrompt(MODE_BODIES.interview, true, "interview"),
  meeting: buildPrompt(MODE_BODIES.meeting, true, "meeting"),
  huddle: buildPrompt(MODE_BODIES.huddle, true, "huddle"),
  monologue: buildPrompt(MODE_BODIES.monologue, true, "monologue"),
  recruit: buildPrompt(MODE_BODIES.recruit, true, "recruit"),
};

// 实时大纲：归并到共同上层概念，层级由内容涌现，不强加结构
function buildSourceAwareOutlineInstruction(captureMode) {
  const mode = normalizeAudioInputMode(captureMode || "mic");
  if (mode === "mic") {
    return `【来源标记】
当前只录麦克风。大纲不需要额外标来源。
`;
  }
  if (mode === "virtualCable") {
    return `【来源标记】
当前只录电脑音频。若一级条目明显来自播放的视频、课程、会议远端声音，可在该一级条目前加 \`[电脑音频]\`；不要给二级条目重复标记。
`;
  }
  return `【来源标记 · 谨慎使用】
当前录音同时包含麦克风和电脑音频，但转写文本是混合后的结果。请只在内容特征明显时给一级条目前加来源标记：
- \`[麦克风]\`：用户对着麦克风说的评论、测试、提问、补充说明。
- \`[电脑音频]\`：视频、课程、播客、会议远端或电脑正在播放的内容。
无法判断、两路内容交织或只是泛化主题时，不要标记。不要给二级条目重复标记，也不要为了标记而改写事实。
`;
}

function buildOutlinePrompt(modeLabel, modeKey, transcript, captureMode) {
  // 招聘面试模式：大纲严格按"问题 → 回答 → AI 评价"组织
  if (modeKey === "recruit") {
    return `下面是一段${modeLabel}录音到目前为止的转写。请生成结构化的面试实时大纲。

${buildSourceAwareOutlineInstruction(captureMode)}

【结构 · 严格按问题为单位组织】
对识别到的每个"面试官提问"作为一级节点，下挂候选人回答要点和 AI 评价。

【输出格式】
\`\`\`
- ❓ <问题主题，6-12 字>
  - 💬 <候选人回答的关键点 1>
  - 💬 <候选人回答的关键点 2>
  - 🤖 <AI 简评：质量定调 + 一句话评价>
  - ⛏ <可继续追问的具体方向>
\`\`\`

【AI 评价行的写作要求】
- 必须以 \`🤖 \` 开头（让样式可识别为 AI 评价，与候选人内容做视觉区分）
- 简评要"具体"——不要"回答得不错""逻辑清晰"这种空话
- 必须能给面试官**实际启发**：例如"用了STAR结构但S和T一笔带过""数据来源未追问就接受""避谈失败案例"等

【追问行的要求】
- 必须以 \`⛏ \` 开头
- 追问要"挖到事实层"，不要"能不能再说说"这种泛问
- 例：候选人说"提升了 20%"，追问写成"⛏ 这 20% 的基线值是多少？参与人员只有他一个吗？"

【克制】
- 候选人回答还没出现的问题，不要预生成评价
- 转写不完整就只整理已出现的问答对
- 没听清楚的问答标注"❓ <主题>（转写不清，待复核）"，不要硬猜

【输出】
- 纯 Markdown 列表，每个问题独立成一级节点
- 不要前言、不要总评（综合评价留给最终整合，不在大纲里出现）

转写内容：
${transcript}`;
  }

  // 通用：归并到共同上层概念
  return `下面是一段${modeLabel}录音到目前为止的转写。请提炼大纲。

${buildSourceAwareOutlineInstruction(captureMode)}

【方法 · 归并】
找到讨论中可以归并的"共同上一级概念"。
- 通读全部内容，识别零散的具体观点 / 事实 / 任务（叶子）
- 把可以共用同一个上层概念的叶子聚到一起，写出那个上层概念作为父节点
- 如果多个父节点又共享更大的母题，再向上归并一层
- **层级深度由材料决定，不预设**——
  - 材料同质或简单 → 1 层即可
  - 材料丰富 → 2 层
  - 真正多议题、多分支 → 3 层或更多
- 不要为了凑层级把孤立观点强行嵌套；也不要把本可归类的扁平铺开

【克制】
- 不堆砌符号 / callout / 模板字段
- 不预设"决议 / 行动 / 假设 / 缺口"等维度——只有材料里真有，才出现
- 不复述发言原话，但也别过度抽象成空话；保留能让人回忆起讨论内容的关键词
- 讨论本身可能没那么深刻，那就让大纲也朴素一点

【输出】
- 纯 Markdown 列表，缩进表达层级
- 每条简短，不解释、不前言、不结语
- 转写不完整时只整理已出现的内容

转写内容：
${transcript}`;
}

function pad(n) { return n < 10 ? "0" + n : "" + n; }
function formatElapsed(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
// ============================================================
// 虚拟声卡识别 · 跨平台 audioinput 设备检测
// ============================================================

const VIRTUAL_CABLE_PATTERNS = [
  // Windows
  /CABLE Output/i,             // VB-Cable
  /VB-Audio Virtual Cable/i,
  /Virtual Audio Cable/i,      // 商业版 VAC
  /VoiceMeeter Output/i,       // VoiceMeeter Banana / Potato
  /VoiceMeeter Aux Output/i,
  /VoiceMeeter VAIO[3]? Output/i,
  /立体声混音/i,
  /Stereo Mix/i,
  // macOS
  /^BlackHole/i,               // BlackHole 2ch / 16ch
  /Loopback Audio/i,           // Rogue Amoeba Loopback
  /Soundflower/i,
  /Existential Audio/i,
  // Linux
  /Monitor of /i,              // PulseAudio loopback monitor sources
  /pulse_monitor/i,
];

function isVirtualCableLabel(label) {
  if (!label) return false;
  return VIRTUAL_CABLE_PATTERNS.some((p) => p.test(label));
}

async function enumerateAudioDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return { all: [], mics: [], virtualCables: [], outputs: [], permissionRequired: true };
  }
  // 设备 label 在未授权时为空。先试一次 getUserMedia 拿权限。
  let permissionRequired = false;
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
    probe.getTracks().forEach((t) => t.stop());
  } catch {
    permissionRequired = true;
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const mics = [], virtualCables = [], outputs = [];
  for (const d of devices) {
    if (d.kind === "audioinput") {
      if (isVirtualCableLabel(d.label)) virtualCables.push(d);
      else mics.push(d);
    } else if (d.kind === "audiooutput") {
      outputs.push(d);
    }
  }
  return { all: devices, mics, virtualCables, outputs, permissionRequired };
}

async function pickVirtualCableId() {
  const { virtualCables } = await enumerateAudioDevices();
  return virtualCables.length > 0 ? virtualCables[0].deviceId : null;
}

async function pickRealMicrophoneId(preferredId = "") {
  const { mics } = await enumerateAudioDevices();
  if (preferredId && mics.some((d) => d.deviceId === preferredId)) return preferredId;
  // 优先返回 default；否则第一个非虚拟设备
  const def = mics.find((d) => d.deviceId === "default" || /default/i.test(d.label || ""));
  if (def) return def.deviceId === "default" ? null : def.deviceId; // null = 让浏览器选默认
  return mics[0] ? mics[0].deviceId : "";
}

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus","audio/webm","audio/mp4;codecs=mp4a.40.2","audio/mp4","audio/ogg;codecs=opus"];
  for (const c of candidates) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c;
  return "";
}
function extFromMime(mime) {
  if (!mime) return "webm";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg")) return "mp3";
  return "webm";
}
function sanitizeFilename(s) {
  if (!s) return "";
  return String(s)
    .replace(/["“”‘’`]/g, "")
    .replace(/[\\/:*?"<>|#^\[\]]/g, "")
    .replace(/[｜：？＊＜＞＂＃＾「」『』【】、，。；！]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

function escapeRegExp(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLexVoiceAutoTitleSuffix(stem, settings) {
  const prefixes = Object.values(MODE_META)
    .map(m => sanitizeFilename(m && m.prefix))
    .concat(getCustomPromptModeTemplates(settings || {}).map(t => sanitizeFilename(t.name)))
    .filter(Boolean);
  const unique = Array.from(new Set(prefixes)).sort((a, b) => b.length - a.length);
  if (!unique.length) return String(stem || "").trim();
  const re = new RegExp("\\s*·\\s*(?:" + unique.map(escapeRegExp).join("|") + ")-[^·/\\\\]+$");
  return String(stem || "").replace(re, "").trim();
}

function buildLexVoiceRenamedMarkdownPath(currentPath, mode, titleTag, settings) {
  const norm = obsidian.normalizePath(String(currentPath || ""));
  const slash = norm.lastIndexOf("/");
  const dir = slash >= 0 ? norm.slice(0, slash) : "";
  const name = slash >= 0 ? norm.slice(slash + 1) : norm;
  const stem = stripLexVoiceAutoTitleSuffix(name.replace(/\.md$/i, ""), settings);
  const meta = getModeMeta(settings, mode);
  const modePrefix = sanitizeFilename(meta.prefix || "自定义") || "自定义";
  const tag = sanitizeFilename(titleTag) || "";
  if (!stem || !tag) return "";
  const nextName = `${stem} · ${modePrefix}-${tag}.md`;
  return obsidian.normalizePath(dir ? `${dir}/${nextName}` : nextName);
}
function genId() {
  return "lv-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// 检测同步冲突文件名（坚果云/Dropbox/OneDrive 等）
// 坚果云：xxx (冲突 from device YYYY-MM-DD HH:MM).m4a
// Dropbox：xxx (USERNAME's conflicted copy YYYY-MM-DD).m4a
// OneDrive：xxx-DESKTOP-XYZ.m4a 较难识别，仅匹配显式 conflict 字样
// 通用：包含 (冲突…) (…conflicted…) (conflict…) 字样的文件
function isSyncConflictName(name) {
  if (!name) return false;
  // 全角/半角括号 + 冲突/conflict/conflicted copy 字样
  return /[\(（][^\)）]*?(冲突|conflict|conflicted\s*copy)[^\(（]*[\)）]/i.test(name);
}

const VOCABULARY_SECTIONS = [
  { key: "people", title: "人名", desc: "客户、同事、候选人、专家、讲师等人名或常用称呼。", placeholder: "例如：某负责人、某专家、某候选人" },
  { key: "brands", title: "品牌/机构", desc: "公司、学校、团队、客户、供应商、社区、品牌名。", placeholder: "例如：OpenAI、阿里云百炼、硅基流动" },
  { key: "projects", title: "项目/产品", desc: "项目代号、产品名、模型名、系统名、插件名。", placeholder: "例如：LexVoice、SenseVoiceSmall、Paraformer" },
  { key: "terms", title: "行业术语", desc: "专业概念、流程、缩写、技术词、业务词。", placeholder: "例如：ASR、履约保证金、灰度发布" },
  { key: "other", title: "其他专有名词", desc: "暂时不好归类但希望 ASR 优先识别准确的词。", placeholder: "例如：会议室名、活动名、内部简称" },
];

function createVocabularyGroups() {
  const groups = {};
  for (const def of VOCABULARY_SECTIONS) groups[def.key] = [];
  return groups;
}

function detectVocabularySectionKey(text) {
  const title = String(text || "")
    .replace(/^#+\s*/, "")
    .replace(/^[\d一二三四五六七八九十]+[\.、\s]*/, "")
    .trim();
  if (!title) return "";
  if (/编辑规则|说明|使用方式|元信息|metadata/i.test(title)) return "__ignore";
  if (/人名|人物|称呼|联系人|讲师|专家|候选人/.test(title)) return "people";
  if (/品牌|机构|公司|组织|团队|客户|供应商|学校|社区/.test(title)) return "brands";
  if (/项目|产品|模型|系统|服务|应用|插件/.test(title)) return "projects";
  if (/行业术语|术语|专业词|业务词|缩写|英文|概念|流程/.test(title)) return "terms";
  if (/其他|专有名词|专名|未分类/.test(title)) return "other";
  return "";
}

function normalizeVocabularyTerm(line) {
  let text = String(line || "").trim();
  if (!text) return "";
  if (text.startsWith("<!--") || text.startsWith("//") || text.startsWith(">")) return "";
  if (text === "---" || /^\|?\s*-{3,}/.test(text)) return "";
  text = text.replace(/^[-*+]\s+/, "").replace(/^\d+[\.)、]\s+/, "").replace(/^- \[[ x]\]\s+/i, "");
  text = text.replace(/^\*\*(.*?)\*\*$/, "$1").replace(/^__(.*?)__$/, "$1");
  text = text.replace(/^[`"'「『]+/, "").replace(/[`"'」』]+$/, "").trim();
  const noteMatch = text.match(/^([^:：|｜]+)\s*[:：|｜]\s*.+$/);
  if (noteMatch) text = noteMatch[1].trim();
  if (!text || text.length > 60) return "";
  return text;
}

function addVocabularyTerm(groups, key, term) {
  const target = groups[key] ? key : "other";
  const value = normalizeVocabularyTerm(term);
  if (!value) return;
  if (!groups[target].includes(value)) groups[target].push(value);
}

function parseVocabularyGroups(text) {
  const groups = createVocabularyGroups();
  if (!text) return groups;
  const lines = String(text).split(/\r?\n/);
  let current = "other";
  let hasKnownSection = false;
  for (let raw of lines) {
    const line = String(raw || "").trim();
    if (!line) continue;
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const key = detectVocabularySectionKey(heading[2]);
      if (key === "__ignore") { current = null; continue; }
      if (key) { current = key; hasKnownSection = true; continue; }
      current = null;
      continue;
    }
    if (line === "---") {
      if (!hasKnownSection) current = "other";
      continue;
    }
    const term = normalizeVocabularyTerm(line);
    if (!term) continue;
    const key = current || (!hasKnownSection ? "other" : null);
    if (!key) continue;
    addVocabularyTerm(groups, key, term);
  }
  return groups;
}

function flattenVocabularyGroups(groups) {
  const out = [];
  for (const def of VOCABULARY_SECTIONS) {
    for (const term of (groups && groups[def.key]) || []) {
      if (term && !out.includes(term)) out.push(term);
    }
  }
  return out;
}

function countVocabularyGroups(groups) {
  return flattenVocabularyGroups(groups).length;
}

function summarizeVocabularyGroups(groups) {
  return VOCABULARY_SECTIONS
    .map(def => `${def.title} ${((groups && groups[def.key]) || []).length}`)
    .join(" / ");
}

function normalizeVocabularyInput(input) {
  if (Array.isArray(input)) {
    const groups = createVocabularyGroups();
    for (const term of input) addVocabularyTerm(groups, "other", term);
    return groups;
  }
  if (input && typeof input === "object") {
    const groups = createVocabularyGroups();
    for (const def of VOCABULARY_SECTIONS) {
      const list = Array.isArray(input[def.key]) ? input[def.key] : [];
      for (const term of list) addVocabularyTerm(groups, def.key, term);
    }
    return groups;
  }
  return parseVocabularyGroups(String(input || ""));
}

function mergeVocabularyGroups(base, extra) {
  const groups = normalizeVocabularyInput(base);
  const more = normalizeVocabularyInput(extra);
  for (const def of VOCABULARY_SECTIONS) {
    for (const term of more[def.key] || []) addVocabularyTerm(groups, def.key, term);
  }
  return groups;
}

function isStructuredVocabularyMarkdown(text) {
  const source = String(text || "");
  return VOCABULARY_SECTIONS.some(def => source.includes("## " + def.title));
}

function parseVocabTerms(text) {
  return flattenVocabularyGroups(parseVocabularyGroups(text));
}

async function loadVocabularyGroups(plugin) {
  const path = plugin.settings.vocabularyFile;
  if (path) {
    const norm = obsidian.normalizePath(path);
    const file = plugin.app.vault.getAbstractFileByPath(norm);
    if (file instanceof obsidian.TFile) {
      try {
        const content = await plugin.app.vault.cachedRead(file);
        const groups = parseVocabularyGroups(content);
        if (countVocabularyGroups(groups)) return groups;
      } catch (e) { console.error("[LexVoice] read vocabulary file failed", e); }
    }
  }
  return parseVocabularyGroups(plugin.settings.customVocabulary || "");
}

async function loadVocabularyTerms(plugin) {
  return flattenVocabularyGroups(await loadVocabularyGroups(plugin));
}

async function loadVocabularyPrompt(plugin) {
  const groups = await loadVocabularyGroups(plugin);
  const parts = [];
  for (const def of VOCABULARY_SECTIONS) {
    const terms = groups[def.key] || [];
    if (terms.length) parts.push(`${def.title}：${terms.join("、")}`);
  }
  return parts.join("；").slice(0, 800);
}

function formatVocabularyMarkdown(input, profile) {
  const groups = normalizeVocabularyInput(input);
  const moment = window.moment;
  const total = countVocabularyGroups(groups);
  const lines = [
    "# LexVoice 领域词汇表",
    "",
    "> 此文件由 LexVoice 维护，**自动注入到每次 ASR 转写调用**作为 prompt 上下文，提升对人名、品牌、项目名和行业术语的识别精度。",
    "",
    `- 行业 / 角色：${(profile && profile.industry) || "（未设置）"}`,
    `- 词汇数：${total}`,
    `- 更新时间：${moment().format("YYYY-MM-DD HH:mm:ss")}`,
    "",
    "## 编辑规则",
    "- 按分区管理；每行一个词。",
    "- 可以手动新增、删除或把词条移动到更准确的分区。",
    "- 以 `#` `>` `<!--` `//` 开头的行会被忽略。",
    "- 列表标记 `- *` `1.` 会被自动剥离。",
    "- LexVoice 会读取所有分区，并带着分区名发送给 ASR 转写服务。",
    "",
    "---",
    "",
  ];
  for (const def of VOCABULARY_SECTIONS) {
    lines.push(`## ${def.title}`, "", `> ${def.desc}`, "");
    const terms = groups[def.key] || [];
    if (terms.length) {
      for (const t of terms) lines.push(`- ${t}`);
    } else {
      lines.push(`<!-- ${def.placeholder} -->`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

const MODE_PREFIX_TO_KEY = {
  // 旧 prefix
  "访谈": "interview",
  "会议": "meeting",
  "小会": "huddle",
  "手记": "monologue",
  "学习": "learning",
  "面试": "recruit",
  "讨论": "huddle",
  // 新 prefix
  "工作纪要": "meeting",
  "访谈调研": "interview",
  "个人笔记": "monologue",
  "学习记录": "learning",
  "招聘评估": "recruit",
  "圆桌讨论": "huddle",
};

function getRecentNotes(plugin, limit) {
  const norm = obsidian.normalizePath(plugin.settings.mdFolder);
  const folder = plugin.app.vault.getAbstractFileByPath(norm);
  if (!(folder instanceof obsidian.TFolder)) return [];
  const moment = window.moment;
  const items = [];
  for (const f of folder.children) {
    if (!(f instanceof obsidian.TFile) || f.extension !== "md") continue;
    const m = f.basename.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{4}))?/);
    if (!m) continue;
    const stamp = m[2] ? `${m[1]} ${m[2]}` : m[1];
    const t = moment(stamp, m[2] ? "YYYY-MM-DD HHmm" : "YYYY-MM-DD", true);
    if (!t.isValid()) continue;
    let mode = "off";
    const tagMatch = f.basename.match(/·\s*(访谈|会议|小会|手记)/);
    if (tagMatch) mode = MODE_PREFIX_TO_KEY[tagMatch[1]] || "off";
    items.push({
      file: f,
      timestamp: t.valueOf(),
      mode,
      displayTime: t.format(m[2] ? "MM-DD HH:mm" : "MM-DD"),
    });
  }
  items.sort((a, b) => b.timestamp - a.timestamp);
  return items.slice(0, limit || 5);
}

function getAudioDurationMs(blob) {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      const cleanup = () => { try { URL.revokeObjectURL(url); } catch {} };
      audio.addEventListener("loadedmetadata", () => {
        const d = audio.duration;
        cleanup();
        resolve(isFinite(d) && d > 0 ? Math.round(d * 1000) : 0);
      });
      audio.addEventListener("error", () => { cleanup(); resolve(0); });
      audio.src = url;
    } catch { resolve(0); }
  });
}

const AUDIO_EXT = new Set(["webm", "mp3", "m4a", "wav", "ogg", "flac", "mp4", "mpeg", "mpga", "oga"]);
function mimeFromExt(ext) {
  const e = (ext || "").toLowerCase();
  if (e === "m4a" || e === "mp4") return "audio/mp4";
  if (e === "mp3" || e === "mpga" || e === "mpeg") return "audio/mpeg";
  if (e === "wav") return "audio/wav";
  if (e === "ogg" || e === "oga") return "audio/ogg";
  if (e === "flac") return "audio/flac";
  if (e === "webm") return "audio/webm";
  return "audio/" + e;
}

// ============================================================
// DashScope Paraformer Realtime 流式客户端（WebSocket）
// 协议：wss://dashscope.aliyuncs.com/api-ws/v1/inference
// 鉴权：Authorization: bearer <api_key> —— 在 Electron 渲染进程通过
//   require("ws") 走 Node 端 WebSocket 以支持自定义 header（浏览器原生 WebSocket 不支持）
// ============================================================
class DashScopeStreamingClient {
  constructor(opts) {
    this.endpoint = opts.endpoint || "wss://dashscope.aliyuncs.com/api-ws/v1/inference";
    this.apiKey = opts.apiKey;
    this.model = opts.model || "paraformer-realtime-v2";
    this.sampleRate = opts.sampleRate || 16000;
    this.onPartial = opts.onPartial || (() => {});
    this.onError = opts.onError || ((e) => console.error("[DashScopeStream]", e));
    this.onClosed = opts.onClosed || (() => {});
    this.taskId = "lvtask-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    this.ws = null;
    this.started = false;
    this.finishing = false;
    this.closed = false;
    this._finalizedText = "";
    this._currentPartial = "";
  }
  async connect() {
    if (!this.apiKey) throw new Error("DashScope API Key 未配置");
    let WSCtor = null;
    try {
      const wsModule = require("ws");
      WSCtor = wsModule && (wsModule.WebSocket || wsModule.default || wsModule);
    } catch {}
    if (!WSCtor) WSCtor = window.WebSocket;
    return new Promise((resolve, reject) => {
      let resolved = false;
      try {
        this.ws = new WSCtor(this.endpoint, {
          headers: { Authorization: "bearer " + this.apiKey, "X-DashScope-DataInspection": "enable" },
          handshakeTimeout: 8000,
        });
      } catch (e) { reject(e); return; }
      try { this.ws.binaryType = "arraybuffer"; } catch {}

      const onOpen = () => {
        const runTask = {
          header: { action: "run-task", task_id: this.taskId, streaming: "duplex" },
          payload: {
            task_group: "audio", task: "asr", function: "recognition",
            model: this.model,
            parameters: {
              format: "pcm", sample_rate: this.sampleRate,
              disfluency_removal_enabled: false,
              language_hints: ["zh", "en"],
            },
            input: {},
          },
        };
        try { this.ws.send(JSON.stringify(runTask)); }
        catch (e) { if (!resolved) { resolved = true; reject(e); } }
      };
      const onMessage = (data) => {
        const text = (typeof data === "string") ? data
          : (data && data.toString ? data.toString("utf8") : "");
        if (!text || text[0] !== "{") return;
        let msg;
        try { msg = JSON.parse(text); } catch { return; }
        const ev = msg.header && msg.header.event;
        if (ev === "task-started") {
          this.started = true;
          if (!resolved) { resolved = true; resolve(); }
        } else if (ev === "result-generated") {
          this._handleResult(msg.payload);
        } else if (ev === "task-finished") {
          this._safeClose();
        } else if (ev === "task-failed") {
          const err = (msg.header && (msg.header.error_message || msg.header.error_code)) || JSON.stringify(msg);
          this.onError(new Error("DashScope task-failed: " + err));
          if (!resolved) { resolved = true; reject(new Error(err)); }
          this._safeClose();
        }
      };
      const onError = (e) => {
        const err = e instanceof Error ? e : new Error("WebSocket 错误：" + (e && e.message || "未知"));
        this.onError(err);
        if (!resolved) { resolved = true; reject(err); }
      };
      const onClose = () => {
        this.closed = true;
        this.onClosed({ finalText: this.getFullText() });
      };
      if (typeof this.ws.on === "function") {
        this.ws.on("open", onOpen);
        this.ws.on("message", onMessage);
        this.ws.on("error", onError);
        this.ws.on("close", onClose);
      } else {
        this.ws.onopen = onOpen;
        this.ws.onmessage = (ev) => onMessage(ev.data);
        this.ws.onerror = onError;
        this.ws.onclose = onClose;
      }
    });
  }
  _handleResult(payload) {
    if (!payload) return;
    const sentence = (payload.output || {}).sentence;
    if (!sentence) return;
    const text = String(sentence.text || "");
    const isEnd = sentence.sentence_end === true || sentence.end_time != null;
    if (isEnd) {
      this._finalizedText += text;
      this._currentPartial = "";
      this.onPartial(this.getFullText(), true);
    } else {
      this._currentPartial = text;
      this.onPartial(this.getFullText(), false);
    }
  }
  getFullText() {
    return (this._finalizedText + this._currentPartial).trim();
  }
  sendAudioFrame(arrayBuffer) {
    if (!this.ws || !this.started) return;
    const state = (this.ws.readyState != null) ? this.ws.readyState : 1;
    if (state !== 1) return;
    try { this.ws.send(arrayBuffer); } catch (e) { console.warn("[DashScopeStream] send failed", e); }
  }
  async finish() {
    if (this.finishing || this.closed) return;
    this.finishing = true;
    try {
      if (this.ws && (this.ws.readyState == null || this.ws.readyState === 1)) {
        this.ws.send(JSON.stringify({
          header: { action: "finish-task", task_id: this.taskId, streaming: "duplex" },
          payload: { input: {} },
        }));
      }
    } catch {}
    return new Promise((resolve) => {
      const t = setTimeout(() => { this._safeClose(); resolve(); }, 5000);
      const orig = this.onClosed;
      this.onClosed = (info) => { clearTimeout(t); orig(info); resolve(); };
    });
  }
  _safeClose() {
    try { if (this.ws) this.ws.close(); } catch {}
  }
}

function lexvoiceArrayBufferToBase64(ab) {
  try {
    if (typeof Buffer !== "undefined" && Buffer.from) {
      return Buffer.from(ab).toString("base64");
    }
  } catch {}
  const bytes = new Uint8Array(ab);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// ============================================================
// OpenAI Realtime · gpt-realtime-whisper（流式 ASR）
// 端点：wss://api.openai.com/v1/realtime
// 协议：session.update 设 session.type="transcription" → input_audio_buffer.append（base64 PCM 24kHz）
//       → conversation.item.input_audio_transcription.delta / .completed
// ============================================================
class OpenAIRealtimeTranscriptionClient {
  constructor(opts) {
    this.endpoint = opts.endpoint || "wss://api.openai.com/v1/realtime";
    this.apiKey = opts.apiKey;
    this.model = opts.model || "gpt-realtime-whisper";
    this.language = opts.language || "";
    this.sampleRate = 24000;
    this.onPartial = opts.onPartial || (() => {});
    this.onError = opts.onError || ((e) => console.error("[OpenAIRealtime]", e));
    this.onClosed = opts.onClosed || (() => {});
    this.ws = null;
    this.opened = false;
    this.finishing = false;
    this.closed = false;
    this._finalizedText = "";
    this._partialByItem = new Map();
  }
  async connect() {
    if (!this.apiKey) throw new Error("OpenAI API Key 未配置");
    let WSCtor = null;
    try {
      const wsModule = require("ws");
      WSCtor = wsModule && (wsModule.WebSocket || wsModule.default || wsModule);
    } catch {}
    if (!WSCtor) WSCtor = window.WebSocket;
    return new Promise((resolve, reject) => {
      let resolved = false;
      try {
        this.ws = new WSCtor(this.endpoint, {
          headers: {
            Authorization: "Bearer " + this.apiKey,
            "OpenAI-Beta": "realtime=v1",
          },
          handshakeTimeout: 10000,
        });
      } catch (e) { reject(e); return; }
      try { this.ws.binaryType = "arraybuffer"; } catch {}

      const sendUpdate = () => {
        const sessionUpdate = {
          type: "session.update",
          session: {
            type: "transcription",
            audio: {
              input: {
                format: { type: "audio/pcm", rate: this.sampleRate },
                transcription: Object.assign(
                  { model: this.model },
                  this.language ? { language: this.language } : {}
                ),
                turn_detection: { type: "server_vad", threshold: 0.5, silence_duration_ms: 500 },
              },
            },
          },
        };
        try { this.ws.send(JSON.stringify(sessionUpdate)); }
        catch (e) { if (!resolved) { resolved = true; reject(e); } }
      };
      const onOpen = () => {
        this.opened = true;
        sendUpdate();
        if (!resolved) { resolved = true; resolve(); }
      };
      const onMessage = (data) => {
        const text = (typeof data === "string") ? data
          : (data && data.toString ? data.toString("utf8") : "");
        if (!text || text[0] !== "{") return;
        let msg;
        try { msg = JSON.parse(text); } catch { return; }
        const t = msg.type;
        if (t === "conversation.item.input_audio_transcription.delta") {
          const id = msg.item_id || "";
          const cur = this._partialByItem.get(id) || "";
          this._partialByItem.set(id, cur + (msg.delta || ""));
          this.onPartial(this.getFullText(), false);
        } else if (t === "conversation.item.input_audio_transcription.completed") {
          const id = msg.item_id || "";
          const final = (msg.transcript != null ? msg.transcript : this._partialByItem.get(id) || "").trim();
          this._partialByItem.delete(id);
          if (final) this._finalizedText += (this._finalizedText ? "\n" : "") + final;
          this.onPartial(this.getFullText(), true);
        } else if (t === "error") {
          const errMsg = (msg.error && (msg.error.message || msg.error.code)) || JSON.stringify(msg);
          this.onError(new Error("OpenAI Realtime 错误：" + errMsg));
        }
      };
      const onError = (e) => {
        const err = e instanceof Error ? e : new Error("WebSocket 错误：" + (e && e.message || "未知"));
        this.onError(err);
        if (!resolved) { resolved = true; reject(err); }
      };
      const onClose = () => {
        this.closed = true;
        this.onClosed({ finalText: this.getFullText() });
      };
      if (typeof this.ws.on === "function") {
        this.ws.on("open", onOpen);
        this.ws.on("message", onMessage);
        this.ws.on("error", onError);
        this.ws.on("close", onClose);
      } else {
        this.ws.onopen = onOpen;
        this.ws.onmessage = (ev) => onMessage(ev.data);
        this.ws.onerror = onError;
        this.ws.onclose = onClose;
      }
    });
  }
  getFullText() {
    let partial = "";
    for (const v of this._partialByItem.values()) partial += v;
    const sep = (this._finalizedText && partial) ? "\n" : "";
    return (this._finalizedText + sep + partial).trim();
  }
  sendAudioFrame(arrayBuffer) {
    if (!this.ws || !this.opened) return;
    const state = (this.ws.readyState != null) ? this.ws.readyState : 1;
    if (state !== 1) return;
    try {
      const b64 = lexvoiceArrayBufferToBase64(arrayBuffer);
      this.ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
    } catch (e) { console.warn("[OpenAIRealtime] send failed", e); }
  }
  async finish() {
    if (this.finishing || this.closed) return;
    this.finishing = true;
    try {
      if (this.ws && (this.ws.readyState == null || this.ws.readyState === 1)) {
        this.ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      }
    } catch {}
    return new Promise((resolve) => {
      const t = setTimeout(() => { this._safeClose(); resolve(); }, 5000);
      const orig = this.onClosed;
      this.onClosed = (info) => { clearTimeout(t); orig(info); resolve(); };
    });
  }
  _safeClose() { try { if (this.ws) this.ws.close(); } catch {} }
}

// ============================================================
// OpenAI Realtime · gpt-realtime-translate（流式语音翻译，仅取文字）
// 端点：wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate
// 协议：session.update 设 session.audio.output.language="zh"
//       session.input_audio_buffer.append（base64 PCM 24kHz）
//       → session.input_transcript.delta / .completed（原文）
//       → session.output_transcript.delta / .completed（译文）
//       output_audio.delta 直接丢弃
// ============================================================
class OpenAIRealtimeTranslationClient {
  constructor(opts) {
    this.endpointBase = opts.endpoint || "wss://api.openai.com/v1/realtime/translations";
    this.apiKey = opts.apiKey;
    this.model = opts.model || "gpt-realtime-translate";
    this.targetLanguage = opts.targetLanguage || opts.language || "zh";
    this.sampleRate = 24000;
    this.onPartial = opts.onPartial || (() => {});
    this.onError = opts.onError || ((e) => console.error("[OpenAITranslate]", e));
    this.onClosed = opts.onClosed || (() => {});
    this.ws = null;
    this.opened = false;
    this.finishing = false;
    this.closed = false;
    this._sourceText = "";
    this._translatedText = "";
    this._sourcePartial = "";
    this._translatedPartial = "";
  }
  async connect() {
    if (!this.apiKey) throw new Error("OpenAI API Key 未配置");
    let WSCtor = null;
    try {
      const wsModule = require("ws");
      WSCtor = wsModule && (wsModule.WebSocket || wsModule.default || wsModule);
    } catch {}
    if (!WSCtor) WSCtor = window.WebSocket;
    const sep = this.endpointBase.indexOf("?") >= 0 ? "&" : "?";
    const url = this.endpointBase + sep + "model=" + encodeURIComponent(this.model);
    return new Promise((resolve, reject) => {
      let resolved = false;
      try {
        this.ws = new WSCtor(url, {
          headers: {
            Authorization: "Bearer " + this.apiKey,
            "OpenAI-Beta": "realtime=v1",
          },
          handshakeTimeout: 10000,
        });
      } catch (e) { reject(e); return; }
      try { this.ws.binaryType = "arraybuffer"; } catch {}

      const sendUpdate = () => {
        const sessionUpdate = {
          type: "session.update",
          session: { audio: { output: { language: this.targetLanguage } } },
        };
        try { this.ws.send(JSON.stringify(sessionUpdate)); }
        catch (e) { if (!resolved) { resolved = true; reject(e); } }
      };
      const onOpen = () => {
        this.opened = true;
        sendUpdate();
        if (!resolved) { resolved = true; resolve(); }
      };
      const onMessage = (data) => {
        const text = (typeof data === "string") ? data
          : (data && data.toString ? data.toString("utf8") : "");
        if (!text || text[0] !== "{") return;
        let msg;
        try { msg = JSON.parse(text); } catch { return; }
        const t = msg.type;
        if (t === "session.input_transcript.delta") {
          this._sourcePartial += (msg.delta || "");
          this.onPartial(this.getFullText(), false);
        } else if (t === "session.input_transcript.completed" || t === "session.input_transcript.done") {
          const final = String(msg.transcript != null ? msg.transcript : this._sourcePartial).trim();
          if (final) this._sourceText += (this._sourceText ? "\n" : "") + final;
          this._sourcePartial = "";
          this.onPartial(this.getFullText(), true);
        } else if (t === "session.output_transcript.delta") {
          this._translatedPartial += (msg.delta || "");
          this.onPartial(this.getFullText(), false);
        } else if (t === "session.output_transcript.completed" || t === "session.output_transcript.done") {
          const final = String(msg.transcript != null ? msg.transcript : this._translatedPartial).trim();
          if (final) this._translatedText += (this._translatedText ? "\n" : "") + final;
          this._translatedPartial = "";
          this.onPartial(this.getFullText(), true);
        } else if (t === "session.output_audio.delta" || t === "session.output_audio.done") {
          // 丢弃合成语音
        } else if (t === "error") {
          const errMsg = (msg.error && (msg.error.message || msg.error.code)) || JSON.stringify(msg);
          this.onError(new Error("OpenAI Realtime 翻译错误：" + errMsg));
        }
      };
      const onError = (e) => {
        const err = e instanceof Error ? e : new Error("WebSocket 错误：" + (e && e.message || "未知"));
        this.onError(err);
        if (!resolved) { resolved = true; reject(err); }
      };
      const onClose = () => {
        this.closed = true;
        this.onClosed({
          finalText: this.getFullText(),
          sourceText: this.getSourceText(),
          translatedText: this.getTranslatedText(),
        });
      };
      if (typeof this.ws.on === "function") {
        this.ws.on("open", onOpen);
        this.ws.on("message", onMessage);
        this.ws.on("error", onError);
        this.ws.on("close", onClose);
      } else {
        this.ws.onopen = onOpen;
        this.ws.onmessage = (ev) => onMessage(ev.data);
        this.ws.onerror = onError;
        this.ws.onclose = onClose;
      }
    });
  }
  getSourceText() {
    const sep = (this._sourceText && this._sourcePartial) ? "\n" : "";
    return (this._sourceText + sep + this._sourcePartial).trim();
  }
  getTranslatedText() {
    const sep = (this._translatedText && this._translatedPartial) ? "\n" : "";
    return (this._translatedText + sep + this._translatedPartial).trim();
  }
  getFullText() {
    const src = this.getSourceText();
    const tgt = this.getTranslatedText();
    if (!src && !tgt) return "";
    if (!src) return tgt;
    if (!tgt) return src;
    return `**译文（${this.targetLanguage}）**\n\n${tgt}\n\n**原文**\n\n${src}`;
  }
  sendAudioFrame(arrayBuffer) {
    if (!this.ws || !this.opened) return;
    const state = (this.ws.readyState != null) ? this.ws.readyState : 1;
    if (state !== 1) return;
    try {
      const b64 = lexvoiceArrayBufferToBase64(arrayBuffer);
      this.ws.send(JSON.stringify({ type: "session.input_audio_buffer.append", audio: b64 }));
    } catch (e) { console.warn("[OpenAITranslate] send failed", e); }
  }
  async finish() {
    if (this.finishing || this.closed) return;
    this.finishing = true;
    return new Promise((resolve) => {
      const t = setTimeout(() => { this._safeClose(); resolve(); }, 5000);
      const orig = this.onClosed;
      this.onClosed = (info) => { clearTimeout(t); orig(info); resolve(); };
    });
  }
  _safeClose() { try { if (this.ws) this.ws.close(); } catch {} }
}

// ============================================================
// 流式转写客户端工厂：根据 profile.streamProtocol 返回对应实现
// 所有客户端遵守相同接口：connect / sendAudioFrame / finish / getFullText
// 回调：onPartial(text, isFinal) / onError(err) / onClosed(info)
// ============================================================
function createStreamingTranscriptionClient(profile, provider, callbacks) {
  const opts = Object.assign({}, callbacks || {}, {
    endpoint: provider.endpoint,
    apiKey: provider.apiKey,
    model: provider.model,
    language: provider.language,
    targetLanguage: provider.targetLanguage,
  });
  switch (profile.streamProtocol) {
    case "openai-realtime-transcription":
      return new OpenAIRealtimeTranscriptionClient(opts);
    case "openai-realtime-translation":
      return new OpenAIRealtimeTranslationClient(opts);
    case "dashscope-ws":
    default:
      return new DashScopeStreamingClient(opts);
  }
}

// ============================================================
// PCM 实时编码器：MediaStream → PCM 16-bit mono 帧（默认 16kHz，可设 24kHz）
// 用 ScriptProcessorNode（已废弃但 Electron 下兼容性最好）
// ============================================================
class PcmStreamEncoder {
  constructor(stream, opts) {
    this.stream = stream;
    this.targetSampleRate = (opts && opts.sampleRate) || 16000;
    this.onFrame = (opts && opts.onFrame) || (() => {});
    this.audioContext = null;
    this.source = null;
    this.processor = null;
    this._sourceSampleRate = 0;
  }
  start() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new Ctx();
    this._sourceSampleRate = this.audioContext.sampleRate;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const down = this._downsample(input, this._sourceSampleRate, this.targetSampleRate);
      const pcm16 = this._floatTo16BitPCM(down);
      this.onFrame(pcm16.buffer);
    };
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }
  _downsample(buffer, sourceRate, targetRate) {
    if (sourceRate === targetRate) return buffer;
    const ratio = sourceRate / targetRate;
    const newLen = Math.floor(buffer.length / ratio);
    const out = new Float32Array(newLen);
    let outIdx = 0; let inIdx = 0;
    while (outIdx < newLen) {
      const nextInIdx = Math.floor((outIdx + 1) * ratio);
      let acc = 0; let count = 0;
      for (let i = inIdx; i < nextInIdx && i < buffer.length; i++) { acc += buffer[i]; count++; }
      out[outIdx] = count > 0 ? acc / count : 0;
      outIdx++;
      inIdx = nextInIdx;
    }
    return out;
  }
  _floatTo16BitPCM(float32) {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  }
  stop() {
    try { if (this.processor) this.processor.disconnect(); } catch {}
    try { if (this.source) this.source.disconnect(); } catch {}
    try { if (this.audioContext) this.audioContext.close(); } catch {}
    this.processor = null;
    this.source = null;
    this.audioContext = null;
  }
}

class RecorderService {
  constructor(plugin) {
    this.plugin = plugin;
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.mime = "";
    this.sessionStartedAt = 0;
    this.segmentStartOffsetMs = 0;
    this.pausedFor = 0;
    this.pausedAt = 0;
    this.state = "idle";
    this.segmentIndex = 0;
    this.segmentDurationMs = 0;
    this.nextCutAtElapsed = Infinity;
    this.cutting = false;
    this.onSegment = null;
    this.listeners = new Set();
    this.ticker = null;
    this.levelMeters = [];
    this.audioLevel = 0;
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { const info = this.getInfo(); for (const fn of this.listeners) fn(info); }
  getInfo() {
    let elapsed = 0;
    if (this.state === "recording") elapsed = Date.now() - this.sessionStartedAt - this.pausedFor;
    else if (this.state === "paused") elapsed = this.pausedAt - this.sessionStartedAt - this.pausedFor;
    return {
      state: this.state,
      elapsed,
      segmentIndex: this.segmentIndex,
      audioLevel: this.audioLevel || 0,
      sourceLevels: this.getSourceLevels(),
    };
  }
  async start(options) {
    if (this.state !== "idle") return;
    const captureMode = (options && options.captureMode) || "mic";
    this.stream = await this.acquireStream(captureMode);
    this.mime = pickMimeType();
    this.segmentIndex = 0;
    this.segmentStartOffsetMs = 0;
    this.pausedFor = 0;
    this.onSegment = (options && options.onSegment) || null;
    this.segmentDurationMs = (options && options.segmentDurationMs) || 0;
    this.nextCutAtElapsed = this.segmentDurationMs > 0 ? this.segmentDurationMs : Infinity;
    this.cutting = false;
    this.sessionStartedAt = Date.now();
    this.state = "recording";
    this.startLevelMeter(this.stream);
    this.startNewRecorder();
    if (options && typeof options.onStreamReady === "function") {
      try { await options.onStreamReady(this.stream); }
      catch (e) { console.error("[LexVoice] onStreamReady failed", e); }
    }
    this.ticker = window.setInterval(() => this.tick(), 160);
    this.emit();
  }
  getStreamLabel(stream, fallback) {
    const track = stream && stream.getAudioTracks ? stream.getAudioTracks()[0] : null;
    return (track && track.label) || fallback;
  }
  createLevelMeter(kind, icon, label, stream) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx || !stream) return null;
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.56;
    source.connect(analyser);
    if (ctx.state === "suspended" && ctx.resume) ctx.resume().catch(() => {});
    return {
      kind,
      icon,
      label,
      context: ctx,
      source,
      analyser,
      timeData: new Uint8Array(analyser.fftSize),
      freqData: new Uint8Array(analyser.frequencyBinCount),
      level: 0,
      bars: new Array(12).fill(0),
    };
  }
  startLevelMeter(stream) {
    this.stopLevelMeter();
    try {
      const meters = [];
      if (this.micStreamRef) {
        const label = this.getStreamLabel(this.micStreamRef, "麦克风");
        const meter = this.createLevelMeter("mic", "🎙️", label, this.micStreamRef);
        if (meter) meters.push(meter);
      }
      if (this.virtStreamRef) {
        const label = this.getStreamLabel(this.virtStreamRef, "电脑音频输入");
        const meter = this.createLevelMeter("computer", "💻", label, this.virtStreamRef);
        if (meter) meters.push(meter);
      }
      if (!meters.length && stream) {
        const label = this.getStreamLabel(stream, "输入");
        const meter = this.createLevelMeter("input", "●", label, stream);
        if (meter) meters.push(meter);
      }
      this.levelMeters = meters;
      this.updateAudioLevel();
    } catch (e) {
      console.error("[LexVoice] level meter failed", e);
      this.stopLevelMeter();
    }
  }
  stopLevelMeter() {
    for (const meter of this.levelMeters || []) {
      try { if (meter.source) meter.source.disconnect(); } catch {}
      try { if (meter.analyser) meter.analyser.disconnect(); } catch {}
      try { if (meter.context) meter.context.close(); } catch {}
    }
    this.levelMeters = [];
    this.audioLevel = 0;
  }
  updateAudioLevel() {
    if (!this.levelMeters || !this.levelMeters.length || this.state !== "recording") {
      if (this.state !== "recording") this.audioLevel = 0;
      return this.audioLevel || 0;
    }
    let maxLevel = 0;
    for (const meter of this.levelMeters) {
      try {
        meter.analyser.getByteTimeDomainData(meter.timeData);
        meter.analyser.getByteFrequencyData(meter.freqData);
        let sum = 0;
        for (let i = 0; i < meter.timeData.length; i++) {
          const centered = (meter.timeData[i] - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / meter.timeData.length);
        const normalized = Math.max(0, Math.min(1, rms * 12));
        meter.level = (meter.level * 0.54) + (normalized * 0.46);

        const nextBars = [];
        const usableBins = Math.max(12, Math.min(meter.freqData.length, 180));
        const bandSize = Math.max(1, Math.floor(usableBins / 12));
        for (let b = 0; b < 12; b++) {
          let total = 0;
          let count = 0;
          const start = b * bandSize;
          const end = Math.min(usableBins, start + bandSize);
          for (let i = start; i < end; i++) {
            total += meter.freqData[i] || 0;
            count++;
          }
          const raw = count ? (total / count) / 255 : 0;
          const boosted = Math.max(raw, meter.level * (0.42 + (b % 4) * 0.05));
          const prev = meter.bars[b] || 0;
          nextBars[b] = (prev * 0.58) + (Math.min(1, boosted * 1.7) * 0.42);
        }
        meter.bars = nextBars;
        maxLevel = Math.max(maxLevel, meter.level);
      } catch {
        meter.level = 0;
        meter.bars = new Array(12).fill(0);
      }
    }
    this.audioLevel = maxLevel;
    return this.audioLevel || 0;
  }
  getSourceLevels() {
    const meters = this.levelMeters || [];
    return meters.map((meter) => ({
      kind: meter.kind,
      icon: meter.icon,
      label: meter.label,
      level: meter.level || 0,
      bars: Array.isArray(meter.bars) ? meter.bars.slice(0, 12) : new Array(12).fill(0),
    }));
  }
  startNewRecorder() {
    const opts = this.mime ? { mimeType: this.mime } : undefined;
    this.recorder = new MediaRecorder(this.stream, opts);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) this.chunks.push(e.data); };
    this.recorder.onerror = (e) => { console.error("[LexVoice] recorder error", e); };
    this.recorder.start(1000);
  }
  async acquireStream(mode) {
    mode = normalizeAudioInputMode(mode);
    // 3 种音频输入：
    //   mic                 — 仅麦克风（默认）
    //   virtualCable        — 仅电脑音频（一个被识别为虚拟设备的 audioinput）
    //   mix-virtual         — 麦克风 + 电脑音频（会议/视频推荐）
    const wantMic    = mode === "mic" || mode === "mix-virtual";
    const wantVirt   = mode === "virtualCable" || mode === "mix-virtual";

    let micStream = null, virtStream = null;

    if (wantMic) {
      const realMicId = await pickRealMicrophoneId(this.plugin.settings.selectedMicrophoneDevice || "");
      if (realMicId === "") {
        throw new Error("未检测到真实麦克风。\n\n如果 Windows 默认输入被设为 CABLE Output，LexVoice 不会把它当作麦克风使用。请到 Windows「声音」设置把输入设备改回你的真实麦克风，或在 LexVoice「进阶 → 音频设备检测」中选择优先使用的麦克风。");
      }
      const audioConstraints = realMicId
        ? { deviceId: { exact: realMicId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
      micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    }

    if (wantVirt) {
      const virtId = this.plugin.settings.selectedVirtualDevice
        || await pickVirtualCableId();
      if (!virtId) {
        if (micStream) micStream.getTracks().forEach((t) => t.stop());
        throw new Error("未检测到电脑音频输入（虚拟声卡）。\n\nLexVoice 不能直接监听耳机或扬声器输出，需要先安装并配置：\n• Windows：VB-Cable（vb-audio.com/Cable/）\n• macOS：BlackHole（existential.audio/blackhole/）\n• Linux：PulseAudio/PipeWire monitor source\n\n安装后到 LexVoice 设置打开「音频设备检测」确认。");
      }
      virtStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: virtId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    }

    this.micStreamRef = micStream;
    this.sysStreamRef = null;
    this.virtStreamRef = virtStream;

    const sources = [micStream, virtStream].filter(Boolean);
    if (sources.length > 1) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ctx.createMediaStreamDestination();
      for (const source of sources) ctx.createMediaStreamSource(source).connect(dest);
      this.audioContext = ctx;
      return dest.stream;
    }
    return sources[0] || null;
  }
  releaseStream() {
    try { if (this.audioContext) { this.audioContext.close(); } } catch {}
    this.audioContext = null;
    if (this.micStreamRef) this.micStreamRef.getTracks().forEach((t) => t.stop());
    if (this.sysStreamRef) this.sysStreamRef.getTracks().forEach((t) => t.stop());
    if (this.virtStreamRef) this.virtStreamRef.getTracks().forEach((t) => t.stop());
    this.micStreamRef = null;
    this.sysStreamRef = null;
    this.virtStreamRef = null;
  }
  tick() {
    this.updateAudioLevel();
    this.emit();
    if (this.state !== "recording" || this.cutting) return;
    const elapsed = this.getInfo().elapsed;
    if (elapsed >= this.nextCutAtElapsed) {
      this.cutSegment().catch((e) => console.error("[LexVoice] cutSegment error", e));
    }
  }
  async cutSegment() {
    if (this.cutting || this.state !== "recording") return;
    this.cutting = true;
    const chunksAtCut = this.chunks;
    const mimeAtCut = this.recorder.mimeType || this.mime;
    const endOffset = this.getInfo().elapsed;
    const startOffset = this.segmentStartOffsetMs;
    const index = this.segmentIndex;

    await new Promise((resolve) => {
      const rec = this.recorder;
      rec.onstop = () => resolve();
      try { rec.stop(); } catch { resolve(); }
    });

    const blob = new Blob(chunksAtCut, { type: mimeAtCut });
    this.segmentIndex++;
    this.segmentStartOffsetMs = endOffset;
    this.nextCutAtElapsed = endOffset + this.segmentDurationMs;

    if (this.state !== "idle") this.startNewRecorder();
    this.cutting = false;

    if (this.onSegment) {
      try { await this.onSegment({ blob, index, startOffsetMs: startOffset, endOffsetMs: endOffset, isFinal: false, ext: extFromMime(mimeAtCut) }); }
      catch (e) { console.error("[LexVoice] onSegment error", e); }
    }
    this.emit();
  }
  pause() {
    if (this.state !== "recording") return;
    try { this.recorder.pause(); } catch {}
    this.pausedAt = Date.now();
    this.state = "paused";
    this.emit();
  }
  resume() {
    if (this.state !== "paused") return;
    try { this.recorder.resume(); } catch {}
    this.pausedFor += Date.now() - this.pausedAt;
    this.state = "recording";
    this.emit();
  }
  async stop() {
    if (this.state === "idle") return null;
    const elapsedAtStop = this.getInfo().elapsed;
    const startOffset = this.segmentStartOffsetMs;
    const index = this.segmentIndex;
    const mime = this.recorder ? (this.recorder.mimeType || this.mime) : this.mime;
    const chunksAtStop = this.chunks;

    const finalBlob = await new Promise((resolve) => {
      const rec = this.recorder;
      if (!rec) return resolve(null);
      rec.onstop = () => resolve(new Blob(chunksAtStop, { type: mime }));
      try { rec.stop(); } catch { resolve(null); }
    });

    this.stopLevelMeter();
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.releaseStream();
    this.stream = null; this.recorder = null; this.chunks = [];
    this.state = "idle";
    if (this.ticker) { window.clearInterval(this.ticker); this.ticker = null; }
    this.segmentIndex++;
    this.emit();

    if (this.onSegment && finalBlob) {
      try { await this.onSegment({ blob: finalBlob, index, startOffsetMs: startOffset, endOffsetMs: elapsedAtStop, isFinal: true, ext: extFromMime(mime) }); }
      catch (e) { console.error("[LexVoice] onSegment(final) error", e); }
    }
    return { totalDurationMs: elapsedAtStop, segmentsEmitted: index + 1 };
  }
}

class BubbleWidget {
  constructor(plugin) {
    this.plugin = plugin;
    this.wrapEl = null;
    this.el = null;
    this.drag = null;
    this.hideTimer = null;
    this.ribbonEl = null;
    this.ribbonHandlers = null;
    this.unsubscribe = null;
    this.resizeHandler = null;
  }
  mount(ribbonEl) {
    if (this.wrapEl) return;
    this.ribbonEl = ribbonEl || null;
    const wrapEl = document.body.createDiv({ cls: "lexvoice-bubble-wrap" });
    const el = wrapEl.createDiv({ cls: "lexvoice-bubble is-idle" });
    this.wrapEl = wrapEl;
    this.el = el;
    this._lastSig = "";
    this._renderRaf = 0;
    this.render();
    const pos = this.plugin.settings.floatingBallPos || null;
    if (pos && pos.userSet) {
      wrapEl.style.left = `${Math.max(0, pos.left || 0)}px`;
      wrapEl.style.top = `${Math.max(0, pos.top || 0)}px`;
      this.keepInViewport();
    } else {
      this.placeDefault();
    }
    this.updateDockTail();
    this.show();
    this.resizeHandler = () => {
      if (!this.wrapEl) return;
      if (!(this.plugin.settings.floatingBallPos || {}).userSet) this.placeDefault();
      else this.keepInViewport();
      this.updateDockTail();
    };
    window.addEventListener("resize", this.resizeHandler);
    this.attachHover();
    this.attachDrag();
    this.unsubscribe = this.plugin.recorder.on(() => this.scheduleUpdate());
    this.bindRibbon();
  }
  placeDefault() {
    if (!this.wrapEl) return;
    const rect = this.wrapEl.getBoundingClientRect();
    const width = rect.width || 168;
    const height = rect.height || 40;
    const margin = 18;
    this.wrapEl.style.left = `${Math.max(margin, window.innerWidth - width - margin)}px`;
    this.wrapEl.style.top = `${Math.max(72, window.innerHeight - height - 58)}px`;
  }
  keepInViewport() {
    if (!this.wrapEl) return;
    const rect = this.wrapEl.getBoundingClientRect();
    const width = rect.width || 168;
    const height = rect.height || 40;
    const margin = 8;
    const left = parseFloat(this.wrapEl.style.left) || 0;
    const top = parseFloat(this.wrapEl.style.top) || 0;
    this.wrapEl.style.left = `${Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - width - margin))}px`;
    this.wrapEl.style.top = `${Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - height - margin))}px`;
  }
  updateDockTail() {
    if (!this.wrapEl) return;
    this.wrapEl.removeClass("has-tail");
    this.wrapEl.removeClass("tail-left");
    this.wrapEl.removeClass("tail-right");
    this.wrapEl.removeClass("tail-top");
    this.wrapEl.removeClass("tail-bottom");
    const rect = this.wrapEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const threshold = 54;
    const bottomThreshold = 92;
    const top = rect.top;
    const left = rect.left;
    const right = window.innerWidth - rect.right;
    const bottom = window.innerHeight - rect.bottom;
    let tail = "";
    if (bottom <= bottomThreshold) tail = "bottom";
    else if (top <= threshold) tail = "top";
    else if (left <= threshold) tail = "left";
    else if (right <= threshold) tail = "right";
    if (!tail) return;
    this.wrapEl.addClass("has-tail");
    this.wrapEl.addClass("tail-" + tail);
  }
  unmount() {
    if (this.unsubscribe) { this.unsubscribe(); this.unsubscribe = null; }
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
    if (this._renderRaf) { cancelAnimationFrame(this._renderRaf); this._renderRaf = 0; }
    if (this.resizeHandler) { window.removeEventListener("resize", this.resizeHandler); this.resizeHandler = null; }
    this.unbindRibbon();
    if (this.wrapEl) { this.wrapEl.remove(); this.wrapEl = null; this.el = null; }
  }
  scheduleUpdate() {
    if (this._renderRaf) return;
    this._renderRaf = requestAnimationFrame(() => {
      this._renderRaf = 0;
      const info = this.plugin.recorder.getInfo();
      const queue = this.plugin.queue;
      const hasPromptJob = !!(queue && queue.hasPendingGeneratePrompt && queue.hasPendingGeneratePrompt());
      const sig = `${info.state}|${hasPromptJob ? "P" : ""}`;
      if (sig === this._lastSig) {
        const t = this.el && this.el.querySelector(".lexvoice-bubble-timer");
        if (t) t.setText(formatElapsed(info.elapsed));
      } else {
        this._lastSig = sig;
        this.render();
        this.updateDockTail();
      }
    });
  }
  bindRibbon() {
    if (!this.ribbonEl) return;
    const enter = () => this.show();
    const leave = () => this.scheduleHide();
    this.ribbonEl.addEventListener("mouseenter", enter);
    this.ribbonEl.addEventListener("mouseleave", leave);
    this.ribbonHandlers = { enter, leave };
  }
  unbindRibbon() {
    if (!this.ribbonEl || !this.ribbonHandlers) return;
    this.ribbonEl.removeEventListener("mouseenter", this.ribbonHandlers.enter);
    this.ribbonEl.removeEventListener("mouseleave", this.ribbonHandlers.leave);
    this.ribbonHandlers = null;
  }
  show() {
    if (!this.wrapEl) return;
    this.wrapEl.addClass("is-visible");
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }
  hide() {
    // 停靠式悬浮窗常驻显示；关闭由设置项控制。
    if (!this.wrapEl) return;
    this.show();
  }
  scheduleHide() {
    // 保持常驻，避免脱离侧边栏后找不到录音控制器。
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }
  attachHover() {
    this.wrapEl.addEventListener("mouseenter", () => this.show());
    this.wrapEl.addEventListener("mouseleave", () => this.scheduleHide());
  }
  render() {
    if (!this.el) return;
    const info = this.plugin.recorder.getInfo();
    this.el.empty();
    this.el.removeClass("is-idle"); this.el.removeClass("is-recording"); this.el.removeClass("is-paused");
    if (this.wrapEl) this.wrapEl.removeClass("is-recording-wrap");
    const makeDocButton = (title, handler) => {
      const jumpBtn = this.el.createEl("button", { cls: "lexvoice-bubble-jump", attr: { title, "aria-label": title } });
      try { obsidian.setIcon(jumpBtn, "file-text"); }
      catch { jumpBtn.addClass("is-fallback-icon"); }
      jumpBtn.onclick = (e) => { e.stopPropagation(); handler(); };
      return jumpBtn;
    };
    if (info.state === "idle") {
      this.el.addClass("is-idle");
      makeDocButton("打开最近一篇录音笔记", () => this.plugin.openRecentNote());
      const btn = this.el.createEl("button", { cls: "lexvoice-bubble-main", attr: { title: "开始录音" } });
      btn.createSpan({ cls: "lexvoice-bubble-record-dot" });
      btn.onclick = (e) => { e.stopPropagation(); this.plugin.startRecording(); };
      this.el.createEl("span", { cls: "lexvoice-bubble-label", text: "开始录音" });
      if (this.plugin.queue && this.plugin.queue.hasPendingGeneratePrompt && this.plugin.queue.hasPendingGeneratePrompt()) {
        const chip = this.el.createDiv({ cls: "lexvoice-bubble-chip" });
        chip.setText("优化提示词中");
        chip.setAttr("title", "后台正在生成自定义提示词。完成后会出现在提示词管理和录音模式列表里。");
      }
    } else {
      this.el.addClass(info.state === "paused" ? "is-paused" : "is-recording");
      if (info.state === "recording" && this.wrapEl) this.wrapEl.addClass("is-recording-wrap");
      this.show();
      makeDocButton("跳到当前录音笔记的转写位置", () => this.plugin.openSessionNote());
      const ctrl = this.el.createDiv({ cls: "lexvoice-bubble-ctrl" });
      const pauseBtn = ctrl.createEl("button", { cls: "lexvoice-bubble-btn", attr: { title: info.state === "paused" ? "继续" : "暂停", "aria-label": info.state === "paused" ? "继续" : "暂停" } });
      try { obsidian.setIcon(pauseBtn, info.state === "paused" ? "play" : "pause"); }
      catch { pauseBtn.setText(info.state === "paused" ? "▶" : "‖"); }
      pauseBtn.onclick = (e) => { e.stopPropagation(); info.state === "paused" ? this.plugin.recorder.resume() : this.plugin.recorder.pause(); };
      const stopBtn = ctrl.createEl("button", { cls: "lexvoice-bubble-btn stop", attr: { title: "停止并合并润色", "aria-label": "停止并合并润色" } });
      try { obsidian.setIcon(stopBtn, "square"); }
      catch { stopBtn.setText("■"); }
      stopBtn.onclick = (e) => { e.stopPropagation(); this.plugin.stopRecording(); };
      const timer = this.el.createDiv({ cls: "lexvoice-bubble-timer" });
      timer.setText(formatElapsed(info.elapsed));
    }
  }
  attachDrag() {
    const wrapEl = this.wrapEl;
    wrapEl.addEventListener("pointerdown", (e) => {
      if (e.target instanceof HTMLElement && e.target.tagName === "BUTTON") return;
      this.drag = {
        startX: e.clientX, startY: e.clientY,
        startLeft: parseFloat(wrapEl.style.left) || 60,
        startTop: parseFloat(wrapEl.style.top) || 120,
      };
      try { wrapEl.setPointerCapture(e.pointerId); } catch {}
    });
    wrapEl.addEventListener("pointermove", (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.startX;
      const dy = e.clientY - this.drag.startY;
      wrapEl.style.left = `${Math.max(0, this.drag.startLeft + dx)}px`;
      wrapEl.style.top = `${Math.max(0, this.drag.startTop + dy)}px`;
      this.keepInViewport();
      this.updateDockTail();
    });
    const endDrag = (e) => {
      if (!this.drag) return;
      this.keepInViewport();
      this.updateDockTail();
      this.plugin.settings.floatingBallPos = {
        left: parseFloat(wrapEl.style.left) || 60,
        top: parseFloat(wrapEl.style.top) || 120,
        userSet: true,
      };
      this.plugin.saveSettings();
      this.drag = null;
      try { wrapEl.releasePointerCapture(e.pointerId); } catch {}
    };
    wrapEl.addEventListener("pointerup", endDrag);
    wrapEl.addEventListener("pointercancel", endDrag);
  }
}

// 解析当前激活的转写 provider 配置（带向后兼容：旧版顶层字段兜底）
function resolveTranscribeProvider(plugin) {
  const s = plugin.settings;
  const id = s.activeTranscribeProvider || "siliconflow";
  const provider = (s.transcribeProviders && s.transcribeProviders[id]) || null;
  // 优先用 provider 子对象；否则回退到顶层旧字段
  const endpoint = (provider && provider.endpoint) || s.transcribeEndpoint || "";
  const apiKey   = (provider && provider.apiKey)   || s.transcribeApiKey   || "";
  const model    = (provider && provider.model)    || s.transcribeModel    || "";
  const language = (provider && provider.language !== undefined ? provider.language : s.transcribeLanguage) || "";
  return { id, endpoint, apiKey, model, language, name: provider ? provider.name : "" };
}

async function transcribeAudio(plugin, blob, mime) {
  const p = resolveTranscribeProvider(plugin);
  if (!p.apiKey)   throw new Error(`转写访问密钥未配置（当前服务：${p.name || p.id}）`);
  if (!p.endpoint) throw new Error(`转写服务地址未配置（当前服务：${p.name || p.id}）`);
  if (!p.model)    throw new Error(`转写模型名称未配置（当前服务：${p.name || p.id}）`);
  const form = new FormData();
  const ext = extFromMime(mime);
  form.append("file", blob, `recording.${ext}`);
  form.append("model", p.model);
  if (p.language && p.language !== "auto") form.append("language", p.language);
  form.append("response_format", "json");
  const promptText = await loadVocabularyPrompt(plugin);
  if (promptText) form.append("prompt", promptText);
  const res = await fetch(p.endpoint, {
    method: "POST",
    headers: { "Authorization": `Bearer ${p.apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`转写失败 ${res.status}：${msg.slice(0, 300)}`);
  }
  const data = await res.json().catch(() => ({}));
  return (data.text || data.transcript || data.result || "").trim();
}

function normalizeLlmEndpoint(endpoint) {
  const raw = String(endpoint || "").trim();
  if (!raw) return "";
  const noTrail = raw.replace(/\/+$/, "");
  try {
    const url = new URL(noTrail);
    const path = (url.pathname || "").replace(/\/+$/, "");
    if (/\/chat\/completions$/i.test(path)) return noTrail;
    url.pathname = path + "/chat/completions";
    return url.toString().replace(/\/+$/, "");
  } catch {}
  if (/\/chat\/completions$/i.test(noTrail)) return noTrail;
  return noTrail;
}

function isLocalLlmEndpoint(endpoint) {
  try {
    const url = new URL(normalizeLlmEndpoint(endpoint));
    const host = (url.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function isMoonshotKimiModel(endpoint, model) {
  try {
    const url = new URL(normalizeLlmEndpoint(endpoint));
    const host = (url.hostname || "").toLowerCase();
    return /(^|\.)moonshot\.(cn|ai)$/.test(host) && /^kimi-k2\./i.test(String(model || "").trim());
  } catch {
    return /^kimi-k2\./i.test(String(model || "").trim());
  }
}

function buildLlmHeaders(apiKey, endpoint) {
  const headers = { "Content-Type": "application/json" };
  const key = String(apiKey || "").trim();
  if (key) headers.Authorization = `Bearer ${key}`;
  try {
    const host = new URL(normalizeLlmEndpoint(endpoint)).hostname.toLowerCase();
    if (/(^|\.)openrouter\.ai$/.test(host)) {
      headers["HTTP-Referer"] = "https://github.com/Lynn-x/LexVoice";
      headers["X-OpenRouter-Title"] = "LexVoice";
    }
  } catch {}
  return headers;
}

function extractLlmContent(data) {
  const msg = data && data.choices && data.choices[0] && data.choices[0].message;
  const content = msg && msg.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(part => {
      if (typeof part === "string") return part;
      return (part && (part.text || part.content)) || "";
    }).join("");
  }
  return "";
}

async function readLlmError(res) {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text);
    const detail = json && (json.error && json.error.message || json.message || json.detail);
    if (detail) return String(detail).slice(0, 500);
  } catch {}
  return text.slice(0, 500);
}

async function requestLlmChatCompletion(plugin, messages, options) {
  const { llmEndpoint, llmApiKey, llmModel } = plugin.settings;
  const endpoint = normalizeLlmEndpoint(llmEndpoint);
  if (!endpoint) throw new Error("大模型服务地址未配置");
  if (!llmModel) throw new Error("大模型名称未配置");
  if (!llmApiKey && !isLocalLlmEndpoint(endpoint)) {
    throw new Error("大模型访问密钥未配置；只有本地 localhost 服务可以留空");
  }
  const basePayload = {
    model: llmModel,
    messages,
    stream: false,
    temperature: undefined,
  };
  if (!isMoonshotKimiModel(endpoint, llmModel)) basePayload.temperature = 0.3;
  const payload = Object.assign(basePayload, options && options.payload ? options.payload : {});
  const res = await fetch(endpoint, {
    method: "POST",
    headers: buildLlmHeaders(llmApiKey, endpoint),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await readLlmError(res);
    throw new Error(`LLM 调用失败 ${res.status}：${msg}`);
  }
  return await res.json();
}

async function testLlmConnection(plugin) {
  const data = await requestLlmChatCompletion(plugin, [
    { role: "system", content: "You are a connectivity test endpoint. Reply with OK only." },
    { role: "user", content: "LexVoice connection test. Reply OK." },
  ]);
  return {
    endpoint: normalizeLlmEndpoint(plugin.settings.llmEndpoint),
    model: plugin.settings.llmModel,
    preview: extractLlmContent(data).trim().slice(0, 40),
  };
}

async function callLlm(plugin, system, user) {
  const data = await requestLlmChatCompletion(plugin, [
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  return stripModeSuggestionBlocks(extractLlmContent(data).trim());
}

function stripModeSuggestionBlocks(text) {
  if (!text) return "";
  return String(text)
    .replace(/\n{0,2}> \[!tip\] 模式建议(?:\r?\n>.*)*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseElapsedMsToken(raw) {
  const parts = String(raw || "").trim().split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p))) return 0;
  if (parts.length === 3) return Math.max(0, ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000);
  if (parts.length === 2) return Math.max(0, (parts[0] * 60 + parts[1]) * 1000);
  if (parts.length === 1) return Math.max(0, parts[0] * 1000);
  return 0;
}

function cleanLexVoiceTranscriptBlock(block) {
  return String(block || "")
    .replace(/<!--[^>]*-->/g, "")
    .replace(/<summary>[\s\S]*?<\/summary>/gi, "")
    .replace(/<\/?details>/gi, "")
    .replace(/^###\s+段落\s+\d+[^\n]*$/gm, "")
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/^_\[转写失败[^\n]*$/gm, "")
    .replace(/^_\[此段无内容\]_$/gm, "")
    .replace(/^\s*---\s*$/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLexVoiceTranscriptSections(markdown) {
  const text = String(markdown || "");
  const sections = [];
  let searchFrom = 0;
  while (true) {
    const labelIdx = text.indexOf("分段原始转写", searchFrom);
    if (labelIdx < 0) break;
    const summaryEnd = text.indexOf("</summary>", labelIdx);
    const detailsEnd = summaryEnd >= 0 ? text.indexOf("</details>", summaryEnd) : -1;
    if (summaryEnd >= 0 && detailsEnd > summaryEnd) {
      sections.push(text.slice(summaryEnd + "</summary>".length, detailsEnd));
      searchFrom = detailsEnd + "</details>".length;
    } else {
      searchFrom = labelIdx + 1;
    }
  }

  const startRe = /<!--\s*lexvoice-segments-start(?::[^>]*)?\s*-->/g;
  let startMatch;
  while ((startMatch = startRe.exec(text))) {
    const endRe = /<!--\s*lexvoice-segments-end(?::[^>]*)?\s*-->/g;
    endRe.lastIndex = startRe.lastIndex;
    const endMatch = endRe.exec(text);
    if (endMatch) sections.push(text.slice(startRe.lastIndex, endMatch.index));
  }

  if (!sections.length) {
    const rawIdx = text.lastIndexOf("原始转写：");
    if (rawIdx >= 0) sections.push(text.slice(rawIdx + "原始转写：".length));
  }
  return sections;
}

function extractLexVoiceTranscriptSegments(markdown) {
  const sections = splitLexVoiceTranscriptSections(markdown);
  const segments = [];
  for (const section of sections) {
    const headingRe = /^###\s+段落\s+(\d+)([^\n]*)$/gm;
    const heads = [...String(section).matchAll(headingRe)];
    if (!heads.length) {
      const text = cleanLexVoiceTranscriptBlock(section);
      if (text) segments.push({ index: segments.length, startOffsetMs: 0, endOffsetMs: 0, text });
      continue;
    }
    for (let i = 0; i < heads.length; i++) {
      const head = heads[i];
      const bodyStart = head.index + head[0].length;
      const bodyEnd = i + 1 < heads.length ? heads[i + 1].index : section.length;
      const body = cleanLexVoiceTranscriptBlock(section.slice(bodyStart, bodyEnd));
      if (!body) continue;
      const timeMatch = head[2].match(/\(([^)]+?)[–-]([^)]+?)\)/);
      const startOffsetMs = timeMatch ? parseElapsedMsToken(timeMatch[1]) : 0;
      const endOffsetMs = timeMatch ? parseElapsedMsToken(timeMatch[2]) : startOffsetMs;
      segments.push({
        index: segments.length,
        startOffsetMs,
        endOffsetMs,
        text: body,
      });
    }
  }
  return segments;
}

const LEXVOICE_EMPTY_SHORT_LIMIT_MS = 10 * 1000;

function parseLexVoiceDurationLabel(raw) {
  const text = String(raw || "").trim();
  if (!text) return 0;
  const seconds = text.match(/^(\d+(?:\.\d+)?)\s*秒$/);
  if (seconds) return Math.round(Number(seconds[1]) * 1000);
  const minutes = text.match(/^(\d+(?:\.\d+)?)\s*分钟$/);
  if (minutes) return Math.round(Number(minutes[1]) * 60 * 1000);
  return parseElapsedMsToken(text);
}

function getLexVoiceDurationMs(markdown) {
  const text = String(markdown || "");
  let maxMs = 0;
  let sawDuration = false;
  const segmentHeadingRe = /^###\s+段落\s+\d+\s*\(([^)\n]+?)[–-]([^)\n]+?)\)/gm;
  let match;
  while ((match = segmentHeadingRe.exec(text))) {
    sawDuration = true;
    maxMs = Math.max(maxMs, parseLexVoiceDurationLabel(match[2]));
  }
  if (sawDuration) return maxMs;

  const durationRe = /(?:时长|共)\s*[：:]?\s*(\d{1,3}:\d{2}(?::\d{2})?|\d+(?:\.\d+)?\s*(?:秒|分钟))/g;
  while ((match = durationRe.exec(text))) {
    const ms = parseLexVoiceDurationLabel(match[1]);
    if (ms > 0) {
      sawDuration = true;
      maxMs = Math.max(maxMs, ms);
    }
  }
  return sawDuration ? maxMs : 0;
}

function stripLexVoiceEmptyPlaceholders(text) {
  return String(text || "")
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/_?\[(?:此段无内容|无输出|转写失败|合并润色失败)[^\]\n]*\]_?/g, "")
    .replace(/^(?:没有|暂无)(?:可整理内容|有效内容|实际内容|可用内容)[。.!！]*$/gm, "")
    .replace(/^转写(?:为空|返回为空|无内容)[。.!！]*$/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasLexVoiceMeaningfulTranscript(text) {
  return stripLexVoiceEmptyPlaceholders(text).trim().length > 0;
}

function isStandaloneLexVoiceGeneratedNote(markdown) {
  const body = String(markdown || "").replace(/^---\n[\s\S]*?\n---\n?/m, "");
  const firstLine = (body.split(/\r?\n/).find((line) => line.trim()) || "").trim();
  return /^#\s+.+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+·\s+/.test(firstLine);
}

function getLexVoiceMeaningfulRemainder(markdown) {
  let text = String(markdown || "");
  text = text
    .replace(/^---\n[\s\S]*?\n---\n?/m, "")
    .replace(/<!--[^>]*-->/g, "")
    .replace(/<summary>[\s\S]*?<\/summary>/gi, "")
    .replace(/<\/?details>/gi, "")
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/^>\s*\[!info\].*$/gm, "")
    .replace(/^>\s*(?:开始|时间|合并自)[：:].*$/gm, "")
    .replace(/^>\s*.*(?:时长|模式|分段|模型).*$/gm, "")
    .replace(/^\s*---\s*$/gm, "");
  text = stripLexVoiceEmptyPlaceholders(text);
  return text.replace(/^\s*$/gm, "").trim();
}

function collectLexVoiceAudioRefs(markdown) {
  const refs = [];
  const seen = new Set();
  const re = /!\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = re.exec(String(markdown || "")))) {
    const ref = String(match[1] || "").split("|")[0].split("#")[0].trim();
    const fileName = ref.split("/").pop() || ref;
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    if (!ref || !AUDIO_EXT.has(ext)) continue;
    const key = obsidian.normalizePath(ref);
    if (!seen.has(key)) {
      seen.add(key);
      refs.push(ref);
    }
  }
  return refs;
}

function resolveLexVoiceAudioFile(app, settings, ref) {
  const normalizedRef = obsidian.normalizePath(String(ref || ""));
  const direct = app.vault.getAbstractFileByPath(normalizedRef);
  if (direct instanceof obsidian.TFile && AUDIO_EXT.has((direct.extension || "").toLowerCase())) return direct;

  const audioFolder = obsidian.normalizePath((settings && settings.audioFolder) || DEFAULT_SETTINGS.audioFolder);
  const fileName = normalizedRef.split("/").pop();
  if (!fileName) return null;
  const scoped = app.vault.getAbstractFileByPath(obsidian.normalizePath(`${audioFolder}/${fileName}`));
  if (scoped instanceof obsidian.TFile && AUDIO_EXT.has((scoped.extension || "").toLowerCase())) return scoped;

  const folder = app.vault.getAbstractFileByPath(audioFolder);
  if (!(folder instanceof obsidian.TFolder)) return null;
  const stack = folder.children.slice();
  while (stack.length) {
    const item = stack.pop();
    if (item instanceof obsidian.TFolder) {
      stack.push(...item.children);
    } else if (item instanceof obsidian.TFile && item.name === fileName && AUDIO_EXT.has((item.extension || "").toLowerCase())) {
      return item;
    }
  }
  return null;
}

function analyzeLexVoiceEmptyShortNote(file, markdown, settings) {
  const text = String(markdown || "");
  const hasLexVoiceMarker = /<!--\s*lexvoice-session(?::|\s*--)/.test(text) || /<!--\s*lexvoice-segments-start/.test(text);
  if (!hasLexVoiceMarker) return null;
  if (!isStandaloneLexVoiceGeneratedNote(text)) return null;

  const durationMs = getLexVoiceDurationMs(text);
  if (!(durationMs > 0 && durationMs <= LEXVOICE_EMPTY_SHORT_LIMIT_MS)) return null;

  const segments = extractLexVoiceTranscriptSegments(text);
  if (segments.some((seg) => hasLexVoiceMeaningfulTranscript(seg.text))) return null;
  if (hasLexVoiceMeaningfulTranscript(getLexVoiceMeaningfulRemainder(text))) return null;

  const audioRefs = collectLexVoiceAudioRefs(text);
  return { file, durationMs, audioRefs, audioFiles: [] };
}

async function trashLexVoiceFile(app, file) {
  if (app.vault && typeof app.vault.trash === "function") {
    await app.vault.trash(file, true);
  } else {
    await app.vault.delete(file);
  }
}

// 解析 frontmatter 角色字段中的"代号 → 真名"映射
// 用户在 yaml 里把 `参会人:` 数组的某项改成 `业务需求方（推断） → 某候选人`，
// 重新整理时这条会被解析成 { from: "业务需求方（推断）", to: "某候选人" }
const ROLE_MAPPING_FIELDS = ["参会人", "参谋", "受访者", "访问者", "面试官", "候选人", "当事人"];

function parseRoleMapItem(item) {
  const text = String(item == null ? "" : item).trim();
  if (!text) return null;
  // 支持 "代号 → 真名" / "代号 -> 真名" / "代号 => 真名" 三种箭头
  const m = text.match(/^(.+?)\s*(?:→|=>|->)\s*(.+)$/);
  if (!m) return null;
  const from = m[1].trim();
  const to = m[2].trim();
  if (!from || !to || from === to) return null;
  return { from, to };
}

function extractRoleMappingFromFrontmatter(frontmatter) {
  if (!frontmatter || typeof frontmatter !== "object") return [];
  const mapping = [];
  const seen = new Set();
  for (const field of ROLE_MAPPING_FIELDS) {
    const v = frontmatter[field];
    if (Array.isArray(v)) {
      for (const item of v) {
        const m = parseRoleMapItem(item);
        if (m && !seen.has(m.from)) {
          mapping.push(m);
          seen.add(m.from);
        }
      }
    } else if (typeof v === "string") {
      const m = parseRoleMapItem(v);
      if (m && !seen.has(m.from)) {
        mapping.push(m);
        seen.add(m.from);
      }
    }
  }
  return mapping;
}

// 把映射应用到 segments 的 text（按 from 长度降序，避免短代号在长代号内部被错替换）
function applyRoleMappingToSegments(segments, mapping) {
  if (!mapping || !mapping.length) return segments;
  const sorted = [...mapping].sort((a, b) => b.from.length - a.from.length);
  return segments.map(s => {
    let text = s.text || "";
    for (const m of sorted) {
      if (!m.from) continue;
      // 全局替换；用字符串而非正则，避免代号含正则元字符出错
      text = text.split(m.from).join(m.to);
    }
    return Object.assign({}, s, { text });
  });
}

// 在 frontmatter 字符串里把"代号 → 真名"项替换为单纯"真名"，让重整后的 yaml 干净
function rewriteFrontmatterRoleMappings(frontmatterText, mapping) {
  if (!frontmatterText || !mapping || !mapping.length) return frontmatterText;
  let next = frontmatterText;
  for (const m of mapping) {
    // 转义 from 用于正则
    const escFrom = m.from.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    // 匹配 "<from> [→/->/=>] <to>" 整个片段（保留前后空白），替换为 to
    const re = new RegExp(escFrom + "\\s*(?:→|=>|->)\\s*" + m.to.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "g");
    next = next.replace(re, m.to);
  }
  return next;
}

function getTodayDailyNoteInfo(app) {
  const internal = app && app.internalPlugins;
  const plugin = internal && (
    (typeof internal.getPluginById === "function" && internal.getPluginById("daily-notes"))
    || (internal.plugins && internal.plugins["daily-notes"])
  );
  if (!plugin || plugin.enabled === false) return null;
  const instance = plugin.instance || plugin._loadedPlugin || plugin.plugin || null;
  const options = Object.assign({}, plugin.options || {}, (instance && instance.options) || {});
  const format = options.format || "YYYY-MM-DD";
  let folder = obsidian.normalizePath(String(options.folder || "").trim()).replace(/\/$/, "");
  if (folder === "." || folder === "/") folder = "";
  const templateRaw = String(options.template || "").trim();
  const template = templateRaw ? obsidian.normalizePath(templateRaw).replace(/\.md$/i, "") + ".md" : "";
  const moment = window.moment;
  if (!moment) return null;
  const name = moment().format(format);
  const fileName = /\.md$/i.test(name) ? name : `${name}.md`;
  const dailyPath = obsidian.normalizePath(folder ? `${folder}/${fileName}` : fileName);
  const file = app.vault.getAbstractFileByPath(dailyPath);
  return { path: dailyPath, folder, template, file: file instanceof obsidian.TFile ? file : null };
}

function findTodayDailyNoteFile(app) {
  const info = getTodayDailyNoteInfo(app);
  return info ? info.file : null;
}

async function ensureVaultFolder(app, folderPath) {
  const norm = obsidian.normalizePath(String(folderPath || "").trim());
  if (!norm || norm === "." || norm === "/") return;
  const parts = norm.split("/").filter(Boolean);
  let cur = "";
  for (const part of parts) {
    cur = cur ? `${cur}/${part}` : part;
    const existing = app.vault.getAbstractFileByPath(cur);
    if (!existing) {
      try { await app.vault.createFolder(cur); } catch {}
    }
  }
}

async function ensureTodayDailyNoteFile(app) {
  const info = getTodayDailyNoteInfo(app);
  if (!info) return null;
  if (info.file) return info.file;
  const parentFolder = info.path.split("/").slice(0, -1).join("/");
  await ensureVaultFolder(app, parentFolder);
  let initial = "";
  if (info.template) {
    const tplFile = app.vault.getAbstractFileByPath(info.template);
    if (tplFile instanceof obsidian.TFile) {
      try {
        const tplBody = await app.vault.read(tplFile);
        const moment = window.moment;
        initial = String(tplBody || "")
          .replace(/\{\{\s*date\s*(?::([^}]+))?\}\}/g, (_, fmt) => moment().format(fmt || "YYYY-MM-DD"))
          .replace(/\{\{\s*time\s*(?::([^}]+))?\}\}/g, (_, fmt) => moment().format(fmt || "HH:mm"))
          .replace(/\{\{\s*title\s*\}\}/g, info.path.split("/").pop().replace(/\.md$/, ""));
      } catch {}
    }
  }
  try {
    return await app.vault.create(info.path, initial);
  } catch (e) {
    const existing = app.vault.getAbstractFileByPath(info.path);
    return existing instanceof obsidian.TFile ? existing : null;
  }
}

function extractLexVoiceSessionId(content, fallback) {
  const match = String(content || "").match(/<!--\s*lexvoice-session:([^>\s]+)\s*-->/);
  return match ? match[1].trim() : fallback;
}

function cleanInlineMarkdown(text) {
  return String(text || "")
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text, max = 220) {
  const cleaned = cleanInlineMarkdown(text);
  return cleaned.length > max ? cleaned.slice(0, max - 1).trimEnd() + "…" : cleaned;
}

function extractBriefingSummary(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/\[!abstract\]|整体概要|概要|摘要/.test(lines[i])) {
      const collected = [];
      for (let j = i + 1; j < lines.length; j++) {
        const raw = lines[j];
        const t = raw.trim();
        if (!t) {
          if (collected.length) break;
          continue;
        }
        if (/^#{1,6}\s+/.test(t) || /^---+$/.test(t)) break;
        if (/^>\s*\[!/.test(t)) break;
        collected.push(t.replace(/^>\s?/, ""));
        if (collected.join("").length > 260) break;
      }
      const summary = truncateText(collected.join(" "), 240);
      if (summary) return summary;
    }
  }

  for (const line of lines) {
    const t = line.trim();
    if (!t || /^#{1,6}\s+/.test(t) || /^>/.test(t) || /^[-*]\s+/.test(t) || /^\|/.test(t) || /^---+$/.test(t)) continue;
    const summary = truncateText(t, 240);
    if (summary) return summary;
  }
  return "";
}

function normalizeTaskText(line) {
  let t = String(line || "")
    .replace(/^>\s?/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\[[ xX]\]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
  t = cleanInlineMarkdown(t).replace(/[。；;，,]+$/, "").trim();
  if (!t || /^<.*>$/.test(t)) return "";
  if (/^(无|暂无|没有|未提及|不适用|跳过|待定)$/.test(t)) return "";
  return t;
}

function extractActionItems(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const items = [];
  const seen = new Set();
  let inActionSection = false;
  const actionRe = /(待办|行动项|下一步|跟进|后续|TODO|To[- ]?do|Action\s*Items?)/i;

  function add(line) {
    const text = normalizeTaskText(line);
    if (!text || seen.has(text)) return;
    seen.add(text);
    items.push(`- [ ] ${text}`);
  }

  for (const raw of lines) {
    const line = raw.trim();
    const visible = line.replace(/^>\s?/, "");
    if (/^[-*+]\s+\[[ xX]\]\s+/.test(visible)) {
      add(visible);
      continue;
    }
    if (/^#{1,6}\s+/.test(visible) || /^>\s*\[!/.test(line)) {
      inActionSection = actionRe.test(visible);
      continue;
    }
    if (inActionSection && /^[-*+]\s+/.test(visible)) add(visible);
  }
  return items.slice(0, 12);
}

function makeNoteLink(path) {
  const target = String(path || "").replace(/\.md$/i, "");
  const label = target.split("/").pop() || target;
  return `[[${target}|${label}]]`;
}

function buildDailyMeetingOverviewEntry(session, polished, settings) {
  const meta = getModeMeta(settings, session.mode);
  const moment = window.moment;
  const startedAt = moment ? moment(session.startedAt) : null;
  const time = startedAt && startedAt.isValid && startedAt.isValid() ? startedAt.format("HH:mm") : "";
  const totalMs = session.segments && session.segments.length ? session.segments[session.segments.length - 1].endOffsetMs : 0;
  const summary = extractBriefingSummary(polished) || "见完整纪要。";
  const tasks = extractActionItems(polished);
  const lines = [
    `<!-- lexvoice-daily-overview:${session.id} -->`,
    `### ${time ? time + " · " : ""}${makeNoteLink(session.mdPath)}`,
    `> 模式：${meta.prefix} · 时长：${formatElapsed(totalMs)} · 分段：${session.segments.length} · 模型：${settings.llmModel}`,
    "",
    `- 核心信息：${summary}`,
  ];
  if (tasks.length) {
    lines.push("", "#### 待办", ...tasks);
  }
  lines.push(`<!-- lexvoice-daily-overview-end:${session.id} -->`);
  return lines.join("\n");
}

function upsertDailyMeetingOverview(content, sessionId, entry) {
  const start = `<!-- lexvoice-daily-overview:${sessionId} -->`;
  const end = `<!-- lexvoice-daily-overview-end:${sessionId} -->`;
  const startIdx = content.indexOf(start);
  const endIdx = content.indexOf(end, startIdx);
  if (startIdx >= 0 && endIdx > startIdx) {
    return content.slice(0, startIdx) + entry + content.slice(endIdx + end.length);
  }

  const headingRe = /^##\s+今日会议概要\s*$/m;
  const match = headingRe.exec(content);
  if (!match) {
    const sep = content.trim() ? "\n\n" : "";
    return content.replace(/\s*$/, "") + sep + "## 今日会议概要\n\n" + entry + "\n";
  }

  const afterHeading = content.indexOf("\n", match.index) + 1;
  const rest = content.slice(afterHeading);
  const nextHeading = rest.search(/\n##\s+/);
  const insertAt = nextHeading >= 0 ? afterHeading + nextHeading : content.length;
  const before = content.slice(0, insertAt).replace(/\s*$/, "\n\n");
  const after = content.slice(insertAt).replace(/^\n*/, "\n");
  return before + entry + after;
}

function buildRecruitContextPrefix(ctx) {
  if (!ctx) return "";
  const parts = ["## 📋 本场面试上下文（评分锚点，必须严格遵循）"];
  if (ctx.position) parts.push(`**应聘岗位**：${ctx.position}`);
  if (ctx.candidateName) parts.push(`**候选人**：${ctx.candidateName}`);
  if (ctx.round) parts.push(`**轮次**：${ctx.round}`);
  if (ctx.interviewer) parts.push(`**面试官**：${ctx.interviewer}`);
  if (ctx.seniority) parts.push(`**岗位资历级别**：${ctx.seniority}（按此 seniority 校准评分严格度）`);
  if (ctx.customNote) parts.push(`**特殊关注**：${ctx.customNote}`);
  if (ctx.jd) {
    parts.push("");
    parts.push("### 岗位 JD（评分必须按此拆解硬性要求和加分项）");
    parts.push(ctx.jd.trim());
  }
  if (ctx.resume) {
    parts.push("");
    parts.push("### 候选人简历（用于核验面试中的陈述是否一致）");
    parts.push(ctx.resume.trim());
  }
  parts.push("");
  parts.push("---");
  parts.push("");
  parts.push("**评分纪律提醒**：");
  parts.push("- 默认假设候选人不达标，需看到正向证据才加分");
  parts.push("- 把 JD 拆成 3-5 条硬性要求 + 1-3 条加分项，逐条评估");
  parts.push("- 简历 vs 面试陈述若有矛盾，必须列入风险点");
  parts.push("- 行业/经验跨度若 JD 不允许，必须作为硬扣分项");
  parts.push("- 多极化岗位（A 端 + B 端）必须独立评估，两端均未达 senior 深度 = 两头不接 = 倾向不推荐");
  parts.push("");
  return parts.join("\n");
}

// 由代码注入的会话元信息前缀 —— LLM 不需要推断 frontmatter 里的 time/时长
// 这些字段从 session.startedAt / session 时长直接给定
const FRONTMATTER_CONTENT_KEYS = {
  learning: ["主题", "来源", "语言"],
  interview: ["主题", "受访者", "访问者"],
  meeting: ["主题", "参会人"],
  huddle: ["议题", "当事人", "参谋"],
  monologue: ["主题"],
  recruit: ["候选人", "应聘岗位", "轮次", "录用建议"],
};

function formatYamlDateTime(value) {
  if (!value) return "";
  const moment = window.moment;
  if (moment) {
    const m = moment(value);
    if (m && m.isValid && m.isValid()) return m.format("YYYY-MM-DDTHH:mm:ss");
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeBriefingFrontmatterFields(raw, mode) {
  const source = (raw && typeof raw === "object") ? Object.assign({}, raw) : {};
  if (source["录音主题"] && !source["主题"]) source["主题"] = source["录音主题"];
  if (source["与会人"] && !source["参会人"]) source["参会人"] = source["与会人"];

  const allowed = new Set(FRONTMATTER_CONTENT_KEYS[mode] || ["主题"]);
  const cleaned = {};
  for (const key of FRONTMATTER_CONTENT_KEYS[mode] || ["主题"]) {
    if (Object.prototype.hasOwnProperty.call(source, key)) cleaned[key] = source[key];
  }
  for (const key of Object.keys(source)) {
    if (!allowed.has(key)) continue;
    if (!Object.prototype.hasOwnProperty.call(cleaned, key)) cleaned[key] = source[key];
  }
  return cleaned;
}

function splitLeadingFrontmatter(markdown) {
  const text = String(markdown || "").replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!match) return { frontmatter: "", body: text };
  return {
    frontmatter: match[0].replace(/\n*$/, "\n"),
    body: text.slice(match[0].length).replace(/^\n+/, ""),
  };
}

function mergeLeadingFrontmatterIntoDocument(documentText, generatedMarkdown) {
  const generated = splitLeadingFrontmatter(generatedMarkdown || "");
  if (!generated.frontmatter) return { content: String(documentText || ""), body: String(generatedMarkdown || "") };
  const current = splitLeadingFrontmatter(documentText || "");
  return {
    content: generated.frontmatter.trimEnd() + "\n\n" + current.body.replace(/^\n+/, ""),
    body: generated.body.trim() || "_[无输出]_",
  };
}

function sanitizePromptTemplate(tpl, fallbackBaseMode) {
  const now = new Date().toISOString();
  const clean = Object.assign({}, tpl || {});
  const rawId = String(clean.id || "").trim();
  clean.id = rawId || makeCustomPromptModeId(clean.name || "scene");
  clean.mode = clean.id;
  clean.name = String(clean.name || "自定义提示词").trim().slice(0, 80) || "自定义提示词";
  clean.description = String(clean.description || "").trim().slice(0, 240);
  const fallback = MODE_META[fallbackBaseMode] ? fallbackBaseMode : "learning";
  clean.baseMode = MODE_META[clean.baseMode] ? clean.baseMode : fallback;
  clean.prompt = String(clean.prompt || "").trim();
  clean.isBuiltin = false;
  clean.customMode = true;
  clean.createdAt = clean.createdAt || now;
  clean.updatedAt = now;
  return clean;
}

// 解析 LLM 输出末尾的标签建议注释 <!-- lexvoice-tags: 主题/招聘流程, 项目/晋升提名 -->
function parseSuggestedTagsFromOutput(text) {
  if (!text) return { tags: [], cleaned: text || "" };
  const re = /<!--\s*lexvoice-tags(?:-suggest)?\s*:\s*([\s\S]*?)\s*-->/i;
  const m = text.match(re);
  if (!m) return { tags: [], cleaned: text };
  const tags = m[1]
    .split(/[,，;；、\n]+/)
    .map(s => s.trim())
    // 防御 LLM 可能带 # 前缀
    .map(s => s.replace(/^#+/, "").trim())
    // 防御内部出现空格或非法 tag 字符（Obsidian tag 不允许空格）
    .map(s => s.replace(/\s+/g, ""))
    .filter(Boolean)
    // 防御过长：nested tag 也很少超过 24 字
    .filter(s => s.length > 0 && s.length <= 24)
    // 防御和系统 tag 重复
    .filter(s => !/^lexvoice\//i.test(s));
  // 去重
  const seen = new Set();
  const unique = [];
  for (const t of tags) {
    if (!seen.has(t)) { unique.push(t); seen.add(t); }
  }
  const cleaned = text.replace(re, "").replace(/\n{3,}$/, "\n\n").trimEnd() + "\n";
  return { tags: unique, cleaned };
}

// 把 LLM 输出（含 frontmatter + 正文 + 末尾 tags 注释）规整成最终笔记内容：
//   - 强制覆盖系统字段：mode / time / 时长 / 状态
//   - merge tags：[lexvoice/<mode>] + LLM 标签建议 + (可选) 已有 tags
//   - 删除末尾的 lexvoice-tags 注释
//   - originalFrontmatter 非空时（重新整理场景），保留它的内容字段（用户改过的代号映射等），
//     不让 LLM 的 frontmatter 覆盖；只 merge 新的 tag 建议
function postProcessBriefingOutput(rawOutput, mode, sessionMeta, originalFrontmatter) {
  if (!rawOutput) return rawOutput || "";
  const { tags: suggested, cleaned: stripped } = parseSuggestedTagsFromOutput(rawOutput);

  // 解析 LLM 输出的 frontmatter（如有）
  const fmMatch = stripped.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  let llmFm = null;
  let body = stripped;
  if (fmMatch) {
    try { llmFm = obsidian.parseYaml(fmMatch[1]); } catch (e) { llmFm = null; }
    body = stripped.slice(fmMatch[0].length).replace(/^\n+/, "");
  }

  // base frontmatter 选择：重整时优先用 originalFrontmatter（保留用户改动），首次用 LLM 输出。
  // 随后只保留当前模式 schema 内的内容字段，避免 LLM 擅自加入 date/location/decision 等重复字段。
  const rawBase = (originalFrontmatter && typeof originalFrontmatter === "object")
    ? Object.assign({}, originalFrontmatter)
    : (llmFm && typeof llmFm === "object" ? Object.assign({}, llmFm) : {});
  const base = normalizeBriefingFrontmatterFields(rawBase, mode);

  // 强制覆盖系统字段
  base.mode = mode;
  if (sessionMeta && sessionMeta.startedAt) {
    const time = formatYamlDateTime(sessionMeta.startedAt);
    if (time) base.time = time;
  } else if (originalFrontmatter && originalFrontmatter.time) {
    const time = formatYamlDateTime(originalFrontmatter.time);
    if (time) base.time = time;
  }
  if (sessionMeta && sessionMeta.duration) {
    base["时长"] = sessionMeta.duration;
  }
  base["状态"] = "已整理";

  // merge tags：[lexvoice/<mode>] + 已有 + 建议
  const sysTag = "lexvoice/" + mode;
  const rawTags = (originalFrontmatter && originalFrontmatter.tags) || (rawBase && rawBase.tags);
  const existingTags = Array.isArray(rawTags)
    ? rawTags.map(t => String(t).trim()).filter(Boolean)
    : (typeof rawTags === "string" && rawTags.trim() ? [rawTags.trim()] : []);
  const tags = [];
  const seen = new Set();
  const push = (t) => { if (t && !seen.has(t)) { tags.push(t); seen.add(t); } };
  push(sysTag);
  for (const t of existingTags) push(t);
  for (const t of suggested) push(t);
  base.tags = tags;

  // 字段输出顺序：mode → time → 时长 → 内容字段 → 状态 → tags。
  // time 使用 YAML 可识别的日期时间标量，例如 2026-05-08T12:55:00；不再保留 date/日期。
  const ordered = {};
  ordered.mode = base.mode;
  if (base.time) ordered.time = base.time;
  if (base["时长"]) ordered["时长"] = base["时长"];
  // 中间字段：base 自身按插入顺序，但跳过已写入和末尾要写的
  const seenKeys = new Set(["mode", "time", "date", "日期", "时间", "时长", "状态", "status", "tags"]);
  for (const k of Object.keys(base)) {
    if (seenKeys.has(k)) continue;
    ordered[k] = base[k];
  }
  ordered["状态"] = base["状态"];
  ordered.tags = base.tags;

  let yamlBlock;
  try { yamlBlock = obsidian.stringifyYaml(ordered); } catch (e) {
    // 兜底：手动拼
    yamlBlock = Object.entries(ordered).map(([k, v]) => {
      if (Array.isArray(v)) return k + ":\n" + v.map(x => "  - " + String(x)).join("\n");
      return k + ": " + String(v == null ? "" : v);
    }).join("\n") + "\n";
  }
  return "---\n" + yamlBlock + "---\n\n" + body.trimStart();
}

// 从老笔记的文件名 + 内容推断 mode
function inferModeFromLegacyNote(filename, content) {
  // 1. 从 [!info] 录音信息 callout 里的"模式：xxx"提取（最可靠）
  const calloutLine = content.match(/>\s*\[!info\][^\n]*\n>\s*([^\n]+)/);
  if (calloutLine) {
    const mm = calloutLine[1].match(/模式\s*[:：]\s*([一-龥A-Za-z]+)/);
    if (mm) {
      const m = mm[1];
      if (m === "学习" || m === "学习记录") return "learning";
      if (m === "访谈" || m === "访谈调研") return "interview";
      if (m === "会议" || m === "工作纪要") return "meeting";
      if (m === "小会" || m === "讨论" || m === "圆桌讨论") return "huddle";
      if (m === "独白" || m === "手记" || m === "个人笔记") return "monologue";
      if (m === "面试" || m === "招聘" || m === "招聘评估") return "recruit";
    }
  }

  // 2. 文件名前缀（"访谈-xxx"、"面试-xxx"等）
  if (/(?:^|·\s*)面试|招聘/i.test(filename)) return "recruit";
  if (/(?:^|·\s*)学习|视频|课程|讲座/i.test(filename)) return "learning";
  if (/(?:^|·\s*)访谈/i.test(filename)) return "interview";
  if (/(?:^|·\s*)小会|圆桌/i.test(filename)) return "huddle";
  if (/(?:^|·\s*)独白|(?:^|·\s*)手记|个人笔记/i.test(filename)) return "monologue";
  if (/(?:^|·\s*)会议|纪要/i.test(filename)) return "meeting";

  // 3. H1 标题里的 emoji
  const h1Match = content.match(/^#\s+([^\n]*)/m);
  if (h1Match) {
    const h1 = h1Match[1];
    if (/🧑‍💼|面试|招聘/.test(h1)) return "recruit";
    if (/📚|学习|视频|课程|讲座/.test(h1)) return "learning";
    if (/🎤|访谈/.test(h1)) return "interview";
    if (/🤝|小会/.test(h1)) return "huddle";
    if (/💭|独白|手记/.test(h1)) return "monologue";
    if (/📋|会议/.test(h1)) return "meeting";
  }

  // 4. H2 标题
  const h2Match = content.match(/^##\s+([^\n]*)/m);
  if (h2Match) {
    const h2 = h2Match[1];
    if (/面试|招聘/.test(h2)) return "recruit";
    if (/学习|视频|课程|讲座/.test(h2)) return "learning";
    if (/访谈/.test(h2)) return "interview";
    if (/小会/.test(h2)) return "huddle";
    if (/会议/.test(h2)) return "meeting";
    if (/独白|手记/.test(h2)) return "monologue";
  }

  // 5. 内容包含特征性段落
  if (/候选人画像|JD\s*匹配度|录用建议/.test(content)) return "recruit";
  if (/学习要点|可收纳卡片|概念与术语|学习材料/.test(content)) return "learning";
  if (/受访者|访问者/.test(content)) return "interview";
  if (/参谋.*戳破|认知提醒/.test(content)) return "huddle";
  if (/参会人/.test(content)) return "meeting";

  return null;
}

// 从文件名推断主题：去掉日期/时间前缀和模式标签前缀
function inferTopicFromFilename(filename) {
  let stem = String(filename || "").replace(/\.md$/i, "");
  // 去掉 "YYYY-MM-DD HHmm · " 或 "YYYY-MM-DD · " 或 "YYYY-MM-DD HHmm "
  stem = stem.replace(/^\d{4}-\d{2}-\d{2}(?:\s+\d{4})?\s*·?\s*/, "");
  // 去掉模式标签前缀（"访谈-"、"面试-"、"会议-"等）
  stem = stem.replace(/^(访谈|面试|招聘|会议|小会|独白|手记|纪要)\s*[-—－]?\s*/, "");
  return stem.trim();
}

function buildSessionMetaPrefix(meta, mode) {
  if (!meta || !meta.startedAt) return "";
  const m = window.moment(meta.startedAt);
  const date = m.format("YYYY-MM-DD");
  const time = m.format("HH:mm");
  const duration = meta.duration || "";
  const lines = [
    "## 会话元信息（**直接填入 frontmatter 对应字段，不要推断、不要修改**）",
    "",
    "- 日期: " + date,
    "- 时间: " + time,
  ];
  if (duration) lines.push("- 时长: " + duration);
  if (mode) lines.push("- mode: " + mode);
  lines.push("");
  lines.push("frontmatter 的「日期」「时间」「时长」「mode」字段必须照搬上面给定的值；其他字段（主题、参会人等）根据转写内容推断。");
  return lines.join("\n");
}

// 把 prompt 里的 {{STRUCTURE_INSTRUCTION}} 占位符替换为用户当前选择的结构化程度指令
function applyStructureLevelInstruction(prompt, settings) {
  const level = (settings && settings.briefingStructureLevel) || "balanced";
  const block = buildStructureLevelInstruction(level);
  return prompt.replace("{{STRUCTURE_INSTRUCTION}}", block);
}

// 解析活跃 prompt 模板：优先用户在管理页选中的活跃模板，
// 然后是该模板自定义的 prompt 文本（非空覆盖内置），最后回退到内置 POLISH_PROMPTS / MERGE_PROMPTS
function resolveTemplatePromptForMode(plugin, mode, isMerged) {
  const builtins = isMerged ? MERGE_PROMPTS : POLISH_PROMPTS;
  const customMode = getCustomPromptModeTemplate(plugin.settings, mode);
  const baseMode = customMode && customMode.baseMode && builtins[customMode.baseMode] ? customMode.baseMode : "learning";
  const fallback = builtins[mode] || builtins[baseMode] || builtins.interview;
  const tpls = plugin.settings.promptTemplates || {};
  const activeId = (plugin.settings.activeTemplateByMode || {})[mode];
  const tpl = activeId ? tpls[activeId] : customMode;
  if (tpl && typeof tpl.prompt === "string" && tpl.prompt.trim()) return tpl.prompt;
  const legacyKey = legacyPromptFieldForMode(mode);
  const legacy = legacyKey ? plugin.settings[legacyKey] : "";
  if (legacy && typeof legacy === "string" && legacy.trim()) return legacy;
  return fallback;
}

async function polishTranscript(plugin, transcript, mode, recruitContext, sessionMeta, originalFrontmatter) {
  if (!transcript || !transcript.trim()) return "";
  if (mode === "off") return transcript;
  const tpl = resolveTemplatePromptForMode(plugin, mode, false);
  const sys = mode === "recruit"
    ? "你是严格的招聘评估官，立场是替面试官筛掉不达标候选人，而不是替候选人辩护。默认假设候选人不达标，需要看到正向证据才能加分。诚实/不夸大/承认边界是基础职业素养，不计入亮点。结果未闭环、独立主导不清、行业不匹配、关键能力仅'接触过'级别——这些必须列入红旗。"
    : "你是一位专业的文字编辑助手，擅长整理访谈、会议与口述的录音转写。";
  let userPrompt = applyStructureLevelInstruction(tpl, plugin.settings).replace("{{TRANSCRIPT}}", transcript);
  userPrompt = applyBriefingLanguageInstruction(userPrompt, plugin.settings);
  userPrompt = userPrompt.replace("{{STRUCTURE_INSTRUCTION}}", "");
  const metaPrefix = buildSessionMetaPrefix(sessionMeta, mode);
  if (metaPrefix) userPrompt = metaPrefix + "\n\n---\n\n" + userPrompt;
  if (mode === "recruit" && recruitContext) {
    userPrompt = buildRecruitContextPrefix(recruitContext) + "\n\n" + userPrompt;
  }
  const raw = await callLlm(plugin, sys, userPrompt);
  return postProcessBriefingOutput(raw, mode, sessionMeta, originalFrontmatter);
}

async function mergeAndPolish(plugin, segments, mode, recruitContext, sessionMeta, originalFrontmatter) {
  if (!segments || segments.length === 0) return "";
  if (mode === "off") return segments.map(s => s.text).join("\n\n");
  const joined = segments.map((s) => {
    const tag = `===SEG ${s.index + 1} (${formatElapsed(s.startOffsetMs)}-${formatElapsed(s.endOffsetMs)})===`;
    return `${tag}\n${s.text || "_[此段无内容]_"}`;
  }).join("\n\n");
  const tpl = resolveTemplatePromptForMode(plugin, mode, true);
  const sys = mode === "recruit"
    ? "你是严格的招聘评估官，正在合并分段转写并产出最终面试评价。立场是替面试官筛掉不达标候选人，不替候选人辩护。默认假设候选人不达标，需要正向证据才加分。诚实/不夸大/承认边界是基础职业素养，不计入亮点。结果未闭环、独立主导不清、行业不匹配、关键能力仅'接触过'——必须列入红旗。多极化岗位（A 端 + B 端）若两端均未达 senior 深度，必须诊断为'两头不接'，录用建议倾向不推荐。"
    : "你是一位专业的文字编辑助手，擅长把分段录音转写合并为连续、干净、忠实原意、结构清晰的 Markdown 文档。";
  let userPrompt = applyStructureLevelInstruction(tpl, plugin.settings).replace("{{TRANSCRIPT}}", joined);
  userPrompt = applyBriefingLanguageInstruction(userPrompt, plugin.settings);
  userPrompt = userPrompt.replace("{{STRUCTURE_INSTRUCTION}}", "");
  // 会话元信息前置
  let computedMeta = sessionMeta || null;
  if (!computedMeta && segments.length > 0) {
    // 兜底：mergeAndPolish 没传 sessionMeta 时，从 segments 推 duration（startedAt 仍需调用方传）
    const last = segments[segments.length - 1];
    computedMeta = { duration: formatElapsed(last.endOffsetMs || 0) };
  }
  const metaPrefix = buildSessionMetaPrefix(computedMeta, mode);
  if (metaPrefix) userPrompt = metaPrefix + "\n\n---\n\n" + userPrompt;
  if (mode === "recruit" && recruitContext) {
    userPrompt = buildRecruitContextPrefix(recruitContext) + "\n\n" + userPrompt;
  }
  const raw = await callLlm(plugin, sys, userPrompt);
  return postProcessBriefingOutput(raw, mode, computedMeta, originalFrontmatter);
}

async function generateTitleTag(plugin, polished, mode) {
  const prefix = getModeMeta(plugin.settings, mode).prefix;
  const snippet = (polished || "").slice(0, 2500);
  if (!snippet.trim()) return "";
  const sys = "你是文件命名助手，擅长从中文内容中提取简洁的主题标签。";
  const user = `下面是一段 ${prefix} 记录。请提取一个 ≤15 个字的主题标签。

【要求】
- 只输出标签本身，不加引号、标点、前缀、解释、emoji。
- 优先"具体对象-核心议题"格式，如"合同审查-供应商独家条款"、"周例会-Q2规划"。
- 避免宽泛词如"讨论"、"记录"、"聊天"。
- 使用中文。

【内容】
${snippet}`;
  try {
    const title = await callLlm(plugin, sys, user);
    return sanitizeFilename(title);
  } catch (e) {
    console.error("[LexVoice] generateTitleTag failed", e);
    return "";
  }
}

class TaskQueue {
  constructor(plugin) {
    this.plugin = plugin;
    this.tasks = [];
    this.running = false;
  }
  load(saved) {
    const raw = Array.isArray(saved) ? saved.slice() : [];
    this.tasks = raw
      .filter(t => t && typeof t === "object" && t.type)
      .map(t => {
        const task = Object.assign({}, t);
        task.id = task.id || genId();
        task.retries = Math.max(0, Number(task.retries) || 0);
        task.createdAt = task.createdAt || new Date().toISOString();
        task.updatedAt = task.updatedAt || task.createdAt;
        if (task.status === "running") {
          task.status = "pending";
          task.lastError = task.lastError || "上次运行中断，已恢复为待处理";
        }
        if (!["pending", "failed", "missing", "processing"].includes(task.status)) task.status = "pending";
        return task;
      });
  }
  snapshot() { return this.tasks.slice(); }
  findActiveGeneratePromptTask(mode) {
    return this.tasks.find(t =>
      t &&
      t.type === "generate-prompt" &&
      t.mode === mode &&
      t.status !== "failed" &&
      t.status !== "missing"
    );
  }
  async add(task) {
    task.id = task.id || genId();
    task.createdAt = task.createdAt || new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    task.retries = task.retries || 0;
    task.status = task.status || "pending";
    this.tasks.push(task);
    await this.plugin.saveAll();
    return task;
  }
  async remove(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    await this.plugin.saveAll();
  }
  async update(id, patch) {
    const t = this.tasks.find(x => x.id === id);
    if (!t) return;
    Object.assign(t, patch, { updatedAt: new Date().toISOString() });
    await this.plugin.saveAll();
  }
  async processAll() {
    if (this.running) return;
    this.running = true;
    try {
      const pending = this.tasks.filter(t => t.status !== "running" && t.retries < (this.plugin.settings.maxRetries || 3));
      for (const t of pending) {
        await this.processOne(t).catch((e) => console.error("[LexVoice] queue task failed", e));
      }
    } finally {
      this.running = false;
    }
  }
  async processOne(task) {
    await this.update(task.id, { status: "running", lastError: "" });
    try {
      if (task.type === "transcribe") await this.plugin.retryTranscribeTask(task);
      else if (task.type === "merge") await this.plugin.retryMergeTask(task);
      else if (task.type === "generate-prompt") await this.plugin.runGeneratePromptTask(task);
      else throw new Error(`未知任务类型：${task.type}`);
      await this.remove(task.id);
    } catch (e) {
      await this.update(task.id, {
        status: "failed",
        retries: (task.retries || 0) + 1,
        lastError: (e && e.message) || String(e),
      });
      throw e;
    }
  }
  hasPendingGeneratePrompt() {
    return this.tasks.some(t => t && t.type === "generate-prompt" && t.status !== "failed");
  }
}

const VIEW_TYPE_OUTLINE = "lexvoice-outline-view";

class OutlineView extends obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.aiOutline = "";
    this.outlineRunning = false;
    this.lastOutlineSegmentCount = 0;
    this._renderRaf = 0;
    this._lastSig = "";
    this._lastRenderedOutline = "";
  }
  getViewType() { return VIEW_TYPE_OUTLINE; }
  getDisplayText() { return "LexVoice 实时纪要"; }
  getIcon() { return "list-tree"; }
  async onOpen() {
    this.containerEl.children[1].empty();
    this._lastSig = "";
    this.render();
    // 节流：recorder 每 500ms 滴答一次。只更新计时文本，结构不变时不重建 DOM。
    this.unsubscribeRecorder = this.plugin.recorder.on(() => this.scheduleUpdate());
    if (this.plugin.settings.enableRealtimeOutline
        && this.plugin.session
        && this.plugin.session.segments.length > 0
        && !this.aiOutline) {
      setTimeout(() => this.refreshAIOutline({ silent: true }), 400);
    }
  }
  async onClose() {
    if (this.unsubscribeRecorder) { this.unsubscribeRecorder(); this.unsubscribeRecorder = null; }
    if (this._renderRaf) { cancelAnimationFrame(this._renderRaf); this._renderRaf = 0; }
  }
  // 通过 rAF 合并连续 emit；如签名（结构性状态）未变只做轻量更新，否则全量 render
  scheduleUpdate() {
    if (this._renderRaf) return;
    this._renderRaf = requestAnimationFrame(() => {
      this._renderRaf = 0;
      const sig = this.computeSignature();
      if (sig === this._lastSig) {
        this.updateLiveStats();
      } else {
        this._lastSig = sig;
        this.render();
      }
    });
  }
  computeSignature() {
    const session = this.plugin.session;
    const recState = this.plugin.recorder.state;
    const segs = session ? session.segments : [];
    let segDone = 0, segErr = 0;
    for (const s of segs) { if (s.error) segErr++; else if (s.text) segDone++; }
    const queueN = this.plugin.queue ? this.plugin.queue.tasks.length : 0;
    const mode = session ? session.mode : getEffectivePolishMode(this.plugin.settings, this.plugin.settings.polishMode);
    const captureMode = this.plugin.settings.captureMode || "mic";
    // 招聘上下文卡片的"已填" vs "未填"也要进 signature——填完 JD 后卡片要重渲染
    const ctx = this.plugin.settings.recruitContext || {};
    const ctxFilled = (ctx.jd && ctx.jd.trim()) ? 1 : 0;
    return [
      session ? session.id : "idle",
      recState,
      session && session.finalizing ? 1 : 0,
      segs.length, segDone, segErr,
      this.aiOutline ? this.aiOutline.length : 0,
      this.outlineRunning ? 1 : 0,
      queueN,
      mode,            // ← 模式切换会触发重渲染（招聘上下文卡片显隐）
      captureMode,     // ← 音频输入方式切换会触发设备状态条重渲染
      ctxFilled,       // ← JD 填写状态变化触发卡片状态更新
    ].join("|");
  }
  // 仅刷新计时和"x 段"等高频文本，避免重建按钮和重绘 Markdown
  updateLiveStats() {
    const root = this.containerEl.children[1];
    if (!root) return;
    const session = this.plugin.session;
    const info = this.plugin.recorder.getInfo();
    const metaEl = root.querySelector(".lexvoice-outline-meta");
    if (metaEl && session) {
      const stamp = window.moment(session.startedAt).format("YYYY-MM-DD HH:mm:ss");
      metaEl.setText(`${stamp} · ${formatElapsed(info.elapsed)} · ${session.segments.length} 段`);
    }
    this.updateInputMeter(root, info);
  }
  render() {
    const root = this.containerEl.children[1];
    if (!root) return;
    root.empty();
    root.addClass("lexvoice-outline");
    this._lastRenderedOutline = "";

    const session = this.plugin.session;
    const recInfo = this.plugin.recorder.getInfo();

    if (session) {
      this.renderActiveHead(root, session, recInfo);
      if (session.segments.length > 0) this.renderSegments(root, session);
      this.renderAIOutline(root, session);
    } else {
      this.renderIdleHead(root);
      this.renderRecent(root);
    }
    this.renderQueueInbox(root);
    this._lastSig = this.computeSignature();
  }

  renderTitleRow(head, title) {
    const row = head.createDiv({ cls: "lexvoice-outline-title-row" });
    row.createDiv({ cls: "lexvoice-outline-title", text: title });
    const btn = row.createEl("button", {
      cls: "clickable-icon lexvoice-outline-settings-btn",
      attr: { "aria-label": "打开 LexVoice 设置", title: "打开 LexVoice 设置" },
    });
    try { obsidian.setIcon(btn, "settings"); } catch { btn.setText("设置"); }
    btn.onclick = () => this.plugin.openSettings("home");
  }

  renderActiveHead(root, session, recInfo) {
    const head = root.createDiv({ cls: "lexvoice-outline-head" });
    const meta = getModeMeta(this.plugin.settings, session.mode);
    let statusText;
    if (session.finalizing) statusText = "合并润色中…";
    else if (recInfo.state === "recording") statusText = "录音中";
    else if (recInfo.state === "paused") statusText = "已暂停";
    else statusText = "处理中…";
    this.renderTitleRow(head, `${meta.prefix} · ${statusText}`);
    const stamp = window.moment(session.startedAt).format("YYYY-MM-DD HH:mm:ss");
    head.createDiv({ cls: "lexvoice-outline-meta",
      text: `${stamp} · ${formatElapsed(recInfo.elapsed)} · ${session.segments.length} 段` });
    this.renderInputMeter(head, recInfo);
    const actions = head.createDiv({ cls: "lexvoice-outline-actions" });
    const jumpBtn = actions.createEl("button", { text: "跳到笔记" });
    jumpBtn.onclick = () => this.plugin.openSessionNote();
    if (recInfo.state !== "idle") {
      const stopBtn = actions.createEl("button", { text: recInfo.state === "paused" ? "继续" : "暂停", cls: "mod-cta" });
      stopBtn.onclick = () => recInfo.state === "paused" ? this.plugin.recorder.resume() : this.plugin.recorder.pause();
      const endBtn = actions.createEl("button", { text: "停止" });
      endBtn.onclick = () => this.plugin.stopRecording();
    }
  }

  renderInputMeter(parent, recInfo) {
    const wrap = parent.createDiv({ cls: "lexvoice-input-meters", attr: { title: "显示 LexVoice 实际录到的输入音量。条不动时，说明当前录音流没有收到声音。" } });
    const sources = this.getMeterSources(recInfo);
    for (const source of sources) {
      const row = wrap.createDiv({ cls: `lexvoice-input-meter is-${source.kind}`, attr: { "data-kind": source.kind } });
      row.createDiv({ cls: "lexvoice-input-meter-icon", text: source.icon || "●" });
      const name = row.createDiv({ cls: "lexvoice-input-meter-name", text: source.label || "输入" });
      name.setAttr("title", source.label || "输入");
      row.createDiv({ cls: "lexvoice-input-meter-state" });
      const bars = row.createDiv({ cls: "lexvoice-input-meter-bars" });
      for (let i = 0; i < 12; i++) bars.createSpan({ cls: "lexvoice-input-meter-bar" });
    }
    this.updateInputMeter(parent, recInfo);
  }

  getMeterSources(recInfo) {
    const sources = recInfo && Array.isArray(recInfo.sourceLevels) ? recInfo.sourceLevels : [];
    if (sources.length) return sources;
    return [{ kind: "input", icon: "●", label: "输入", level: (recInfo && recInfo.audioLevel) || 0, bars: new Array(12).fill(0) }];
  }

  updateInputMeter(root, recInfo) {
    const wrap = root.querySelector(".lexvoice-input-meters");
    if (!wrap) return;
    const sources = this.getMeterSources(recInfo);
    for (const source of sources) {
      const row = wrap.querySelector(`.lexvoice-input-meter[data-kind="${source.kind}"]`);
      if (!row) continue;
      const level = Math.max(0, Math.min(1, source.level || 0));
      const state = row.querySelector(".lexvoice-input-meter-state");
      const bars = row.querySelectorAll(".lexvoice-input-meter-bar");
      row.classList.toggle("is-silent", level < 0.012);
      row.classList.toggle("is-active", level >= 0.012);
      if (state) {
        if (recInfo && recInfo.state === "paused") state.setText("暂停");
        else state.setText(level >= 0.012 ? "有输入" : "静音");
      }
      const values = Array.isArray(source.bars) ? source.bars : [];
      bars.forEach((bar, i) => {
        const value = Math.max(0, Math.min(1, values[i] || 0));
        const height = level < 0.012 ? 3 : Math.round(4 + value * 22);
        bar.style.height = height + "px";
        bar.style.opacity = String(level < 0.012 ? 0.5 : Math.max(0.55, 0.55 + value * 0.45));
      });
    }
  }

  renderIdleHead(root) {
    const head = root.createDiv({ cls: "lexvoice-outline-head" });
    this.renderTitleRow(head, "LexVoice");

    const controls = head.createDiv({ cls: "lexvoice-outline-controls" });

    const modeRow = controls.createDiv({ cls: "lexvoice-outline-control-row" });
    modeRow.createEl("span", { cls: "lexvoice-outline-control-label", text: "模式" });
    const modeSelect = modeRow.createEl("select", { cls: "dropdown" });
    const currentMode = getEffectivePolishMode(this.plugin.settings, this.plugin.settings.polishMode);
    for (const k of getVisiblePolishModeKeys(this.plugin.settings)) {
      const opt = modeSelect.createEl("option", { value: k, text: getModeMeta(this.plugin.settings, k).label });
      if (currentMode === k) opt.selected = true;
    }
    modeSelect.addEventListener("change", async () => {
      this.plugin.settings.polishMode = modeSelect.value;
      await this.plugin.saveSettings();
      this.scheduleUpdate();
    });

    // 扩展模式解锁后才显示专属上下文卡片
    if (isRecruitFeatureUnlocked(this.plugin.settings) && currentMode === "recruit") {
      this.renderRecruitContextCard(controls);
    }

    const capRow = controls.createDiv({ cls: "lexvoice-outline-control-row" });
    capRow.createEl("span", { cls: "lexvoice-outline-control-label", text: "音频输入" });
    const capSelect = capRow.createEl("select", { cls: "dropdown" });
    const capOpts = [
      ["mic", "仅麦克风"],
      ["mix-virtual", "麦克风 + 电脑音频（会议/讲解）"],
      ["virtualCable", "仅电脑音频（视频/课程）"],
    ];
    const currentInputMode = normalizeAudioInputMode(this.plugin.settings.captureMode || "mic");
    for (const [v, t] of capOpts) {
      const opt = capSelect.createEl("option", { value: v, text: t });
      if (currentInputMode === v) opt.selected = true;
    }
    capSelect.addEventListener("change", async () => {
      this.plugin.settings.captureMode = normalizeAudioInputMode(capSelect.value);
      await this.plugin.saveSettings();
      this.scheduleUpdate();
    });

    // 设备状态条：根据当前音频输入方式检测对应硬件，给出可见反馈
    const devStatus = controls.createDiv({ cls: "lexvoice-outline-device-status" });
    this.renderDeviceStatus(devStatus, currentInputMode);

    const actions = head.createDiv({ cls: "lexvoice-outline-actions" });
    const startBtn = actions.createEl("button", { text: "● 开始录音", cls: "mod-cta" });
    startBtn.onclick = () => this.plugin.startRecording();
    const importBtn = actions.createEl("button", { text: "导入音频" });
    importBtn.onclick = () => new ImportAudioModal(this.app, this.plugin).open();
  }

  renderSegments(root, session) {
    const segWrap = root.createDiv({ cls: "lexvoice-outline-section" });
    segWrap.createDiv({ cls: "lexvoice-outline-section-title", text: `段落 · ${session.segments.length}` });
    const list = segWrap.createDiv({ cls: "lexvoice-outline-segments" });
    session.segments.forEach((s) => {
      const row = list.createDiv({ cls: "lexvoice-outline-seg" });
      const dotCls = s.error ? "is-failed" : (s.text ? "is-done" : "is-pending");
      const dot = row.createDiv({ cls: `lexvoice-outline-seg-dot ${dotCls}` });
      dot.setAttribute("aria-label", s.error ? "失败" : (s.text ? "已转写" : "等待中"));
      const body = row.createDiv({ cls: "lexvoice-outline-seg-body" });
      body.createDiv({ cls: "lexvoice-outline-seg-time",
        text: `${formatElapsed(s.startOffsetMs)} – ${formatElapsed(s.endOffsetMs)}` });
      const preview = s.error
        ? `失败：${s.error}`
        : (s.text ? s.text.slice(0, 80) + (s.text.length > 80 ? "…" : "") : "等待转写");
      body.createDiv({ cls: "lexvoice-outline-seg-text", text: preview });
    });
  }

  renderAIOutline(root, session) {
    const aiWrap = root.createDiv({ cls: "lexvoice-outline-section" });
    const aiHead = aiWrap.createDiv({ cls: "lexvoice-outline-ai-head" });
    aiHead.createDiv({ cls: "lexvoice-outline-section-title", text: "大纲" });
    const refreshBtn = aiHead.createEl("button", { text: this.outlineRunning ? "生成中…" : "刷新" });
    refreshBtn.disabled = this.outlineRunning || !session || session.segments.length === 0;
    refreshBtn.onclick = () => this.refreshAIOutline();

    const body = aiWrap.createDiv({ cls: "lexvoice-outline-ai-body" });
    if (this.aiOutline) {
      const isRecruit = session && session.mode === "recruit";
      if (isRecruit) body.addClass("is-recruit-mode");
      obsidian.MarkdownRenderer.render(this.app, this.aiOutline, body, "", this);
      this.decorateOutlineSourceTags(body);
      Promise.resolve().then(() => this.decorateOutlineSourceTags(body));
      // 招聘面试模式：给含 🤖 / ⛏ / ❓ 的列表项打 class，由 CSS 区分视觉样式
      if (isRecruit) {
        // 渲染是同步的，但有时 MarkdownRenderer 会异步插入；保险起见 microtask 后再扫一次
        const tagListItems = () => {
          const lis = body.querySelectorAll("li");
          for (const li of lis) {
            const text = (li.textContent || "").trim();
            if (text.startsWith("🤖")) li.addClass("lexvoice-ai-eval");
            else if (text.startsWith("⛏")) li.addClass("lexvoice-ai-followup");
            else if (text.startsWith("❓")) li.addClass("lexvoice-ai-question");
          }
        };
        tagListItems();
        Promise.resolve().then(() => { tagListItems(); this.decorateOutlineSourceTags(body); });
      }
    } else {
      const tip = session && session.mode === "recruit"
        ? "点「刷新」生成面试大纲——按问题组织，含候选人回答要点 + 🤖 AI 评价 + ⛏ 追问建议。"
        : "点「刷新」生成大纲——把零散发言归并到共同的上层概念。";
      body.createEl("div", { text: session.segments.length > 0
        ? tip
        : "录音开始且产出第一段后可生成大纲。",
        cls: "lexvoice-outline-empty" });
    }
  }

  decorateOutlineSourceTags(body) {
    if (!body) return;
    const sourceDefs = {
      "麦克风": { cls: "is-mic", icon: "mic", title: "麦克风输入" },
      "电脑音频": { cls: "is-computer", icon: "monitor-speaker", title: "电脑音频输入" },
    };
    const findFirstTextNode = (node) => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let current;
      while ((current = walker.nextNode())) {
        if ((current.nodeValue || "").trim()) return current;
      }
      return null;
    };
    const listItems = body.querySelectorAll("li");
    for (const li of listItems) {
      if (Array.from(li.children || []).some((child) => child.classList && child.classList.contains("lexvoice-outline-source-chip"))) continue;
      const textNode = findFirstTextNode(li);
      if (!textNode) continue;
      const raw = textNode.nodeValue || "";
      const match = raw.match(/^(\s*)[\[【](麦克风|电脑音频)[\]】]\s*/);
      if (!match) continue;
      const def = sourceDefs[match[2]];
      if (!def) continue;
      textNode.nodeValue = raw.slice(match[0].length);
      const chip = document.createElement("span");
      chip.className = `lexvoice-outline-source-chip ${def.cls}`;
      chip.setAttribute("title", def.title);
      chip.setAttribute("aria-label", def.title);
      try { obsidian.setIcon(chip, def.icon); }
      catch { chip.textContent = match[2] === "麦克风" ? "M" : "C"; }
      li.insertBefore(chip, li.firstChild);
      li.addClass("lexvoice-outline-source-tagged");
    }
  }

  renderRecent(root) {
    const recents = getRecentNotes(this.plugin, 5);
    const sec = root.createDiv({ cls: "lexvoice-outline-section" });
    sec.createDiv({ cls: "lexvoice-outline-section-title", text: "最近" });
    if (recents.length === 0) {
      sec.createDiv({ cls: "lexvoice-outline-empty", text: "暂无录音笔记" });
      return;
    }
    const list = sec.createDiv({ cls: "lexvoice-outline-recent" });
    for (const r of recents) {
      const row = list.createDiv({ cls: "lexvoice-outline-recent-row" });
      row.addEventListener("click", async () => {
        try { await this.app.workspace.getLeaf(false).openFile(r.file); } catch (e) { console.error(e); }
      });
      const meta = MODE_META[r.mode] || MODE_META.off;
      const chip = row.createDiv({ cls: "lexvoice-outline-recent-chip" });
      chip.setText(meta.prefix);
      const body = row.createDiv({ cls: "lexvoice-outline-recent-body" });
      body.createDiv({ cls: "lexvoice-outline-recent-name", text: r.file.basename });
      body.createDiv({ cls: "lexvoice-outline-recent-meta", text: r.displayTime });
    }
  }

  async renderDeviceStatus(container, mode) {
    container.empty();
    container.createSpan({ text: "🔍 检测中…", cls: "lexvoice-device-status-loading" });
    let info;
    try {
      info = await enumerateAudioDevices();
    } catch (e) {
      container.empty();
      container.createSpan({ text: `⚠ 设备检测失败：${e.message || e}`, cls: "lexvoice-device-status-error" });
      return;
    }
    container.empty();

    mode = normalizeAudioInputMode(mode);
    const needMic    = mode === "mic" || mode === "mix-virtual";
    const needVirt   = mode === "virtualCable" || mode === "mix-virtual";

    const lines = [];
    if (needMic) {
      const realMic = info.mics.find(d => d.deviceId === this.plugin.settings.selectedMicrophoneDevice)
        || info.mics.find(d => d.deviceId === "default")
        || info.mics[0];
      if (realMic) {
        const label = realMic.label || "默认输入";
        lines.push({ ok: true, text: `🎙 麦克风：${label}`, title: `麦克风：${label}` });
      } else {
        lines.push({ ok: false, text: "🎙 麦克风：未检测到" });
      }
    }
    if (needVirt) {
      if (info.virtualCables.length > 0) {
        const v = info.virtualCables.find(d => d.deviceId === this.plugin.settings.selectedVirtualDevice) || info.virtualCables[0];
        const label = v.label || "未授权读取设备名";
        lines.push({ ok: true, text: `💻 电脑音频：${label}`, title: `电脑音频输入：${label}` });
      } else {
        lines.push({ ok: false, text: "💻 电脑音频：未检测到", title: "电脑音频输入：未检测到", action: "wizard" });
      }
    }
    if (info.permissionRequired) {
      lines.push({ ok: false, text: "⚠ 麦克风权限未授予，无法读取设备名", action: "perm" });
    }

    for (const line of lines) {
      const row = container.createDiv({ cls: `lexvoice-device-status-row ${line.ok ? "is-ok" : "is-warn"}` });
      const text = row.createSpan({ text: line.text });
      text.setAttr("title", line.title || line.text);
      if (line.action === "wizard") {
        const btn = row.createEl("button", { text: "电脑音频指引", cls: "lexvoice-device-status-btn" });
        btn.onclick = () => new VirtualCableSetupModal(this.app, this.plugin).open();
      } else if (line.action === "perm") {
        const btn = row.createEl("button", { text: "授权", cls: "lexvoice-device-status-btn" });
        btn.onclick = async () => {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            s.getTracks().forEach(t => t.stop());
            this.scheduleUpdate();
          } catch (e) {
            new obsidian.Notice("授权失败：" + (e.message || e));
          }
        };
      }
    }
  }

  renderRecruitContextCard(parent) {
    const ctx = this.plugin.settings.recruitContext || {};
    const card = parent.createDiv({ cls: "lexvoice-recruit-card" });
    const head = card.createDiv({ cls: "lexvoice-recruit-card-head" });
    const hasJd = !!(ctx.jd && ctx.jd.trim());
    const hasResume = !!(ctx.resume && ctx.resume.trim());
    const dot = head.createSpan({ cls: `lexvoice-recruit-card-dot ${hasJd ? "is-ok" : "is-warn"}` });
    const title = head.createSpan({ cls: "lexvoice-recruit-card-title" });
    if (hasJd) {
      const positionLabel = ctx.position || "（未命名岗位）";
      const candLabel = ctx.candidateName ? ` · ${ctx.candidateName}` : "";
      const roundLabel = ctx.round ? ` · ${ctx.round}` : "";
      title.setText(`📋 ${positionLabel}${candLabel}${roundLabel}`);
    } else {
      title.setText("未注入 JD 或简历");
    }
    const editBtn = head.createEl("button", { text: hasJd ? "编辑" : "立即设置", cls: "lexvoice-recruit-card-edit" });
    editBtn.onclick = () => {
      const modal = new RecruitContextModal(this.app, this.plugin, {
        onConfirm: () => this.scheduleUpdate(),
      });
      modal.open();
    };
    if (hasJd) {
      const meta = card.createDiv({ cls: "lexvoice-recruit-card-meta" });
      const flags = [];
      flags.push(hasResume ? "✓ 简历已填" : "○ 简历未填");
      if (ctx.seniority) flags.push(`资历：${ctx.seniority}`);
      if (ctx.interviewer) flags.push(`面试官：${ctx.interviewer}`);
      meta.setText(flags.join("，"));
    }
  }

  renderQueueInbox(root) {
    const queueN = this.plugin.queue ? this.plugin.queue.tasks.length : 0;
    if (queueN === 0) return;
    const sec = root.createDiv({ cls: "lexvoice-outline-queue-inbox" });
    sec.createDiv({ cls: "lexvoice-outline-queue-text", text: `${queueN} 个失败任务` });
    const btn = sec.createEl("button", { text: "打开队列" });
    btn.onclick = () => new QueueModal(this.app, this.plugin).open();
  }
  async refreshAIOutline(opts) {
    const silent = !!(opts && opts.silent);
    const session = this.plugin.session;
    if (!session || session.segments.length === 0) return;
    if (this.outlineRunning) { this.outlineQueued = true; return; }
    if (silent && session.segments.length === this.lastOutlineSegmentCount) return;
    this.outlineRunning = true;
    this.render();
    try {
      const transcript = session.segments.map(s => s.text || "").filter(Boolean).join("\n\n");
      if (!transcript.trim()) throw new Error("当前没有可整理的转写内容");
      const meta = getModeMeta(this.plugin.settings, session.mode);
      const sys = "你是结构化思考助手。任务不是复述，而是把零散的发言归并到共同的上一级概念之下。层级深度由材料决定，不预设。克制——不堆砌符号、不强加分析维度、不过度抽象。";
      const user = applyBriefingLanguageInstruction(buildOutlinePrompt(meta.prefix, session.mode, transcript, session.captureMode), this.plugin.settings);
      const result = await callLlm(this.plugin, sys, user);
      this.aiOutline = result;
      this.lastOutlineSegmentCount = session.segments.length;
      this.outlineErrorCount = 0;
    } catch (e) {
      console.error(e);
      this.outlineErrorCount = (this.outlineErrorCount || 0) + 1;
      if (!silent || this.outlineErrorCount === 1) {
        new obsidian.Notice(`大纲生成失败：${(e && e.message) || e}`);
      }
    } finally {
      this.outlineRunning = false;
      this.render();
      if (this.outlineQueued) {
        this.outlineQueued = false;
        if (this.plugin.session && this.plugin.session.segments.length > this.lastOutlineSegmentCount) {
          setTimeout(() => this.refreshAIOutline({ silent: true }), 200);
        }
      }
    }
  }
}

class LexVoicePlugin extends obsidian.Plugin {
  async onload() {
    await this.loadAll();
    this.recorder = new RecorderService(this);
    this.queue = new TaskQueue(this);
    this.queue.load(this.persistedQueue);
    this.session = null;

    this.ribbonEl = this.addRibbonIcon("mic", "LexVoice：点击开始/停止，悬停展开控件", () => this.toggleRecording());
    this.recorder.on(() => this.refreshOutlineView());

    this.registerView(VIEW_TYPE_OUTLINE, (leaf) => new OutlineView(leaf, this));
    this.addRibbonIcon("list-tree", "LexVoice 实时纪要面板", () => this.openOutlineView());

    this.bubble = new BubbleWidget(this);
    // 浮窗显隐与侧边栏（实时纪要面板）联动
    this.registerEvent(this.app.workspace.on("layout-change", () => this.syncBubbleVisibility()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.syncBubbleVisibility()));
    this.registerEvent(this.app.workspace.on("resize", () => this.syncBubbleVisibility()));
    this.app.workspace.onLayoutReady(() => this.syncBubbleVisibility());

    this.addCommand({ id: "toggle-recording", name: "开始/停止录音", callback: () => this.toggleRecording() });
    this.addCommand({ id: "pause-resume-recording", name: "暂停/继续录音", callback: () => {
      const s = this.recorder.state;
      if (s === "recording") this.recorder.pause(); else if (s === "paused") this.recorder.resume();
    }});
    this.addCommand({ id: "polish-selection-or-note", name: "AI 润色：当前选区或整篇", editorCallback: (editor) => this.polishEditor(editor) });
    this.addCommand({ id: "toggle-floating-ball", name: "显示/隐藏悬浮气泡（总开关）", callback: () => {
      this.settings.showFloatingBall = !this.settings.showFloatingBall;
      this.saveSettings();
      this.syncBubbleVisibility();
      new obsidian.Notice(this.settings.showFloatingBall ? "浮窗已启用（常驻显示，可拖动）" : "浮窗已关闭");
    }});
    this.addCommand({ id: "open-queue", name: "打开待处理队列", callback: () => new QueueModal(this.app, this).open() });
    this.addCommand({ id: "retry-queue-all", name: "重试所有失败任务", callback: () => this.retryQueue() });
    this.addCommand({ id: "import-audio", name: "导入已有音频文件转写+润色", callback: () => new ImportAudioModal(this.app, this).open() });
    this.addCommand({ id: "check-updates", name: "检查 LexVoice 更新", callback: () => this.checkForUpdates({ silent: false }) });
    this.addCommand({ id: "install-update", name: "安装 LexVoice 可用更新", callback: () => this.installAvailableUpdate() });
    this.addCommand({ id: "open-outline", name: "打开实时纪要面板", callback: () => this.openOutlineView() });
    this.addCommand({ id: "record-mic-only", name: "开始录音 · 仅麦克风", callback: () => { this._oneShotCaptureMode = "mic"; this.startRecording(); } });
    this.addCommand({ id: "record-mic-virtual", name: "开始录音 · 麦克风 + 电脑音频", callback: () => { this._oneShotCaptureMode = "mix-virtual"; this.startRecording(); } });
    this.addCommand({ id: "record-virtual-only", name: "开始录音 · 仅电脑音频", callback: () => { this._oneShotCaptureMode = "virtualCable"; this.startRecording(); } });

    this.settingTab = new LexVoiceSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    this.registerEvent(this.app.vault.on("create", (file) => {
      this.handleInboxFile(file).catch(e => console.error("[LexVoice] inbox handler error", e));
    }));

    this.addCommand({ id: "scan-inbox", name: "扫描收件箱并处理所有未处理文件", callback: () => this.scanInboxFolder() });
    this.addCommand({ id: "cleanup-empty-short-recordings", name: "清理空白短录音", callback: () => this.cleanupEmptyShortRecordings() });

    this.addCommand({
      id: "migrate-legacy-notes",
      name: "迁移历史笔记到新 frontmatter 结构",
      callback: () => {
        this.migrateLegacyNotes()
          .then(r => new obsidian.Notice(`迁移：补全 ${r.migrated} / 跳过 ${r.skipped} / 无法识别 ${r.noMode} / 失败 ${r.failed}`, 8000))
          .catch(e => new obsidian.Notice(`迁移失败：${e.message || e}`, 8000));
      },
    });

    this.addCommand({
      id: "regenerate-briefing-from-frontmatter",
      name: "重新整理当前纪要（应用 yaml 角色映射）",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const isMd = file instanceof obsidian.TFile && file.extension === "md";
        const mode = isMd ? this.detectModeFromMarkdown(file) : null;
        if (!isMd || !mode) return false;
        if (checking) return true;
        this.repolishMarkdownFile(file, mode);
        return true;
      },
    });

    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof obsidian.TFile)) return;
      const ext = (file.extension || "").toLowerCase();
      if (AUDIO_EXT.has(ext)) {
        menu.addSeparator();
        menu.addItem((item) => {
          item.setTitle("LexVoice：转写并润色")
            .setIcon("mic")
            .onClick(() => this.importAudioFiles([file.path]));
        });
      }
      if (ext === "md") {
        menu.addSeparator();
        // 一键重整：从 frontmatter 的 mode 自动识别
        const autoMode = this.detectModeFromMarkdown(file);
        if (autoMode) {
          menu.addItem((item) => {
            item.setTitle("LexVoice 重新整理")
              .setIcon("refresh-cw")
              .onClick(() => this.repolishMarkdownFile(file, autoMode));
          });
        }
        // 手动选模式（仅在自动识别可用时作为"换模式"备用；否则作为主入口）
        menu.addItem((item) => {
          item.setTitle(autoMode ? "LexVoice 换模式重整" : "LexVoice 重新整理")
            .setIcon("refresh-cw");
          const sub = item.setSubmenu();
        const modes = getVisibleModeEntries(this.settings, false);
        for (const [m, label] of modes) {
          sub.addItem((subItem) => {
            subItem.setTitle(label)
              .onClick(() => this.repolishMarkdownFile(file, m));
          });
        }
        });
      }
    }));

    this.registerEvent(this.app.workspace.on("files-menu", (menu, files) => {
      const audios = (files || []).filter((f) => f instanceof obsidian.TFile && AUDIO_EXT.has((f.extension || "").toLowerCase()));
      if (audios.length === 0) return;
      const paths = audios.map((f) => f.path);
      menu.addSeparator();
      menu.addItem((item) => {
        item.setTitle(`LexVoice：整合 ${audios.length} 段音频…`).setIcon("mic");
        const sub = item.setSubmenu();
        const modes = getVisibleModeEntries(this.settings, false);
        for (const [m, label] of modes) {
          const meta = getModeMeta(this.settings, m);
          sub.addItem((sub_i) => {
            sub_i.setTitle(`整合为${label}（${meta.prefix}模式）`)
              .setIcon("mic")
              .onClick(() => this.importAudioFiles(paths, m));
          });
        }
      });
    }));

    if (this.queue.tasks.length > 0) {
      new obsidian.Notice(`LexVoice：发现 ${this.queue.tasks.length} 个待处理任务，后台重试中…`);
      setTimeout(() => this.retryQueue(), 2500);
    }
    this.app.workspace.onLayoutReady(() => this.checkForUpdatesOnStartup());
  }

  async onunload() {
    try { if (this.recorder && this.recorder.state !== "idle") await this.recorder.stop(); } catch {}
    if (this.bubble) this.bubble.unmount();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_OUTLINE);
  }

  async loadAll() {
    const saved = (await this.loadData()) || {};
    this.settings = normalizeLexVoiceSettings(saved);
    this.persistedQueue = extractLexVoiceJobItems(saved);
    // schema 升级：data.json 不带 schemaVersion 或低于当前版本时，
    // 立即写回新格式，避免长期保留旧平铺字段。
    const savedVersion = (saved && typeof saved === "object" && Number.isFinite(saved.schemaVersion))
      ? saved.schemaVersion
      : 0;
    let shouldSave = savedVersion !== SETTINGS_SCHEMA_VERSION;
    try {
      if (await this.migrateDefaultVocabularyFileLocation(saved)) shouldSave = true;
    } catch (e) {
      console.warn("[LexVoice] vocabulary location migrate failed", e);
    }
    if (shouldSave) {
      try { await this.saveAll(); } catch (e) { console.warn("[LexVoice] schema migrate failed", e); }
    }
  }
  async saveAll() {
    await this.saveData({
      settings: serializeLexVoiceSettings(this.settings),
      backgroundJobs: {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        items: this.queue ? this.queue.snapshot() : (this.persistedQueue || []),
      },
    });
  }
  async saveSettings() { await this.saveAll(); }

  async migrateDefaultVocabularyFileLocation(savedData) {
    const saved = isRecord(savedData) ? savedData : {};
    const raw = isRecord(saved.settings) ? saved.settings : saved;
    const vocabulary = raw.vocabulary || {};
    const savedPath = pickDefined(vocabulary.notePath, raw.vocabularyFile, "");
    const normSaved = obsidian.normalizePath(savedPath || "");
    const usesLegacyDefault = !normSaved || normSaved.toLowerCase() === LEGACY_VOCABULARY_FILE.toLowerCase();
    if (!usesLegacyDefault) return false;

    const oldPath = obsidian.normalizePath(LEGACY_VOCABULARY_FILE);
    const newPath = obsidian.normalizePath(DEFAULT_SETTINGS.vocabularyFile);
    let changed = this.settings.vocabularyFile !== newPath;
    this.settings.vocabularyFile = newPath;

    const oldFile = this.app.vault.getAbstractFileByPath(oldPath);
    const newFile = this.app.vault.getAbstractFileByPath(newPath);
    if (oldFile instanceof obsidian.TFile && !(newFile instanceof obsidian.TFile)) {
      const folderPath = newPath.includes("/") ? newPath.slice(0, newPath.lastIndexOf("/")) : "";
      if (folderPath) await this.ensureFolder(folderPath);
      await this.app.fileManager.renameFile(oldFile, newPath);
      changed = true;
    }
    const targetFile = this.app.vault.getAbstractFileByPath(newPath);
    if (targetFile instanceof obsidian.TFile) {
      const content = await this.app.vault.cachedRead(targetFile);
      if (!isStructuredVocabularyMarkdown(content)) {
        await this.app.vault.modify(targetFile, formatVocabularyMarkdown(parseVocabularyGroups(content), this.settings.industryProfile));
        changed = true;
      }
    }
    return changed;
  }

  getTranscribeProviderProfile(id, provider) {
    const profiles = {
      siliconflow: {
        title: "硅基流动",
        badge: "云端转写",
        transcribeMode: "segmented",
        requiresKey: true,
        endpointPlaceholder: "https://api.siliconflow.cn/v1/audio/transcriptions",
        modelPlaceholder: "FunAudioLLM/SenseVoiceSmall",
        languagePlaceholder: "auto",
        endpointHelp: "硅基流动的音频转写服务地址。通常保持默认即可。",
        keyHelp: "从硅基流动控制台复制访问密钥。密钥只保存在当前 vault 的 LexVoice 设置中。",
        modelHelp: "推荐 FunAudioLLM/SenseVoiceSmall（SenseVoiceSmall）。当前模型页显示：在线推理价格 ¥0.000000/K UTF-8 bytes，Rate Limits 暂不限制；低延迟，支持 50+ 语种，中文和粤语识别表现较好。价格与限流可能调整，请以硅基流动控制台模型页为准。",
        description: "OpenAI 兼容的音频转写接口。LexVoice 会按设定的分段间隔切段上传。",
        priceHint: "FunAudioLLM/SenseVoiceSmall 当前显示为免费 ASR 模型（¥0/K UTF-8 bytes，Rate Limits 暂不限制）；平台规则可能调整。",
        steps: ["注册或登录硅基流动账号", "在控制台创建访问密钥", "确认服务地址和模型名称后运行连通性测试"],
        links: [
          ["访问密钥", "https://cloud.siliconflow.cn/account/ak"],
          ["转写文档", "https://docs.siliconflow.cn/cn/api-reference/audio/create-audio-transcriptions"],
        ],
      },
      openai: {
        title: "OpenAI（切片转写）",
        badge: "云端转写",
        transcribeMode: "segmented",
        requiresKey: true,
        endpointPlaceholder: "https://api.openai.com/v1/audio/transcriptions",
        modelPlaceholder: "gpt-4o-transcribe",
        languagePlaceholder: "",
        endpointHelp: "OpenAI 的音频转写服务地址。需要可访问 OpenAI API 的网络环境。",
        keyHelp: "填写 OpenAI 项目的访问密钥。",
        modelHelp: "推荐 gpt-4o-transcribe（HTTP 切片）。如果需要边说边出字幕，请改用「OpenAI Realtime · 语音转写」。",
        description: "OpenAI 兼容的音频转写接口。LexVoice 会按设定的分段间隔切段上传。",
        priceHint: "gpt-4o-transcribe ≈ $6/百万音频 token。",
        steps: ["确认 OpenAI API 账户可用", "填写访问密钥", "运行连通性测试"],
        links: [["OpenAI 密钥", "https://platform.openai.com/api-keys"]],
      },
      "openai-realtime": {
        title: "OpenAI Realtime · 语音转写",
        badge: "流式实时",
        transcribeMode: "streaming",
        streamProtocol: "openai-realtime-transcription",
        requiresKey: true,
        endpointPlaceholder: "wss://api.openai.com/v1/realtime",
        modelPlaceholder: "gpt-realtime-whisper",
        languagePlaceholder: "（可留空，自动检测）",
        endpointHelp: "OpenAI Realtime 的 WebSocket 地址。保持默认即可。",
        keyHelp: "OpenAI 项目的访问密钥（与切片转写共用同一把 Key）。",
        modelHelp: "推荐 gpt-realtime-whisper（流式 ASR，专为实时字幕/会议记录设计）。",
        description: "流式 ASR，边说边出文字。LexVoice 跳过分段切片，整场录音走一条 WebSocket 实时推流（PCM 24kHz mono），延迟约 200–500 ms。",
        priceHint: "gpt-realtime-whisper ≈ $0.017 / 分钟 ≈ ¥7.2 / 小时。",
        steps: ["确认 OpenAI API 账户可用且能访问 Realtime API", "填写访问密钥", "保持模型名 gpt-realtime-whisper", "选「仅麦克风」捕获模式开始录音"],
        links: [
          ["OpenAI 密钥", "https://platform.openai.com/api-keys"],
          ["Realtime 文档", "https://developers.openai.com/api/docs/guides/realtime-transcription"],
        ],
        note: "流式模式下「分段间隔」「即时分段」设置不生效；笔记会在录音过程中实时追加文字。",
      },
      "openai-realtime-translate": {
        title: "OpenAI Realtime · 语音翻译",
        badge: "流式翻译",
        transcribeMode: "streaming",
        streamProtocol: "openai-realtime-translation",
        requiresKey: true,
        endpointPlaceholder: "wss://api.openai.com/v1/realtime/translations",
        modelPlaceholder: "gpt-realtime-translate",
        languagePlaceholder: "",
        endpointHelp: "OpenAI Realtime Translations 的 WebSocket 基础地址。模型名会自动追加为查询参数。",
        keyHelp: "OpenAI 项目的访问密钥。",
        modelHelp: "推荐 gpt-realtime-translate（70+ 语言输入 → 13 语言输出，由专业口译员录音训练）。",
        description: "流式语音翻译。自动检测说话者语言，实时输出译文+原文双轨笔记。模型同时返回译音流（LexVoice 自动丢弃，仅保留文字）。",
        priceHint: "gpt-realtime-translate ≈ $0.034 / 分钟 ≈ ¥14.4 / 小时。",
        steps: [
          "确认 OpenAI API 账户可用且能访问 Realtime API",
          "填写访问密钥",
          "在「目标语言」中选择需要的输出语言",
          "选「仅麦克风」捕获模式开始录音",
        ],
        links: [
          ["OpenAI 密钥", "https://platform.openai.com/api-keys"],
          ["Realtime 翻译文档", "https://developers.openai.com/api/docs/guides/realtime-translation"],
        ],
        note: "支持的目标语言：英语 (en)、中文 (zh)、日语 (ja)、韩语 (ko)、法语 (fr)、西班牙语 (es)、德语 (de)、意大利语 (it)、葡萄牙语 (pt)、俄语 (ru)、阿拉伯语 (ar)、印地语 (hi)、土耳其语 (tr)。",
        showTargetLanguage: true,
      },
      dashscope: {
        title: "阿里云百炼 Paraformer Realtime",
        badge: "流式实时",
        transcribeMode: "streaming",
        streamProtocol: "dashscope-ws",
        requiresKey: true,
        endpointPlaceholder: "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
        modelPlaceholder: "paraformer-realtime-v2",
        languagePlaceholder: "",
        endpointHelp: "Paraformer Realtime 的 WebSocket 地址。保持默认即可。",
        keyHelp: "百炼控制台的 API Key。仅保存在本地 vault 的 LexVoice 设置中。",
        modelHelp: "推荐 paraformer-realtime-v2（中英混合）；电话场景可用 paraformer-realtime-8k-v2。",
        description: "流式 ASR，边说边出文字。LexVoice 跳过分段切片，整场录音走一条 WebSocket 实时推流（PCM 16kHz mono），延迟约 200–600 ms。无需中转。",
        priceHint: "Paraformer Realtime ≈ ¥3.6 / 小时（国内最便宜）。",
        steps: ["在百炼控制台创建 API Key", "保持默认服务地址和模型名", "选「仅麦克风」捕获模式，开始录音即可"],
        links: [
          ["访问密钥", "https://help.aliyun.com/zh/model-studio/developer-reference/get-api-key"],
          ["Paraformer Realtime 文档", "https://help.aliyun.com/zh/model-studio/paraformer-realtime-api"],
        ],
        note: "流式模式下「分段间隔」「即时分段」设置不生效；笔记会在录音过程中实时追加文字。",
      },
      local: {
        title: "本地转写服务",
        badge: "本地服务",
        transcribeMode: "segmented",
        requiresKey: false,
        endpointPlaceholder: "http://127.0.0.1:8000/v1/audio/transcriptions",
        modelPlaceholder: "whisper-large-v3",
        languagePlaceholder: "zh",
        endpointHelp: "填写本地转写服务的 HTTP 地址。服务需要接收音频文件上传，并返回 text。",
        keyHelp: "多数本地服务可留空；如果服务要求鉴权，再填约定的密钥或令牌。",
        modelHelp: "模型名称由本地服务决定，例如 whisper-large-v3、whisper-large-v3-turbo、SenseVoiceSmall。",
        description: "适合隐私优先或离线工作流。LexVoice 不负责下载模型或启动服务，只负责把音频发送给你已经启动的本地转写服务。",
        priceHint: "免费（消耗本机 GPU/CPU）。",
        steps: ["安装并启动本地转写服务", "确认服务能接收音频上传并返回 text", "填写服务地址、模型名称后运行连通性测试"],
        links: [
          ["Xinference 文档", "https://inference.readthedocs.io/en/latest/models/model_abilities/audio.html"],
          ["whisper.cpp", "https://github.com/ggml-org/whisper.cpp"],
        ],
      },
      custom: {
        title: "其他转写服务",
        badge: "高级",
        transcribeMode: "segmented",
        requiresKey: false,
        endpointPlaceholder: "https://your-domain.example/v1/audio/transcriptions",
        modelPlaceholder: "your-transcribe-model",
        languagePlaceholder: "",
        endpointHelp: "填写第三方或自建转写服务地址。服务需要接收音频文件上传，并返回 text。",
        keyHelp: "按你的服务要求填写；不需要鉴权时可留空。",
        modelHelp: "按你的服务支持的模型名称填写。",
        description: "适合企业内部网关、自建转写服务或其他第三方转写服务。",
        priceHint: "",
        steps: ["确认服务能接收音频文件上传", "确认响应中包含 text 字段", "保存后运行连通性测试"],
        links: [],
      },
    };
    const base = profiles[id] || profiles.custom;
    const title = id === "custom" && provider && provider.name ? provider.name : base.title;
    return Object.assign({}, base, { title });
  }

  getActiveTranscribeProfile() {
    const id = this.settings.activeTranscribeProvider || "siliconflow";
    const provider = (this.settings.transcribeProviders || {})[id] || {};
    return this.getTranscribeProviderProfile(id, provider);
  }

  makeStreamingNoteUpdater(session) {
    let scheduled = false;
    let lastWritten = "";
    const flush = async () => {
      scheduled = false;
      if (!session || session.finalized) return;
      const text = session.streamingFullText || "";
      if (text === lastWritten) return;
      lastWritten = text;
      try {
        await this.upsertLiveTranscriptBlock(session.mdPath, session.id, text);
      } catch (e) { console.error("[LexVoice] live update failed", e); }
    };
    return () => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(flush, 1500);
    };
  }

  async upsertLiveTranscriptBlock(mdPath, sessionId, text) {
    const file = this.app.vault.getAbstractFileByPath(mdPath);
    if (!(file instanceof obsidian.TFile)) return;
    const startMarker = `<!-- lv-live-start:${sessionId} -->`;
    const endMarker = `<!-- lv-live-end:${sessionId} -->`;
    const safe = (text || "").trim().split("\n").map(l => "> " + l).join("\n");
    const body = safe || "> _（等待说话…）_";
    const block = `${startMarker}\n> [!quote]+ 实时转写中…\n${body}\n${endMarker}`;
    const cur = await this.app.vault.read(file);
    const startIdx = cur.indexOf(startMarker);
    const endIdx = cur.indexOf(endMarker);
    if (startIdx >= 0 && endIdx > startIdx) {
      const next = cur.slice(0, startIdx) + block + cur.slice(endIdx + endMarker.length);
      if (next !== cur) await this.app.vault.modify(file, next);
      return;
    }
    const segEnd = `<!-- lexvoice-segments-end:${sessionId} -->`;
    const segIdx = cur.indexOf(segEnd);
    if (segIdx >= 0) {
      const next = cur.slice(0, segIdx) + block + "\n" + cur.slice(segIdx);
      await this.app.vault.modify(file, next);
    }
  }

  async removeLiveTranscriptBlock(mdPath, sessionId) {
    const file = this.app.vault.getAbstractFileByPath(mdPath);
    if (!(file instanceof obsidian.TFile)) return;
    const startMarker = `<!-- lv-live-start:${sessionId} -->`;
    const endMarker = `<!-- lv-live-end:${sessionId} -->`;
    const cur = await this.app.vault.read(file);
    const startIdx = cur.indexOf(startMarker);
    const endIdx = cur.indexOf(endMarker);
    if (startIdx < 0 || endIdx < 0) return;
    const next = cur.slice(0, startIdx).replace(/\n+$/, "") + cur.slice(endIdx + endMarker.length).replace(/^\n+/, "\n");
    await this.app.vault.modify(file, next);
  }


  openSettings(tabId = "home") {
    if (this.settingTab) this.settingTab.activeTab = tabId;
    const setting = this.app.setting;
    if (!setting) return;
    setting.open();
    if (typeof setting.openTabById === "function") {
      setting.openTabById(this.manifest.id);
    }
    if (this.settingTab) {
      setTimeout(() => {
        this.settingTab.activeTab = tabId;
        this.settingTab.display();
      }, 0);
    }
  }

  getUpdateRawBase() {
    return resolveUpdateRawBase(this.settings);
  }

  checkForUpdatesOnStartup() {
    if (!this.settings.autoCheckUpdates) return;
    if (!this.getUpdateRawBase()) return;
    const last = Date.parse(this.settings.lastUpdateCheckAt || "");
    if (last && Date.now() - last < UPDATE_CHECK_INTERVAL_MS) return;
    setTimeout(() => {
      this.checkForUpdates({ silent: true }).catch(e => console.warn("[LexVoice] update check failed", e));
    }, 4000);
  }

  async checkForUpdates(options = {}) {
    const silent = !!options.silent;
    const rawBase = this.getUpdateRawBase();
    if (!rawBase) {
      if (!silent) new obsidian.Notice("LexVoice 更新源未解析成功，请确认插件文件完整。", 8000);
      return null;
    }

    const manifestUrl = joinUpdateUrl(rawBase, "manifest.json");
    try {
      const remoteManifest = await fetchUpdateJson(manifestUrl + "?t=" + Date.now());
      if (!remoteManifest || remoteManifest.id !== this.manifest.id) {
        throw new Error("远端 manifest id 与当前插件不一致，已停止更新。");
      }
      const currentVersion = this.manifest.version || "0.0.0";
      const remoteVersion = remoteManifest.version || "0.0.0";
      const info = {
        version: remoteVersion,
        currentVersion,
        rawBaseUrl: rawBase,
        manifestUrl,
        checkedAt: new Date().toISOString(),
        files: UPDATE_PLUGIN_FILES.slice(),
      };
      this.settings.lastUpdateCheckAt = info.checkedAt;
      this.settings.lastUpdateError = "";

      if (compareVersions(remoteVersion, currentVersion) > 0) {
        this.settings.availableUpdate = info;
        await this.saveSettings();
        new obsidian.Notice("LexVoice：发现新版本 " + remoteVersion + "（当前 " + currentVersion + "）。可在设置 > 更新 中一键增量更新。", silent ? 12000 : 8000);
        return info;
      }

      this.settings.availableUpdate = null;
      await this.saveSettings();
      if (!silent) new obsidian.Notice("LexVoice 已是最新版本（" + currentVersion + "）。");
      return null;
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      this.settings.lastUpdateCheckAt = new Date().toISOString();
      this.settings.lastUpdateError = msg;
      await this.saveSettings();
      if (!silent) new obsidian.Notice("LexVoice 更新检查失败：" + msg, 10000);
      else console.warn("[LexVoice] update check failed", e);
      return null;
    }
  }

  async installAvailableUpdate() {
    let info = this.settings.availableUpdate;
    if (!info || !info.rawBaseUrl || compareVersions(info.version, this.manifest.version) <= 0) {
      info = await this.checkForUpdates({ silent: false });
    }
    if (!info || !info.rawBaseUrl) return;

    const adapter = this.app.vault.adapter;
    const basePath = pluginBasePath(this);
    const backupDir = basePath + "/.lexvoice-update-backups/" + updateBackupStamp();
    await ensureAdapterFolder(adapter, backupDir);

    const filesToBackup = UPDATE_PLUGIN_FILES.concat(["data.json"]);
    for (const fileName of filesToBackup) {
      const target = basePath + "/" + fileName;
      if (await adapter.exists(target)) {
        await adapter.write(backupDir + "/" + fileName, await adapter.read(target));
      }
    }

    const changed = [];
    const skipped = [];
    for (const fileName of UPDATE_PLUGIN_FILES) {
      const target = basePath + "/" + fileName;
      try {
        const next = await fetchUpdateText(joinUpdateUrl(info.rawBaseUrl, fileName) + "?t=" + Date.now());
        const current = (await adapter.exists(target)) ? await adapter.read(target) : "";
        if (current === next) {
          skipped.push(fileName);
          continue;
        }
        await adapter.write(target, next);
        changed.push(fileName);
      } catch (e) {
        if (fileName === "README.md") {
          skipped.push(fileName);
          continue;
        }
        throw new Error("更新 " + fileName + " 失败：" + ((e && e.message) || e));
      }
    }

    this.settings.installedUpdateVersion = info.version;
    this.settings.availableUpdate = null;
    this.settings.lastUpdateError = "";
    await this.saveSettings();

    const changedText = changed.length ? changed.join("、") : "无文件变化";
    const skippedText = skipped.length ? "；跳过 " + skipped.join("、") : "";
    new obsidian.Notice("LexVoice 已安装 " + info.version + "：更新 " + changedText + skippedText + "。请重启 Obsidian 或重新启用插件生效。", 12000);
  }

  refreshOutlineView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_OUTLINE);
    for (const leaf of leaves) {
      const v = leaf.view;
      if (!v) continue;
      // 优先走节流通道；旧实例兜底直调 render
      if (typeof v.scheduleUpdate === "function") v.scheduleUpdate();
      else if (typeof v.render === "function") v.render();
    }
  }

  scheduleRealtimeOutline() {
    if (this.outlineRefreshTimer) clearTimeout(this.outlineRefreshTimer);
    const delay = Math.max(500, this.settings.realtimeOutlineDebounceMs || 1500);
    this.outlineRefreshTimer = window.setTimeout(() => {
      this.outlineRefreshTimer = null;
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_OUTLINE);
      for (const leaf of leaves) {
        const v = leaf.view;
        if (v && typeof v.refreshAIOutline === "function") {
          v.refreshAIOutline({ silent: true });
        }
      }
    }, delay);
  }

  async openOutlineView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_OUTLINE);
    if (existing.length) {
      this.app.workspace.revealLeaf(existing[0]);
      this.syncBubbleVisibility();
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE_OUTLINE, active: true });
    this.app.workspace.revealLeaf(leaf);
    this.syncBubbleVisibility();
  }

  // 判断实时纪要面板是否真正在 viewport 中可见
  // 三种"不可见"情况都要识别：
  //   1. leaf 不存在
  //   2. leaf 存在但所在侧边栏被折叠 (rightSplit.collapsed)
  //   3. leaf 存在且侧边栏展开，但用户切到了同侧边栏的其他 tab（leaf 未激活）
  isOutlineVisible() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_OUTLINE);
    if (!leaves.length) return false;
    for (const leaf of leaves) {
      const view = leaf.view;
      if (!view) continue;
      const el = view.containerEl;
      if (!el) continue;
      // 真正的可见性判断：元素被渲染且占有空间
      // 任何情况下被隐藏（display:none / 0 高度 / 0 宽度）都返回 0
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return true;
    }
    return false;
  }

  // 停靠式悬浮窗：只受总开关控制，不再依赖实时面板或侧边栏是否可见。
  syncBubbleVisibility() {
    if (!this.bubble) return;
    const visible = !!this.settings.showFloatingBall;
    if (visible && !this.bubble.wrapEl) {
      this.bubble.mount(this.ribbonEl);
    } else if (!visible && this.bubble.wrapEl) {
      this.bubble.unmount();
    } else if (visible && this.bubble.wrapEl) {
      this.bubble.show();
      this.bubble.keepInViewport();
      this.bubble.updateDockTail();
    }
  }

  async toggleRecording() {
    if (this.recorder.state === "idle") await this.startRecording();
    else await this.stopRecording();
  }

  async startRecording() {
    if (this.recorder.state !== "idle") return;
    // 招聘面试模式：先弹 RecruitContextModal 让用户注入 JD/简历，再开始录音
    const mode = getEffectivePolishMode(this.settings, this._oneShotPolishMode || this.settings.polishMode);
    if (mode === "recruit" && this.settings.recruitAlwaysAskOnStart && !this._skipRecruitPrompt) {
      const result = await new Promise((resolve) => {
        const modal = new RecruitContextModal(this.app, this, {
          onConfirm: (action, ctx) => resolve({ action, ctx }),
        });
        modal.open();
      });
      if (result.action === "cancel") {
        return; // 用户关掉了 modal，不开录音
      }
      if (result.action === "skip") {
        // 用户主动选了"跳过"，不注入但继续录音
        this._currentRecruitContext = null;
      } else {
        this._currentRecruitContext = result.ctx;
      }
    }
    try {
      await this.ensureFolder(this.settings.audioFolder);
      await this.ensureFolder(this.settings.mdFolder);
      const moment = window.moment;
      const startedAt = moment();
      const sessionStamp = startedAt.format("YYYYMMDD-HHmmss");
      const mdName = startedAt.format(this.settings.noteFileNameFormatNew);
      const mdPath = obsidian.normalizePath(`${this.settings.mdFolder}/${mdName}.md`);

      const meta = getModeMeta(this.settings, mode);
      this.session = {
        id: genId(),
        sessionStamp,
        startedAt: startedAt.toDate().toISOString(),
        mdPath,
        mode,
        segments: [],
        writeQueue: Promise.resolve(),
        finalized: false,
        recruitContext: this._currentRecruitContext || null,
        captureMode: normalizeAudioInputMode(this._oneShotCaptureMode || this.settings.captureMode || "mic"),
      };
      this._currentRecruitContext = null;

      const titleLine = `# ${meta.emoji} ${startedAt.format("YYYY-MM-DD HH:mm")} · ${meta.prefix}（录音中…）`;
      const header = [
        titleLine,
        "",
        `> [!info] 录音信息`,
        `> 开始：${startedAt.format("YYYY-MM-DD HH:mm:ss")} · 模式：${meta.prefix} · 分段：${this.settings.enableInterimOutput ? this.settings.segmentIntervalMinutes + " 分钟" : "否"}`,
        "",
        `<!-- lexvoice-session:${this.session.id} -->`,
        `<!-- lexvoice-segments-start:${this.session.id} -->`,
        `<!-- lexvoice-segments-end:${this.session.id} -->`,
        "",
      ].join("\n");
      await this.appendToNote(mdPath, header);

      const activeProviderId = this.settings.activeTranscribeProvider || "siliconflow";
      const activeProvider = (this.settings.transcribeProviders || {})[activeProviderId] || {};
      const activeProfile = this.getActiveTranscribeProfile();
      const isStreaming = activeProfile && activeProfile.transcribeMode === "streaming";

      const segmentDurationMs = isStreaming
        ? 0
        : (this.settings.enableInterimOutput
          ? Math.max(30, Math.floor(this.settings.segmentIntervalMinutes * 60)) * 1000
          : 0);

      const sessionRef = this.session;
      const oneShotMode = this._oneShotCaptureMode;
      const requestedCaptureMode = oneShotMode || this.settings.captureMode || "mic";
      const captureMode = normalizeAudioInputMode(requestedCaptureMode);
      sessionRef.captureMode = captureMode;
      this._oneShotCaptureMode = null;
      if (!oneShotMode && this.settings.captureMode !== captureMode) {
        this.settings.captureMode = captureMode;
        await this.saveSettings();
      }

      let onStreamReady = null;
      if (isStreaming) {
        onStreamReady = async (mediaStream) => {
          const sampleRate = activeProfile.streamProtocol && activeProfile.streamProtocol.startsWith("openai-realtime") ? 24000 : 16000;
          const client = createStreamingTranscriptionClient(activeProfile, activeProvider, {
            onPartial: (fullText, isFinal) => {
              sessionRef.streamingFullText = fullText || "";
              if (sessionRef.scheduleStreamingNoteUpdate) sessionRef.scheduleStreamingNoteUpdate();
            },
            onError: (e) => {
              console.error("[LexVoice] streaming error", e);
              new obsidian.Notice(`流式转写错误：${(e && e.message) || e}`);
            },
            onClosed: (info) => {
              if (info && info.translatedText) sessionRef.streamingTranslatedText = info.translatedText;
              if (info && info.sourceText) sessionRef.streamingSourceText = info.sourceText;
            },
          });
          sessionRef.streamingClient = client;
          sessionRef.scheduleStreamingNoteUpdate = this.makeStreamingNoteUpdater(sessionRef);
          try {
            await client.connect();
          } catch (e) {
            console.error("[LexVoice] streaming connect failed", e);
            new obsidian.Notice(`流式转写连接失败：${(e && e.message) || e}`);
            sessionRef.streamingClient = null;
            return;
          }
          const encoder = new PcmStreamEncoder(mediaStream, {
            sampleRate,
            onFrame: (ab) => client.sendAudioFrame(ab),
          });
          encoder.start();
          sessionRef.pcmEncoder = encoder;
        };
      }

      await this.recorder.start({
        segmentDurationMs,
        captureMode,
        onSegment: (seg) => this.handleSegment(sessionRef, seg),
        onStreamReady,
      });
      if (this.settings.autoOpenOutlineOnRecord) {
        try { await this.openOutlineView(); } catch (e) { console.error("[LexVoice] auto-open outline failed", e); }
      }
      const modeLabel = audioInputModeLabel(captureMode);
      const noticeText = isStreaming
        ? `🎙 录音中（${modeLabel}），${activeProfile.title || "流式服务"} 实时转写中`
        : (this.settings.enableInterimOutput
          ? `🎙 录音中（${modeLabel}），每 ${this.settings.segmentIntervalMinutes} 分钟即时转写`
          : `🎙 录音中（${modeLabel}），停止时统一处理`);
      new obsidian.Notice(noticeText);
    } catch (e) {
      console.error(e);
      new obsidian.Notice(`无法开始录音：${(e && e.message) || e}`);
    }
  }

  async stopRecording() {
    if (this.recorder.state === "idle") return;
    new obsidian.Notice("⏹ 已请求停止，处理最后一段…");
    await this.recorder.stop();
  }

  shouldFilterShortRecording(session, seg) {
    if (!session || !seg || !seg.isFinal) return false;
    if (this.settings.filterShortRecordings === false) return false;
    if (session.segments && session.segments.length) return false;
    const totalMs = Math.max(0, Number(seg.endOffsetMs) || 0);
    return totalMs < SHORT_RECORDING_FILTER_MS;
  }

  async closeStreamingForDiscard(session) {
    if (!session) return;
    if (session.pcmEncoder) {
      try { session.pcmEncoder.stop(); } catch {}
      session.pcmEncoder = null;
    }
    if (session.streamingClient) {
      try {
        if (typeof session.streamingClient._safeClose === "function") session.streamingClient._safeClose();
        else if (typeof session.streamingClient.finish === "function") await session.streamingClient.finish();
      } catch (e) {
        console.warn("[LexVoice] close streaming client for discard failed", e);
      }
      session.streamingClient = null;
    }
    try { await this.removeLiveTranscriptBlock(session.mdPath, session.id); } catch {}
  }

  async discardFilteredShortSession(session) {
    await this.closeStreamingForDiscard(session);
    const file = this.app.vault.getAbstractFileByPath(session.mdPath);
    if (!(file instanceof obsidian.TFile)) return;
    const cur = await this.app.vault.read(file);
    const sessMarker = `<!-- lexvoice-session:${session.id} -->`;
    const endMarker = `<!-- lexvoice-segments-end:${session.id} -->`;
    const sessIdx = cur.indexOf(sessMarker);
    const endIdx = cur.indexOf(endMarker);
    if (sessIdx < 0 || endIdx < sessIdx) return;
    const headerLineIdx = cur.lastIndexOf("\n## ", sessIdx);
    const h1LineIdx = cur.lastIndexOf("\n# ", sessIdx);
    const startIdx = Math.max(headerLineIdx, h1LineIdx);
    const blockStart = startIdx >= 0 ? startIdx + 1 : 0;
    const blockEnd = endIdx + endMarker.length;
    const before = cur.slice(0, blockStart).replace(/\n+$/, "\n");
    const after = cur.slice(blockEnd).replace(/^\n+/, "");
    const next = before + (after ? "\n" + after : "");
    if (!next.trim()) await this.app.vault.delete(file);
    else if (next !== cur) await this.app.vault.modify(file, next);
  }

  handleSegment(session, seg) {
    if (!session) return;
    session.writeQueue = session.writeQueue.then(() => this.processSegment(session, seg));
    if (seg.isFinal) session.writeQueue = session.writeQueue.then(() => this.finalizeSession(session));
    return session.writeQueue;
  }

  async processSegment(session, seg) {
    if (!session) return;
    if (this.shouldFilterShortRecording(session, seg)) {
      session.filteredShortRecording = true;
      session.filteredDurationMs = Math.max(0, Number(seg.endOffsetMs) || 0);
      await this.closeStreamingForDiscard(session);
      return;
    }
    const segNumber = seg.index + 1;
    const audioName = `lex-${session.sessionStamp}-seg${pad(segNumber)}.${seg.ext}`;
    const audioPath = obsidian.normalizePath(`${this.settings.audioFolder}/${audioName}`);

    try {
      const ab = await seg.blob.arrayBuffer();
      await this.app.vault.createBinary(audioPath, ab);
    } catch (e) {
      console.error(e);
      new obsidian.Notice(`段${segNumber} 音频写入失败：${(e && e.message) || e}`);
    }

    let text = ""; let err = null;
    const activeProfile = this.getActiveTranscribeProfile();
    const isStreamingProvider = activeProfile && activeProfile.transcribeMode === "streaming";
    if (session.streamingClient) {
      // 流式转写：跳过 HTTP 切片转写，等流式客户端 finish 后取累计文本
      try {
        if (session.pcmEncoder) { try { session.pcmEncoder.stop(); } catch {} session.pcmEncoder = null; }
        await session.streamingClient.finish();
        text = session.streamingClient.getFullText() || session.streamingFullText || "";
      } catch (e) {
        err = e;
        console.error("[LexVoice] streaming finish failed", e);
        text = session.streamingFullText || "";
      }
      try { await this.removeLiveTranscriptBlock(session.mdPath, session.id); } catch {}
      session.streamingClient = null;
    } else if (isStreamingProvider) {
      // 流式服务但客户端连接失败：保留音频但不做 HTTP 切片转写（端点是 wss://，HTTP 必失败）
      err = new Error("流式转写连接未建立，请检查 API Key 与网络后重新录音。");
      console.error("[LexVoice]", err.message);
    } else {
      try {
        text = await transcribeAudio(this, seg.blob, seg.blob.type);
      } catch (e) { err = e; console.error(e); }
    }

    session.segments.push({
      index: seg.index,
      startOffsetMs: seg.startOffsetMs,
      endOffsetMs: seg.endOffsetMs,
      audioName, audioPath, text,
      error: err ? (err.message || String(err)) : null,
      isFinal: !!seg.isFinal,
    });

    if (err) {
      await this.queue.add({
        type: "transcribe",
        sessionId: session.id,
        mdPath: session.mdPath,
        audioPath, segmentIndex: seg.index,
        startOffsetMs: seg.startOffsetMs, endOffsetMs: seg.endOffsetMs,
        audioName, mode: session.mode, isFinal: !!seg.isFinal,
        lastError: err.message || String(err),
      });
    }

    const segTitle = `### 段落 ${segNumber} (${formatElapsed(seg.startOffsetMs)}–${formatElapsed(seg.endOffsetMs)})${seg.isFinal ? " · 结束" : ""}`;
    const block = [
      "",
      segTitle,
      "",
      `![[${audioName}]]`,
      "",
      err ? `_[转写失败（已进入重试队列）：${err.message || err}]_` : (text ? text : "_[此段无内容]_"),
      "",
    ].join("\n");
    await this.insertBeforeSegmentsEnd(session.mdPath, block, session.id);

    this.refreshOutlineView();

    if (!seg.isFinal) new obsidian.Notice(`段 ${segNumber} 已转写`);

    if (this.settings.enableRealtimeOutline && text && !err) {
      this.scheduleRealtimeOutline();
    }
  }

  async finalizeSession(session) {
    if (!session || session.finalized) return;
    session.finalized = true;

    if (session.filteredShortRecording) {
      await this.discardFilteredShortSession(session);
      new obsidian.Notice("已过滤小于三秒录音");
      if (this.session === session) this.session = null;
      this.refreshOutlineView();
      return;
    }

    if (!session.segments || session.segments.length === 0) {
      await this.removeEmptySessionBlock(session);
      new obsidian.Notice("⏭ 本次录音时长过短或无有效音频，已跳过");
      if (this.session === session) this.session = null;
      this.refreshOutlineView();
      return;
    }

    session.finalizing = true;
    this.refreshOutlineView();
    new obsidian.Notice("🧠 所有段已处理，GPT 合并润色中…");

    let polished = ""; let mergeError = null;
    try {
      const lastSeg = session.segments[session.segments.length - 1];
      const sessionMeta = {
        startedAt: session.startedAt,
        duration: lastSeg ? formatElapsed(lastSeg.endOffsetMs || 0) : "",
      };
      polished = await mergeAndPolish(this, session.segments.map(s => ({
        index: s.index, startOffsetMs: s.startOffsetMs, endOffsetMs: s.endOffsetMs, text: s.text,
      })), session.mode, session.recruitContext, sessionMeta);
    } catch (e) { mergeError = e; console.error(e); }
    session.finalizing = false;

    if (mergeError) {
      const lastSeg = session.segments[session.segments.length - 1];
      await this.queue.add({
        type: "merge",
        sessionId: session.id,
        mdPath: session.mdPath,
        mode: session.mode,
        segments: session.segments.map(s => ({
          index: s.index, startOffsetMs: s.startOffsetMs, endOffsetMs: s.endOffsetMs, text: s.text,
          audioName: s.audioName,
        })),
        recruitContext: session.recruitContext || null,
        sessionMeta: {
          startedAt: session.startedAt,
          duration: lastSeg ? formatElapsed(lastSeg.endOffsetMs || 0) : "",
        },
        lastError: mergeError.message || String(mergeError),
      });
    }

    if (this.settings.consolidatedLayout && !mergeError) {
      await this.rewriteConsolidated(session, polished);
    } else {
      await this.appendPolishBlock(session, polished, mergeError);
    }

    if (!mergeError && polished) {
      const renamed = await this.renameMarkdownWithGeneratedTitle(session.mdPath, polished, session.mode);
      if (renamed instanceof obsidian.TFile) session.mdPath = renamed.path;
    }

    if (!mergeError && polished) {
      try { await this.appendDailyMeetingOverview(session, polished); }
      catch (e) { console.error("[LexVoice] daily overview failed", e); }
    }

    new obsidian.Notice(mergeError ? "合并润色失败，已加入重试队列" : "LexVoice 处理完成");

    if (this.settings.autoOpenNoteAfterFinish) {
      const file = this.app.vault.getAbstractFileByPath(session.mdPath);
      if (file instanceof obsidian.TFile) {
        try { await this.app.workspace.getLeaf(false).openFile(file); } catch {}
      }
    }
    if (this.session === session) this.session = null;
    this.refreshOutlineView();
  }

  async appendDailyMeetingOverview(session, polished) {
    if (!this.settings.writeDailyMeetingOverview) return;
    if (!session || !polished) return;
    let dailyFile = null;
    try {
      dailyFile = await ensureTodayDailyNoteFile(this.app);
    } catch (e) {
      console.error("[LexVoice] daily note ensure failed", e);
    }
    if (!(dailyFile instanceof obsidian.TFile)) return;
    if (obsidian.normalizePath(dailyFile.path) === obsidian.normalizePath(session.mdPath)) return;
    const entry = buildDailyMeetingOverviewEntry(session, polished, this.settings);
    const cur = await this.app.vault.read(dailyFile);
    const next = upsertDailyMeetingOverview(cur, session.id, entry);
    if (next !== cur) await this.app.vault.modify(dailyFile, next);
  }

  async appendDailyMeetingOverviewForMarkdown(file, markdown, polished, mode, segments, sessionMeta) {
    if (!(file instanceof obsidian.TFile)) return;
    const startedAt = sessionMeta && sessionMeta.startedAt
      ? sessionMeta.startedAt
      : new Date(file.stat && file.stat.ctime ? file.stat.ctime : Date.now()).toISOString();
    const session = {
      id: extractLexVoiceSessionId(markdown, obsidian.normalizePath(file.path).replace(/[^A-Za-z0-9_-]+/g, "-")),
      mdPath: file.path,
      mode,
      startedAt,
      segments: Array.isArray(segments) ? segments : [],
    };
    await this.appendDailyMeetingOverview(session, polished);
  }

  getAvailableMarkdownPath(targetPath, currentPath) {
    const current = obsidian.normalizePath(currentPath || "");
    let candidate = obsidian.normalizePath(targetPath || "");
    if (!candidate || candidate === current) return candidate;
    const dot = candidate.toLowerCase().endsWith(".md") ? candidate.length - 3 : candidate.length;
    const base = candidate.slice(0, dot);
    const ext = candidate.slice(dot) || ".md";
    let i = 2;
    while (true) {
      const existing = this.app.vault.getAbstractFileByPath(candidate);
      if (!existing || obsidian.normalizePath(existing.path) === current) return candidate;
      candidate = obsidian.normalizePath(`${base}-${i}${ext}`);
      i++;
      if (i > 99) return "";
    }
  }

  async renameMarkdownWithGeneratedTitle(fileOrPath, polished, mode) {
    if (!this.settings.autoRenameWithTitle || !polished || mode === "off") return null;
    const file = typeof fileOrPath === "string"
      ? this.app.vault.getAbstractFileByPath(fileOrPath)
      : fileOrPath;
    if (!(file instanceof obsidian.TFile)) return null;
    try {
      const tag = await generateTitleTag(this, polished, mode);
      if (!tag) return file;
      const target = buildLexVoiceRenamedMarkdownPath(file.path, mode, tag, this.settings);
      const newPath = this.getAvailableMarkdownPath(target, file.path);
      if (!newPath || obsidian.normalizePath(newPath) === obsidian.normalizePath(file.path)) return file;
      await this.app.fileManager.renameFile(file, newPath);
      const renamed = this.app.vault.getAbstractFileByPath(newPath);
      return renamed instanceof obsidian.TFile ? renamed : file;
    } catch (e) {
      console.error("[LexVoice] rename failed", e);
      return file;
    }
  }

  async removeEmptySessionBlock(session) {
    const file = this.app.vault.getAbstractFileByPath(session.mdPath);
    if (!(file instanceof obsidian.TFile)) return;
    const cur = await this.app.vault.read(file);
    const sessMarker = `<!-- lexvoice-session:${session.id} -->`;
    const endMarker = `<!-- lexvoice-segments-end:${session.id} -->`;
    const sessIdx = cur.indexOf(sessMarker);
    const endIdx = cur.indexOf(endMarker);
    if (sessIdx < 0 || endIdx < sessIdx) return;
    const headerLineIdx = cur.lastIndexOf("\n## ", sessIdx);
    const h1LineIdx = cur.lastIndexOf("\n# ", sessIdx);
    const startIdx = Math.max(headerLineIdx, h1LineIdx);
    const blockStart = startIdx >= 0 ? startIdx + 1 : 0;
    const blockEnd = endIdx + endMarker.length;
    const before = cur.slice(0, blockStart).replace(/\n+$/, "\n");
    const after = cur.slice(blockEnd).replace(/^\n+/, "");
    const next = before + (after ? "\n" + after : "");
    if (next !== cur) await this.app.vault.modify(file, next);
  }

  async rewriteConsolidated(session, polished) {
    const file = this.app.vault.getAbstractFileByPath(session.mdPath);
    if (!(file instanceof obsidian.TFile)) return;
    const meta = getModeMeta(this.settings, session.mode);
    const moment = window.moment;
    const startedAt = moment(session.startedAt);
    const totalMs = session.segments.length ? session.segments[session.segments.length - 1].endOffsetMs : 0;
    const audioRow = session.segments.map(s => `![[${s.audioName}]]`).join(" ");

    const rawBlocks = session.segments.map(s => {
      const n = s.index + 1;
      const head = `### 段落 ${n} (${formatElapsed(s.startOffsetMs)}–${formatElapsed(s.endOffsetMs)})${s.isFinal ? " · 结束" : ""}`;
      const body = s.error ? `_[转写失败：${s.error}]_` : (s.text || "_[此段无内容]_");
      return `${head}\n\n![[${s.audioName}]]\n\n${body}\n`;
    }).join("\n");

    const polishedParts = splitLeadingFrontmatter(polished || "_[无输出]_");
    const polishedFrontmatter = polishedParts.frontmatter ? polishedParts.frontmatter.trimEnd() : "";
    const polishedBody = polishedParts.body.trim() || "_[无输出]_";

    const content = [
      polishedFrontmatter || null,
      polishedFrontmatter ? "" : null,
      `# ${meta.emoji} ${startedAt.format("YYYY-MM-DD HH:mm")} · ${meta.prefix}`,
      "",
      `> [!info] 录音信息`,
      `> 时间：${startedAt.format("YYYY-MM-DD HH:mm:ss")} · 时长：${formatElapsed(totalMs)} · 模式：${meta.prefix} · 分段：${session.segments.length} · 模型：${this.settings.llmModel}`,
      "",
      polishedBody,
      "",
      "---",
      "",
      "## 📁 原始材料",
      "",
      "<details>",
      `<summary>🎧 原始音频（${session.segments.length} 段，${formatElapsed(totalMs)}）</summary>`,
      "",
      audioRow,
      "",
      "</details>",
      "",
      "<details>",
      `<summary>📝 分段原始转写（${session.segments.length} 段）</summary>`,
      "",
      rawBlocks,
      "</details>",
      "",
      `<!-- lexvoice-session:${session.id} -->`,
      "",
    ].filter(v => v !== null).join("\n");

    await this.app.vault.modify(file, content);
  }

  async appendPolishBlock(session, polished, mergeError) {
    const file = this.app.vault.getAbstractFileByPath(session.mdPath);
    if (!(file instanceof obsidian.TFile)) return;
    const totalMs = session.segments.length ? session.segments[session.segments.length - 1].endOffsetMs : 0;
    const meta = getModeMeta(this.settings, session.mode);
    const polishedParts = splitLeadingFrontmatter(polished || "_[无输出]_");
    const polishedFrontmatter = polishedParts.frontmatter ? polishedParts.frontmatter.trimEnd() : "";
    const polishedBody = polishedParts.body.trim() || "_[无输出]_";
    const block = [
      "",
      `## ✨ 整合版（${this.settings.llmModel} · ${meta.prefix}）`,
      "",
      `> [!info] 合并自 ${session.segments.length} 段，共 ${formatElapsed(totalMs)}`,
      "",
      mergeError ? `_[合并润色失败（已加入重试队列）：${mergeError.message || mergeError}]_` : polishedBody,
      "",
      "---",
      "",
    ].join("\n");
    let cur = await this.app.vault.read(file);
    if (polishedFrontmatter && !mergeError) {
      const currentParts = splitLeadingFrontmatter(cur);
      cur = polishedFrontmatter + "\n\n" + currentParts.body.replace(/^\n+/, "");
    }
    const sep = cur.endsWith("\n") ? "" : "\n";
    let next = cur + sep + block;
    next = next.replace(/录音中…\)?/g, `${formatElapsed(totalMs)}）`);
    await this.app.vault.modify(file, next);
  }

  async appendToNote(path, content) {
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof obsidian.TFile) {
      const cur = await this.app.vault.read(existing);
      const sep = cur.endsWith("\n") ? "" : "\n";
      await this.app.vault.modify(existing, cur + sep + content);
    } else {
      await this.app.vault.create(path, content);
    }
  }

  async insertBeforeSegmentsEnd(path, content, sessionId) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof obsidian.TFile)) return this.appendToNote(path, content);
    const cur = await this.app.vault.read(file);
    const specific = sessionId ? `<!-- lexvoice-segments-end:${sessionId} -->` : null;
    if (specific && cur.includes(specific)) {
      const next = cur.replace(specific, `${content}\n${specific}`);
      await this.app.vault.modify(file, next);
      return;
    }
    const legacy = "<!-- lexvoice-segments-end -->";
    const lastIdx = cur.lastIndexOf(legacy);
    if (lastIdx >= 0) {
      const next = cur.slice(0, lastIdx) + content + "\n" + cur.slice(lastIdx);
      await this.app.vault.modify(file, next);
      return;
    }
    await this.appendToNote(path, content);
  }

  // 历史笔记迁移：扫描 mdFolder 下所有 .md，给没有 frontmatter 的老纪要补全 mode/日期/主题/tags
  // 已有 mode 字段的跳过；无法识别模式的也跳过；其他都补全（写入最小 frontmatter）
  async migrateLegacyNotes() {
    const folderPath = obsidian.normalizePath(this.settings.mdFolder || "LexVoice/转写纪要");
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof obsidian.TFolder)) {
      throw new Error("笔记文件夹不存在：" + folderPath);
    }
    const files = [];
    const walk = (f) => {
      if (f instanceof obsidian.TFolder) for (const c of f.children) walk(c);
      else if (f instanceof obsidian.TFile && f.extension === "md") files.push(f);
    };
    walk(folder);

    let migrated = 0, skipped = 0, noMode = 0, failed = 0;
    const failedFiles = [];

    for (const file of files) {
      try {
        const content = await this.app.vault.read(file);
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
        if (fmMatch) {
          try {
            const fm = obsidian.parseYaml(fmMatch[1]);
            if (fm && fm.mode) { skipped++; continue; }
          } catch {}
        }
        const mode = inferModeFromLegacyNote(file.name, content);
        if (!mode) { noMode++; continue; }

        const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : "";
        const durationMatch = content.match(/时长\s*[:：]\s*([\d:]+)/);
        const duration = durationMatch ? durationMatch[1] : "";
        const topic = inferTopicFromFilename(file.name);

        const fmObj = { mode };
        if (date) fmObj["日期"] = date;
        if (duration) fmObj["时长"] = duration;
        if (topic) {
          if (mode === "huddle") fmObj["议题"] = topic;
          else fmObj["主题"] = topic;
        }
        fmObj["状态"] = "已整理";
        fmObj["tags"] = ["lexvoice/" + mode, "lexvoice/legacy"];

        let yamlBlock;
        try { yamlBlock = obsidian.stringifyYaml(fmObj); }
        catch {
          yamlBlock = Object.entries(fmObj).map(([k, v]) =>
            Array.isArray(v) ? k + ":\n" + v.map(x => "  - " + x).join("\n") : k + ": " + v
          ).join("\n") + "\n";
        }

        let newContent;
        if (fmMatch) newContent = "---\n" + yamlBlock + "---\n" + content.slice(fmMatch[0].length);
        else newContent = "---\n" + yamlBlock + "---\n\n" + content;

        await this.app.vault.modify(file, newContent);
        migrated++;
      } catch (e) {
        console.error("[LexVoice] migrate failed:", file.path, e);
        failedFiles.push(file.path);
        failed++;
      }
    }
    return { migrated, skipped, noMode, failed, failedFiles, total: files.length };
  }

  async cleanupEmptyShortRecordings() {
    const folderPath = obsidian.normalizePath(this.settings.mdFolder || DEFAULT_SETTINGS.mdFolder);
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof obsidian.TFolder)) {
      new obsidian.Notice(`转写纪要文件夹不存在：${folderPath}`, 8000);
      return;
    }

    const files = [];
    const walk = (item) => {
      if (item instanceof obsidian.TFolder) {
        for (const child of item.children) walk(child);
      } else if (item instanceof obsidian.TFile && item.extension === "md") {
        files.push(item);
      }
    };
    walk(folder);

    const currentPath = this.session && this.session.mdPath ? obsidian.normalizePath(this.session.mdPath) : "";
    const candidates = [];
    for (const file of files) {
      if (currentPath && obsidian.normalizePath(file.path) === currentPath) continue;
      try {
        const content = await this.app.vault.read(file);
        const candidate = analyzeLexVoiceEmptyShortNote(file, content, this.settings);
        if (!candidate) continue;
        const audioFiles = [];
        const seenAudio = new Set();
        for (const ref of candidate.audioRefs) {
          const audioFile = resolveLexVoiceAudioFile(this.app, this.settings, ref);
          if (audioFile && !seenAudio.has(audioFile.path)) {
            seenAudio.add(audioFile.path);
            audioFiles.push(audioFile);
          }
        }
        candidate.audioFiles = audioFiles;
        candidates.push(candidate);
      } catch (e) {
        console.error("[LexVoice] cleanup scan failed:", file.path, e);
      }
    }

    if (!candidates.length) {
      new obsidian.Notice("没有发现符合条件的空白短录音");
      return;
    }

    const uniqueAudioFiles = [];
    const audioPaths = new Set();
    for (const candidate of candidates) {
      for (const audioFile of candidate.audioFiles) {
        if (!audioPaths.has(audioFile.path)) {
          audioPaths.add(audioFile.path);
          uniqueAudioFiles.push(audioFile);
        }
      }
    }

    const preview = candidates
      .slice(0, 10)
      .map((c) => `- ${c.file.path}（${formatElapsed(c.durationMs)}，录音 ${c.audioFiles.length} 个）`)
      .join("\n");
    const more = candidates.length > 10 ? `\n...另有 ${candidates.length - 10} 条` : "";
    const ok = confirm(
      `发现 ${candidates.length} 条空白短录音。\n\n条件：时长不超过 10 秒，且没有有效转写文本。\n将移入系统废纸篓：${candidates.length} 篇纪要、${uniqueAudioFiles.length} 个录音文件。\n\n${preview}${more}\n\n继续清理吗？`
    );
    if (!ok) return;

    let noteDeleted = 0;
    let audioDeleted = 0;
    let failed = 0;
    const deletedNotePaths = new Set();
    const deletedAudioPaths = new Set();

    for (const candidate of candidates) {
      try {
        await trashLexVoiceFile(this.app, candidate.file);
        noteDeleted++;
        deletedNotePaths.add(obsidian.normalizePath(candidate.file.path));
      } catch (e) {
        failed++;
        console.error("[LexVoice] cleanup note delete failed:", candidate.file.path, e);
      }
    }

    for (const audioFile of uniqueAudioFiles) {
      const current = this.app.vault.getAbstractFileByPath(audioFile.path);
      if (!(current instanceof obsidian.TFile)) continue;
      try {
        await trashLexVoiceFile(this.app, current);
        audioDeleted++;
        deletedAudioPaths.add(obsidian.normalizePath(audioFile.path));
      } catch (e) {
        failed++;
        console.error("[LexVoice] cleanup audio delete failed:", audioFile.path, e);
      }
    }

    const beforeQueue = this.queue.tasks.length;
    this.queue.tasks = this.queue.tasks.filter((task) => {
      const mdPath = task.mdPath ? obsidian.normalizePath(task.mdPath) : "";
      const audioPath = task.audioPath ? obsidian.normalizePath(task.audioPath) : "";
      return !deletedNotePaths.has(mdPath) && !deletedAudioPaths.has(audioPath);
    });
    const queueRemoved = beforeQueue - this.queue.tasks.length;
    if (queueRemoved > 0) await this.saveAll();

    new obsidian.Notice(`清理完成：纪要 ${noteDeleted} 篇，录音 ${audioDeleted} 个，队列移除 ${queueRemoved} 条${failed ? `，失败 ${failed} 项` : ""}`, 10000);
  }

  // 创建 LexVoice 视图（.base 文件）—— 9 个：5 按模式 + 4 场景
  // overwrite=false：已存在的文件保留；overwrite=true：强制覆盖（用户重置/升级用）
  async createLexVoiceBases(opts) {
    const overwrite = !!(opts && opts.overwrite);
    await this.ensureFolder(LEXVOICE_BASES_FOLDER);
    await this.ensureFolder(LEXVOICE_BASES_FOLDER + "/按模式");
    await this.ensureFolder(LEXVOICE_BASES_FOLDER + "/场景");
    let created = 0, updated = 0, skipped = 0;
    for (const def of LV_BASE_DEFINITIONS) {
      if (!isRecruitFeatureUnlocked(this.settings) && /lexvoice\/recruit|招聘/.test(def.relPath + "\n" + def.yaml)) {
        skipped++;
        continue;
      }
      const path = obsidian.normalizePath(LEXVOICE_BASES_FOLDER + "/" + def.relPath);
      const existing = this.app.vault.getAbstractFileByPath(path);
      if (existing instanceof obsidian.TFile) {
        if (overwrite) {
          await this.app.vault.modify(existing, def.yaml);
          updated++;
        } else {
          skipped++;
        }
      } else {
        await this.app.vault.create(path, def.yaml);
        created++;
      }
    }
    return { created, updated, skipped };
  }

  async ensureFolder(folderPath) {
    const norm = obsidian.normalizePath(folderPath);
    if (!norm || norm === "/") return;
    const parts = norm.split("/").filter(Boolean);
    let cur = "";
    for (const p of parts) {
      cur = cur ? `${cur}/${p}` : p;
      const exist = this.app.vault.getAbstractFileByPath(cur);
      if (!exist) { try { await this.app.vault.createFolder(cur); } catch {} }
    }
  }

  // 单 mode 生成定制 Prompt：调一次 LLM，返回纯文本
  async generateIndustryPromptForMode(mode) {
    const p = this.settings.industryProfile || {};
    if (!p.industry || !p.scenarios) {
      throw new Error("请先在「AI 整理」填写「行业 / 角色」和「主要工作场景」");
    }
    if (!this.settings.llmApiKey) throw new Error("请先在 API 页配置大模型服务");
    if (!isKnownPolishMode(this.settings, mode)) throw new Error("未知的 mode：" + mode);
    const meta = getModeMeta(this.settings, mode);
    const modeLabel = meta && meta.prefix ? meta.prefix : mode;
    const sys = "你是 Prompt 工程师，专门为真实工作和学习场景生成可直接用于录音整理的 Markdown Prompt。输出要克制、清晰、可维护，不要堆砌 callout。";
    const userMsg = INDUSTRY_META_PROMPT
      .replaceAll("{{INDUSTRY}}", p.industry || "（未指定）")
      .replaceAll("{{SCENARIOS}}", p.scenarios || "（未指定）")
      .replaceAll("{{FOCUS}}", p.focus || "（未指定）")
      .replaceAll("{{OUTPUT_PREFERENCE}}", p.outputPreference || "（未指定）")
      .replaceAll("{{MODE}}", `${mode}（${modeLabel}）`);
    const text = await callLlm(this, sys, userMsg);
    let cleaned = text
      .replace(/^```\w*\s*/, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    if (!cleaned.includes("{{TRANSCRIPT}}")) {
      cleaned = cleaned + "\n\n原始转写：\n{{TRANSCRIPT}}";
    }
    return cleaned;
  }

  // 把生成好的 Prompt 保存为新的自定义提示词；不再覆盖内置提示词。
  async createIndustryPromptVariant(mode, promptText, opts) {
    if (!isKnownPolishMode(this.settings, mode)) throw new Error("未知的 mode：" + mode);
    const moment = window.moment;
    const stamp = moment ? moment().format("YYYY-MM-DD HH:mm") : new Date().toISOString().slice(0, 16);
    const profile = this.settings.industryProfile || {};
    const meta = getModeMeta(this.settings, mode);
    const role = (profile.industry || "自定义").trim();
    const firstScenario = String(profile.scenarios || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0] || (meta.prefix || "场景");
    const name = (opts && opts.name) || (role + " · " + firstScenario);
    const id = makeCustomPromptModeId(name || "scene");
    const tpl = {
      id,
      mode: id,
      name,
      description: "AI 根据你的角色、任务和输出偏好生成。参考提示词：" + (meta.prefix || meta.label || mode) + "。生成时间：" + stamp,
      baseMode: mode,
      prompt: promptText,
      isBuiltin: false,
      customMode: true,
      source: "ai-prompt-generator",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!this.settings.promptTemplates) this.settings.promptTemplates = {};
    if (!this.settings.activeTemplateByMode) this.settings.activeTemplateByMode = {};
    const clean = sanitizePromptTemplate(tpl, mode);
    this.settings.promptTemplates[clean.id] = clean;
    this.settings.activeTemplateByMode[clean.id] = clean.id;
    if (!opts || opts.activate !== false) this.settings.polishMode = clean.id;
    if (!this.settings.industryProfile) this.settings.industryProfile = {};
    this.settings.industryProfile.generatedAt = new Date().toISOString();
    await this.saveSettings();
    return clean;
  }

  // 一站式入口：生成 + 入库 + 激活，由调用方决定是否走后台 queue
  async generateAndApplyIndustryPrompt(mode, options) {
    const promptText = await this.generateIndustryPromptForMode(mode);
    const tpl = await this.createIndustryPromptVariant(mode, promptText, options);
    return tpl;
  }

  async extractVocabulary(merge) {
    const p = this.settings.industryProfile || {};
    if (!this.settings.llmApiKey && !isLocalLlmEndpoint(this.settings.llmEndpoint)) throw new Error("请先在 API 页配置大模型服务");
    const customPromptBrief = getCustomPromptModeTemplates(this.settings)
      .slice(0, 12)
      .map(t => `- ${t.name || t.id}: ${(t.prompt || t.description || "").replace(/\s+/g, " ").slice(0, 180)}`)
      .join("\n") || "（暂无自定义提示词）";
    const currentMode = getEffectivePolishMode(this.settings, this.settings.polishMode, "meeting");
    const currentMeta = getModeMeta(this.settings, currentMode);
    const sys = "你是 ASR 领域词汇提取助手。请根据用户的工作描述、常用提示词和 LexVoice 使用场景，抽取最可能在录音中出现、ASR 容易识别错的专有词，并按固定类别输出。";
    const user = `【用户行业 / 角色】${p.industry || "（未指定）"}

【主要工作场景】
${p.scenarios || "（未指定）"}

【关注点】
${p.focus || "（未指定）"}

【当前默认提示词】
${currentMeta.prefix || currentMeta.label || currentMode}

【自定义提示词摘要】
${customPromptBrief}

【任务】
列出 30–80 个可能高频出现、且值得加入 ASR 词汇表的专有词。若用户背景为空，请根据当前默认提示词与自定义提示词推断；不要编造真实人名、真实公司或隐私信息，可以使用类别化占位词。
- 人名：客户、同事、专家、讲师、候选人、常用称呼
- 品牌/机构：公司、学校、客户、供应商、社区、品牌名
- 项目/产品：项目代号、产品名、模型名、系统名、服务名、插件名
- 行业术语：专业概念、业务流程词、缩写、英文混杂词
- 其他专有名词：暂时不好归类但 ASR 容易识别错的词

【输出格式】
严格只输出下面的 Markdown 结构；每行一个词，不加解释。某类没有词也保留标题。

## 人名
- <词>

## 品牌/机构
- <词>

## 项目/产品
- <词>

## 行业术语
- <词>

## 其他专有名词
- <词>`;
    const result = await callLlm(this, sys, user);
    const cleaned = result
      .replace(/^\`\`\`\w*\s*/, "")
      .replace(/\s*\`\`\`\s*$/, "")
      .replace(/^好的[，,].*?\n/, "")
      .trim();
    let newGroups = parseVocabularyGroups(cleaned);
    let newTerms = flattenVocabularyGroups(newGroups);
    if (!newTerms.length) {
      newGroups = normalizeVocabularyInput(cleaned.split(/\r?\n/)
        .map((s) => s.replace(/^[\d\-*\.、]+\s*/, "").replace(/^[\"「『]|[\"」』]$/g, "").trim())
        .filter(Boolean));
      newTerms = flattenVocabularyGroups(newGroups);
    }

    let finalGroups = newGroups;
    if (merge) {
      const existing = await loadVocabularyGroups(this);
      finalGroups = mergeVocabularyGroups(existing, newGroups);
    }
    await this.writeVocabularyFile(finalGroups);
    return newTerms;
  }

  async writeVocabularyFile(terms) {
    const groups = normalizeVocabularyInput(terms);
    const path = this.settings.vocabularyFile;
    if (!path) {
      this.settings.customVocabulary = flattenVocabularyGroups(groups).join("\n");
      await this.saveSettings();
      return null;
    }
    const norm = obsidian.normalizePath(path);
    const folderPath = norm.includes("/") ? norm.slice(0, norm.lastIndexOf("/")) : "";
    if (folderPath) await this.ensureFolder(folderPath);
    const content = formatVocabularyMarkdown(groups, this.settings.industryProfile);
    let file = this.app.vault.getAbstractFileByPath(norm);
    if (file instanceof obsidian.TFile) {
      await this.app.vault.modify(file, content);
    } else {
      file = await this.app.vault.create(norm, content);
    }
    return file;
  }

  // 旧入口保留：把历史批量生成结果转成新的自定义提示词，避免覆盖内置提示词
  async applyIndustryPrompts(prompts) {
    const created = [];
    const visible = getBuiltInVisiblePolishModeKeys(this.settings);
    for (const mode of visible) {
      const text = prompts && prompts[mode];
      if (!text) continue;
      try {
        const tpl = await this.createIndustryPromptVariant(mode, text);
        created.push(tpl);
      } catch (e) {
        console.error("[LexVoice] createIndustryPromptVariant failed", mode, e);
      }
    }
    return created;
  }

  async polishEditor(editor) {
    const sel = editor.getSelection();
    const raw = sel || editor.getValue();
    if (!raw || !raw.trim()) { new obsidian.Notice("没有可润色的内容"); return; }
    new obsidian.Notice("AI 润色中…");
    try {
      const mode = getEffectivePolishMode(this.settings, this.settings.polishMode === "off" ? "meeting" : this.settings.polishMode);
      const ctx = mode === "recruit" ? this.settings.recruitContext : null;
      const polished = await polishTranscript(this, raw, mode, ctx);
      if (sel) editor.replaceSelection(polished); else editor.setValue(polished);
      new obsidian.Notice("润色完成");
    } catch (e) {
      console.error(e);
      new obsidian.Notice(`润色失败：${(e && e.message) || e}`);
    }
  }

  // 从 .md 文件的 frontmatter 推断模式（mode 字段；找不到时尝试 类型 字段中文映射）
  detectModeFromMarkdown(file) {
    if (!(file instanceof obsidian.TFile)) return null;
    const cache = (this.app.metadataCache.getFileCache(file) || {}).frontmatter;
    if (!cache) return null;
    const m = cache.mode;
    if (typeof m === "string" && isKnownPolishMode(this.settings, m)) return m;
    const typeStr = String(cache["类型"] || cache.type || "").trim();
    const typeToMode = {
      "学习": "learning",
      "学习记录": "learning",
      "学习视频": "learning",
      "视频学习": "learning",
      "课程笔记": "learning",
      "访谈": "interview",
      "访谈调研": "interview",
      "会议": "meeting",
      "工作纪要": "meeting",
      "小会": "huddle",
      "讨论": "huddle",
      "圆桌讨论": "huddle",
      "独白": "monologue",
      "手记": "monologue",
      "个人笔记": "monologue",
      "招聘面试": "recruit",
      "招聘评估": "recruit",
      "面试": "recruit",
    };
    if (typeToMode[typeStr]) {
      const mode = typeToMode[typeStr];
      if (mode === "recruit" && !isRecruitFeatureUnlocked(this.settings)) return null;
      return mode;
    }
    return null;
  }

  async repolishMarkdownFile(file, mode) {
    if (!(file instanceof obsidian.TFile) || file.extension !== "md") return;
    if (mode === "recruit" && !isRecruitFeatureUnlocked(this.settings)) {
      new obsidian.Notice("该扩展模式尚未启用");
      return;
    }
    const meta = getModeMeta(this.settings, mode);
    try {
      const content = await this.app.vault.read(file);
      let segments = extractLexVoiceTranscriptSegments(content);
      if (!segments.length) {
        new obsidian.Notice("未找到 LexVoice 原始转写。请在包含「分段原始转写」或录音段落的纪要 Markdown 上使用。", 8000);
        return;
      }

      // 从 frontmatter 解析角色映射（"代号 → 真名" 形式的条目）
      const fmCache = (this.app.metadataCache.getFileCache(file) || {}).frontmatter || null;
      const roleMapping = extractRoleMappingFromFrontmatter(fmCache);
      if (roleMapping.length) {
        segments = applyRoleMappingToSegments(segments, roleMapping);
      }

      // 从 frontmatter 取插件已注入的 time，作为 sessionMeta（避免 LLM 重新推断，保持时间不变）
      let sessionMeta = null;
      if (fmCache) {
        const fullTimeStr = fmCache.time || "";
        const durationStr = fmCache["时长"] || fmCache.duration || "";
        if (fullTimeStr) {
          const m = window.moment ? window.moment(fullTimeStr, [window.moment.ISO_8601, "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DD HH:mm:ss"], true) : null;
          if (m && m.isValid && m.isValid()) {
            sessionMeta = { startedAt: m.toDate().toISOString(), duration: String(durationStr || "").trim() };
          }
        } else {
          // 兼容旧笔记：早期版本可能写入"日期"和"时间"两个字段；重新整理后会迁移为 time。
          const dateStr = fmCache["日期"] || fmCache.date || "";
          const timeStr = fmCache["时间"] || "";
          if (dateStr) {
            const composed = String(dateStr).trim() + (timeStr ? "T" + String(timeStr).trim() : "");
            const m = window.moment ? window.moment(composed, ["YYYY-MM-DDTHH:mm", "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss"], true) : null;
            if (m && m.isValid && m.isValid()) {
              sessionMeta = { startedAt: m.toDate().toISOString(), duration: String(durationStr || "").trim() };
            }
          }
        }
      }

      let recruitContext = null;
      if (mode === "recruit") {
        const result = await new Promise((resolve) => {
          const modal = new RecruitContextModal(this.app, this, {
            onConfirm: (action, ctx) => resolve({ action, ctx }),
          });
          modal.open();
        });
        if (result.action === "cancel") return;
        recruitContext = result.action === "skip" ? null : result.ctx;
      }

      const mapNotice = roleMapping.length
        ? `LexVoice：应用 ${roleMapping.length} 条角色映射后按${meta.prefix}模式重新整理…`
        : `LexVoice：正在按${meta.prefix}模式重新整理…`;
      new obsidian.Notice(mapNotice);
      // 把笔记原 frontmatter 传给 mergeAndPolish，post-process 阶段会作为 base 保留用户改动
      // （包括用户已应用的角色映射变更，仅 system 字段被覆盖、tags 被 merge）
      const originalFmForRegen = fmCache ? Object.assign({}, fmCache) : null;
      // 在 originalFm 里应用角色映射的"压平"，避免 base 里仍然带 → 形式
      if (originalFmForRegen && roleMapping.length) {
        for (const f of ROLE_MAPPING_FIELDS) {
          const v = originalFmForRegen[f];
          if (Array.isArray(v)) {
            originalFmForRegen[f] = v.map(item => {
              const m = parseRoleMapItem(item);
              return m ? m.to : item;
            });
          } else if (typeof v === "string") {
            const m = parseRoleMapItem(v);
            if (m) originalFmForRegen[f] = m.to;
          }
        }
      }
      const polished = await mergeAndPolish(this, segments, mode, recruitContext, sessionMeta, originalFmForRegen);

      // 重整完成后，把 frontmatter 里的"代号 → 真名"项压平为"真名"，让 yaml 干净
      let finalContent = await this.app.vault.read(file);
      if (roleMapping.length) {
        const fmMatch = finalContent.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const cleaned = rewriteFrontmatterRoleMappings(fmMatch[1], roleMapping);
          if (cleaned !== fmMatch[1]) {
            finalContent = "---\n" + cleaned + "\n---" + finalContent.slice(fmMatch[0].length);
            await this.app.vault.modify(file, finalContent);
          }
        }
      }

      await this.appendRepolishBlock(file, polished, mode, segments);
      let dailyTargetFile = file;
      const renamed = await this.renameMarkdownWithGeneratedTitle(file, polished, mode);
      if (renamed instanceof obsidian.TFile) dailyTargetFile = renamed;
      try {
        const dailyContent = await this.app.vault.read(dailyTargetFile);
        await this.appendDailyMeetingOverviewForMarkdown(dailyTargetFile, dailyContent, polished, mode, segments, sessionMeta);
      } catch (e) {
        console.error("[LexVoice] daily overview after repolish failed", e);
      }
      new obsidian.Notice(`LexVoice：已生成${meta.prefix}模式纪要${roleMapping.length ? `（角色映射 ${roleMapping.length} 条已应用）` : ""}`);
    } catch (e) {
      console.error("[LexVoice] repolish markdown failed", e);
      new obsidian.Notice(`重新整理失败：${(e && e.message) || e}`, 8000);
    }
  }

  async appendRepolishBlock(file, polished, mode, segments) {
    const meta = getModeMeta(this.settings, mode);
    const stamp = window.moment ? window.moment().format("YYYY-MM-DD HH:mm:ss") : new Date().toISOString();
    const cur = await this.app.vault.read(file);

    const rawMatch = /\n##\s+📁\s+原始材料/.exec(cur);
    const rawIdx = rawMatch ? rawMatch.index + 1 : -1;
    const beforeRaw = rawIdx >= 0 ? cur.slice(0, rawIdx) : cur;
    const rawTail = rawIdx >= 0 ? cur.slice(rawIdx).replace(/^\n+/, "") : "";
    const beforeParts = splitLeadingFrontmatter(beforeRaw);
    const beforeBody = beforeParts.body.replace(/^\n+/, "");
    const polishedParts = splitLeadingFrontmatter(stripModeSuggestionBlocks(polished || "_[无输出]_").trim());
    const polishedFrontmatter = polishedParts.frontmatter ? polishedParts.frontmatter.trimEnd() : "";
    const polishedBody = polishedParts.body.trim() || "_[无输出]_";

    const titleMatch = beforeBody.match(/^#\s+[^\n]+\n*/);
    const titleBlock = titleMatch ? titleMatch[0].replace(/\n*$/, "\n") : "";
    let previousBody = titleMatch ? beforeBody.slice(titleMatch[0].length) : beforeBody;
    previousBody = previousBody
      .replace(/\s*---\s*$/m, "")
      .replace(/\s+$/, "")
      .trim();

    const currentBlock = [
      polishedFrontmatter || beforeParts.frontmatter.trimEnd() || null,
      (polishedFrontmatter || beforeParts.frontmatter) ? "" : null,
      titleBlock ? titleBlock.trimEnd() : null,
      titleBlock ? "" : null,
      `## ✨ 当前纪要（${meta.prefix} · ${stamp}）`,
      "",
      `> [!info] 基于本文底部的原始转写重新生成 · 段数：${segments.length} · 模型：${this.settings.llmModel}`,
      "",
      polishedBody,
      "",
      "---",
      "",
      "<details>",
      `<summary>上一版纪要（重新整理前 · ${stamp}）</summary>`,
      "",
      previousBody || "_（上一版为空）_",
      "",
      "</details>",
      "",
      rawTail ? rawTail.trimEnd() : "",
      "",
    ].filter(v => v !== null).join("\n");

    await this.app.vault.modify(file, currentBlock.replace(/\n{4,}/g, "\n\n\n"));
  }

  async handleInboxFile(file) {
    if (!(file instanceof obsidian.TFile)) return;
    if (!AUDIO_EXT.has((file.extension || "").toLowerCase())) return;
    const inbox = this.settings.inboxFolder;
    if (!inbox) return;
    const inboxNorm = obsidian.normalizePath(inbox);
    if (!file.path.startsWith(inboxNorm + "/") && file.path !== inboxNorm) return;
    const archiveSub = this.settings.inboxArchiveSubfolder || "";
    if (archiveSub && file.path.startsWith(`${inboxNorm}/${archiveSub}/`)) return;
    // 坚果云 / Dropbox / OneDrive 同步冲突文件检测：跳过自动处理，提醒用户解冲突
    if (isSyncConflictName(file.name)) {
      this._inboxConflictNotified = this._inboxConflictNotified || new Set();
      if (!this._inboxConflictNotified.has(file.path)) {
        this._inboxConflictNotified.add(file.path);
        new obsidian.Notice(`同步冲突文件已跳过：${file.name}\n请手动解决冲突后再处理。`, 8000);
        console.warn("[LexVoice] skipped sync conflict file:", file.path);
      }
      return;
    }
    if (!this.settings.inboxAutoImport) return;

    this._inboxRecent = this._inboxRecent || new Map();
    if (this._inboxRecent.has(file.path)) return;
    this._inboxRecent.set(file.path, Date.now());

    const delay = this.settings.inboxStabilizeDelayMs || 3000;
    this._inboxLock = (this._inboxLock || Promise.resolve()).then(async () => {
      await new Promise((r) => setTimeout(r, delay));
      const fresh = this.app.vault.getAbstractFileByPath(file.path);
      if (!(fresh instanceof obsidian.TFile)) return;
      new obsidian.Notice(`收件箱新增音频：${file.name}，处理中…`);
      try {
        await this.importAudioFiles([file.path]);
        if (archiveSub) {
          const archivePath = obsidian.normalizePath(`${inboxNorm}/${archiveSub}/${file.name}`);
          await this.ensureFolder(`${inboxNorm}/${archiveSub}`);
          const stillExists = this.app.vault.getAbstractFileByPath(file.path);
          if (stillExists instanceof obsidian.TFile) {
            try { await this.app.fileManager.renameFile(stillExists, archivePath); }
            catch (e) { console.error("[LexVoice] archive rename failed", e); }
          }
        }
      } catch (e) {
        console.error("[LexVoice] inbox auto-import failed", e);
        new obsidian.Notice(`收件箱处理失败：${e.message || e}`);
      } finally {
        setTimeout(() => this._inboxRecent && this._inboxRecent.delete(file.path), 60000);
      }
    }).catch((e) => { console.error("[LexVoice] inbox queue error", e); });
  }

  async scanInboxFolder() {
    const inbox = this.settings.inboxFolder;
    if (!inbox) { new obsidian.Notice("未配置收件箱文件夹"); return; }
    const inboxNorm = obsidian.normalizePath(inbox);
    const folder = this.app.vault.getAbstractFileByPath(inboxNorm);
    if (!(folder instanceof obsidian.TFolder)) {
      new obsidian.Notice(`收件箱文件夹不存在：${inboxNorm}`);
      return;
    }
    const archiveSub = this.settings.inboxArchiveSubfolder || "";
    const allChildren = folder.children.filter((f) =>
      f instanceof obsidian.TFile
      && AUDIO_EXT.has((f.extension || "").toLowerCase())
      && (!archiveSub || !f.path.startsWith(`${inboxNorm}/${archiveSub}/`))
    );
    const conflicts = allChildren.filter(f => isSyncConflictName(f.name));
    const candidates = allChildren.filter(f => !isSyncConflictName(f.name));
    if (conflicts.length) new obsidian.Notice(`跳过 ${conflicts.length} 个同步冲突文件，请手动解决`, 8000);
    if (!candidates.length) { new obsidian.Notice("收件箱无未处理文件"); return; }
    new obsidian.Notice(`发现 ${candidates.length} 个未处理文件，开始排队…`);
    for (const f of candidates) await this.handleInboxFile(f);
  }

  async importAudioFiles(paths, modeOverride) {
    if (!paths || !paths.length) return;
    paths.sort();
    const moment = window.moment;
    const startedAt = moment();
    const sessionStamp = startedAt.format("YYYYMMDD-HHmmss");
    const requestedMode = modeOverride && isKnownPolishMode(this.settings, modeOverride)
      ? modeOverride
      : (this.settings.polishMode || "meeting");
    const mode = getEffectivePolishMode(this.settings, requestedMode);
    const meta = getModeMeta(this.settings, mode);
    const mdName = `${startedAt.format(this.settings.noteFileNameFormatNew)} · 导入`;
    const mdPath = obsidian.normalizePath(`${this.settings.mdFolder}/${mdName}.md`);
    await this.ensureFolder(this.settings.mdFolder);

    // 招聘面试模式整合多文件音频时，也需要 recruit context；先弹 Modal 让用户确认
    let recruitContext = null;
    if (mode === "recruit") {
      const result = await new Promise((resolve) => {
        const modal = new RecruitContextModal(this.app, this, {
          onConfirm: (action, ctx) => resolve({ action, ctx }),
        });
        modal.open();
      });
      if (result.action === "cancel") {
        new obsidian.Notice("已取消导入");
        return;
      }
      if (result.action !== "skip") recruitContext = result.ctx;
    }
    const session = {
      id: genId(),
      sessionStamp,
      startedAt: startedAt.toDate().toISOString(),
      mdPath,
      mode: mode,
      segments: [],
      finalized: false,
      recruitContext,
    };

    const header = [
      `# ${meta.emoji} ${startedAt.format("YYYY-MM-DD HH:mm")} · ${meta.prefix}（导入处理中…）`,
      "",
      `> [!info] 导入信息`,
      `> 文件数：${paths.length} · 模式：${meta.prefix} · 模型：${this.settings.transcribeModel} → ${this.settings.llmModel}`,
      "",
      `<!-- lexvoice-session:${session.id} -->`,
      `<!-- lexvoice-segments-start:${session.id} -->`,
      `<!-- lexvoice-segments-end:${session.id} -->`,
      "",
    ].join("\n");
    await this.appendToNote(mdPath, header);

    new obsidian.Notice(`开始导入 ${paths.length} 个音频文件…`);

    let cumOffsetMs = 0;
    for (let i = 0; i < paths.length; i++) {
      const audioPath = paths[i];
      const file = this.app.vault.getAbstractFileByPath(audioPath);
      if (!(file instanceof obsidian.TFile)) {
        new obsidian.Notice(`跳过：${audioPath} 不存在`);
        continue;
      }
      new obsidian.Notice(`📝 转写中 ${i + 1}/${paths.length}：${file.name}`);

      let ab, blob, mime, durationMs;
      try {
        ab = await this.app.vault.readBinary(file);
        mime = mimeFromExt(file.extension);
        blob = new Blob([ab], { type: mime });
        durationMs = await getAudioDurationMs(blob);
      } catch (e) {
        console.error(e);
        new obsidian.Notice(`读取失败：${file.name}`);
        continue;
      }

      const startOffset = cumOffsetMs;
      const endOffset = cumOffsetMs + (durationMs || 0);
      cumOffsetMs = endOffset;
      const isFinal = i === paths.length - 1;

      let text = ""; let err = null;
      try {
        text = await transcribeAudio(this, blob, mime);
      } catch (e) { err = e; console.error(e); }

      session.segments.push({
        index: i,
        startOffsetMs: startOffset,
        endOffsetMs: endOffset,
        audioName: file.name,
        audioPath,
        text,
        error: err ? (err.message || String(err)) : null,
        isFinal,
      });

      if (err) {
        await this.queue.add({
          type: "transcribe",
          sessionId: session.id, mdPath: session.mdPath,
          audioPath, segmentIndex: i,
          startOffsetMs: startOffset, endOffsetMs: endOffset,
          audioName: file.name, mode: session.mode, isFinal,
          lastError: err.message || String(err),
        });
      }

      const segNumber = i + 1;
      const segTitle = `### 段落 ${segNumber} (${formatElapsed(startOffset)}–${formatElapsed(endOffset)})${isFinal ? " · 结束" : ""}`;
      const block = [
        "",
        segTitle,
        "",
        `![[${file.name}]]`,
        "",
        err ? `_[转写失败（已进入重试队列）：${err.message || err}]_` : (text || "_[此段无内容]_"),
        "",
      ].join("\n");
      await this.insertBeforeSegmentsEnd(session.mdPath, block, session.id);
    }

    await this.finalizeSession(session);
  }

  async openSessionNote() {
    const mdPath = this.session && this.session.mdPath;
    if (!mdPath) { await this.openRecentNote(); return; }
    const file = this.app.vault.getAbstractFileByPath(mdPath);
    if (!(file instanceof obsidian.TFile)) { new obsidian.Notice("当前录音笔记尚未生成"); return; }
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
    try {
      const view = leaf.view;
      const editor = view && view.editor;
      if (editor) {
        const content = editor.getValue();
        const marker = this.session && this.session.id ? `<!-- lexvoice-segments-end:${this.session.id} -->` : "<!-- lexvoice-segments-end -->";
        const idx = content.lastIndexOf(marker);
        if (idx >= 0) {
          const line = content.slice(0, idx).split("\n").length - 1;
          editor.setCursor({ line: Math.max(0, line - 1), ch: 0 });
          editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
        } else {
          const lastLine = editor.lastLine();
          editor.setCursor({ line: lastLine, ch: 0 });
          editor.scrollIntoView({ from: { line: lastLine, ch: 0 }, to: { line: lastLine, ch: 0 } }, true);
        }
      }
    } catch {}
  }

  async openRecentNote() {
    const folder = this.app.vault.getAbstractFileByPath(obsidian.normalizePath(this.settings.mdFolder));
    if (!(folder instanceof obsidian.TFolder)) { new obsidian.Notice("Markdown 文件夹不存在"); return; }
    const files = folder.children.filter((f) => f instanceof obsidian.TFile && f.extension === "md");
    if (!files.length) { new obsidian.Notice("最近没有录音笔记"); return; }
    files.sort((a, b) => b.stat.mtime - a.stat.mtime);
    await this.app.workspace.getLeaf(false).openFile(files[0]);
  }

  async retryQueue() {
    if (!this.queue.tasks.length) { new obsidian.Notice("队列为空"); return; }
    new obsidian.Notice(`重试 ${this.queue.tasks.length} 个任务…`);
    await this.queue.processAll();
    new obsidian.Notice(`剩余 ${this.queue.tasks.length} 个任务`);
  }

  async retryTranscribeTask(task) {
    const file = this.app.vault.getAbstractFileByPath(task.audioPath);
    if (!(file instanceof obsidian.TFile)) throw new Error(`音频不存在：${task.audioPath}`);
    const ab = await this.app.vault.readBinary(file);
    const blob = new Blob([ab], { type: `audio/${extFromMime("audio/" + (task.audioName.split(".").pop()))}` });
    const text = await transcribeAudio(this, blob, blob.type);
    if (!text) throw new Error("转写返回为空");
    const mdFile = this.app.vault.getAbstractFileByPath(task.mdPath);
    if (mdFile instanceof obsidian.TFile) {
      const cur = await this.app.vault.read(mdFile);
      const failMark = /_\[转写失败（已进入重试队列）：[^\]]*\]_/;
      const next = cur.replace(failMark, text);
      if (next !== cur) await this.app.vault.modify(mdFile, next);
    }
  }

  async retryMergeTask(task) {
    const polished = await mergeAndPolish(this, task.segments || [], task.mode, task.recruitContext || null, task.sessionMeta || null);
    if (!polished) throw new Error("合并返回为空");
    const file = this.app.vault.getAbstractFileByPath(task.mdPath);
    if (!(file instanceof obsidian.TFile)) throw new Error(`笔记不存在：${task.mdPath}`);
    const cur = await this.app.vault.read(file);
    const failMark = /_\[合并润色失败（已加入重试队列）：[^\]]*\]_/;
    const merged = mergeLeadingFrontmatterIntoDocument(cur, polished);
    let next;
    if (failMark.test(cur)) {
      next = merged.content.replace(failMark, merged.body);
    } else {
      const meta = getModeMeta(this.settings, task.mode);
      const block = `\n\n## ✨ 整合版（补录 · ${meta.prefix}）\n\n${merged.body}\n\n---\n`;
      next = merged.content + block;
    }
    await this.app.vault.modify(file, next);
    let targetFile = file;
    const renamed = await this.renameMarkdownWithGeneratedTitle(file, polished, task.mode);
    if (renamed instanceof obsidian.TFile) targetFile = renamed;
    try {
      const latestContent = await this.app.vault.read(targetFile);
      const session = {
        id: task.sessionId || extractLexVoiceSessionId(latestContent, obsidian.normalizePath(targetFile.path).replace(/[^A-Za-z0-9_-]+/g, "-")),
        mdPath: targetFile.path,
        mode: task.mode,
        startedAt: (task.sessionMeta && task.sessionMeta.startedAt) || task.createdAt || new Date().toISOString(),
        segments: Array.isArray(task.segments) ? task.segments : [],
      };
      await this.appendDailyMeetingOverview(session, polished);
    } catch (e) {
      console.error("[LexVoice] daily overview after merge retry failed", e);
    }
  }

  async runGeneratePromptTask(task) {
    const mode = task.mode;
    if (!mode) throw new Error("缺少 mode");
    const tpl = await this.generateAndApplyIndustryPrompt(mode, { activate: task.activate !== false });
    const activated = task.activate !== false;
    new obsidian.Notice("已创建自定义提示词「" + tpl.name + "」" + (activated ? "，并设为当前默认。" : "。"), 7000);
    if (this.settingTab) {
      try { this.settingTab.display(); } catch {}
    }
  }

  // 把"生成 Prompt"作为后台任务入队。立刻返回，UI 切走也不影响。
  async enqueueGeneratePromptTask(mode, options) {
    if (!isKnownPolishMode(this.settings, mode)) throw new Error("未知的 mode：" + mode);
    const p = this.settings.industryProfile || {};
    if (!p.industry || !p.scenarios) throw new Error("请先在 AI 整理填写「行业 / 角色」和「主要工作场景」");
    if (!this.settings.llmApiKey) throw new Error("请先在 API 页配置大模型服务");
    const existing = this.queue.findActiveGeneratePromptTask(mode);
    if (existing) {
      const meta = getModeMeta(this.settings, mode);
      new obsidian.Notice("已存在生成任务：参考「" + (meta.prefix || mode) + "」的自定义提示词正在队列中", 5000);
      return existing;
    }
    const task = await this.queue.add({
      type: "generate-prompt",
      mode,
      activate: !options || options.activate !== false,
    });
    const meta = getModeMeta(this.settings, mode);
    new obsidian.Notice("已加入后台队列：参考「" + (meta.prefix || mode) + "」生成自定义提示词（切换页面不会中断）", 5000);
    try { this.recorder.emit(); } catch {}
    // 立刻拉起队列处理（不 await，让调用方立刻返回）
    this.queue.processAll()
      .catch((e) => console.error("[LexVoice] queue processAll", e))
      .finally(() => { try { this.recorder.emit(); } catch {} });
    return task;
  }
}

const LV_SETTINGS_TABS = [
  { id: "home",     label: "LexVoice" },
  { id: "general",  label: "常规" },
  { id: "api",      label: "API" },
  { id: "ai",       label: "AI 整理" },
  { id: "advanced", label: "进阶" },
  { id: "updates",  label: "更新" },
];

class LexVoiceSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.activeTab = "home";
    this._advancedTapCount = 0;
    this._advancedTapAt = 0;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();

    const tabBar = containerEl.createDiv({ cls: "lexvoice-settings-tabs" });
    for (const tab of LV_SETTINGS_TABS) {
      const btn = tabBar.createEl("button", { text: tab.label });
      if (this.activeTab === tab.id) btn.addClass("is-active");
      btn.onclick = () => this.handleSettingsTabClick(tab.id);
    }

    const content = containerEl.createDiv({ cls: "lexvoice-settings-content" });
    switch (this.activeTab) {
      case "home":     this.renderHome(content); break;
      case "general":  this.renderGeneral(content); break;
      case "api":      this.renderApi(content); break;
      case "ai":       this.renderAI(content); break;
      case "advanced": this.renderAdvanced(content); break;
      case "updates":  this.renderUpdates(content); break;
    }
  }

  handleSettingsTabClick(tabId) {
    if (tabId !== "advanced") {
      this._advancedTapCount = 0;
      this._advancedTapAt = 0;
    }
    this.activeTab = tabId;
    this.display();
    if (tabId === "advanced") {
      this.handleAdvancedEasterEggTap().catch((e) => console.error("[LexVoice] HR easter egg failed", e));
    }
  }

  async handleAdvancedEasterEggTap() {
    if (isRecruitFeatureUnlocked(this.plugin.settings)) return;
    const now = Date.now();
    if (!this._advancedTapAt || now - this._advancedTapAt > 4500) this._advancedTapCount = 0;
    this._advancedTapAt = now;
    this._advancedTapCount = (this._advancedTapCount || 0) + 1;
    if (this._advancedTapCount < 5) return;

    this._advancedTapCount = 0;
    this.plugin.settings.recruitFeatureUnlocked = true;
    await this.plugin.saveSettings();
    this.plugin.refreshOutlineView();
    this.display();
    this.showHrUnlockFireworks();
    new obsidian.Notice("尊贵的内部用户，您已成功解锁 LexVoice 4 HR", 6000);
  }

  showHrUnlockFireworks() {
    const { containerEl } = this;
    if (!containerEl) return;
    const old = containerEl.querySelector(".lexvoice-hr-unlock-burst");
    if (old) old.remove();

    const burst = containerEl.createDiv({ cls: "lexvoice-hr-unlock-burst" });
    const sparks = burst.createDiv({ cls: "lexvoice-hr-unlock-sparks" });
    const points = [
      [-160, -92], [-118, -132], [-66, -158], [0, -176], [74, -150], [130, -106],
      [166, -42], [152, 44], [108, 104], [42, 146], [-36, 146], [-108, 104],
      [-154, 34], [-132, -36], [-72, -86], [82, -72], [44, 82], [-48, 74],
    ];
    points.forEach(([x, y], i) => {
      const spark = sparks.createDiv({ cls: "lexvoice-hr-spark" });
      spark.style.setProperty("--x", x + "px");
      spark.style.setProperty("--y", y + "px");
      spark.style.setProperty("--d", (i % 5) * 38 + "ms");
    });

    const card = burst.createDiv({ cls: "lexvoice-hr-unlock-card" });
    card.createDiv({ cls: "lexvoice-hr-unlock-kicker", text: "尊贵的内部用户" });
    card.createDiv({ cls: "lexvoice-hr-unlock-title", text: "您已成功解锁 LexVoice 4 HR" });
    card.createDiv({ cls: "lexvoice-hr-unlock-copy", text: "招聘评估模式已加入下拉，可在提示词管理中调整。" });

    window.setTimeout(() => burst.remove(), 2000);
  }

  renderDataRiskNotice(parent, variant = "") {
    const cls = ["lexvoice-risk-notice", variant].filter(Boolean).join(" ");
    const box = parent.createDiv({ cls });
    box.createDiv({ cls: "lexvoice-risk-title", text: "数据与云端 API 风险提示" });
    box.createDiv({
      cls: "lexvoice-risk-body",
      text: "LexVoice 没有自有云端存储，也不会把录音上传到 LexVoice 服务器；录音文件只保存在你选择的本地 Obsidian 库路径。转写和 AI 整理时，音频、转写文本和 Prompt 会发送给你自己配置的云端 API 或本地模型。请按内容敏感度选择服务；涉密、隐私、客户资料、医疗、法务、人事等内容建议使用本地转写和本地大模型，不要通过云端 API 处理。",
    });
  }

  async applyBeginnerDefaults() {
    const speechDefaults = DEFAULT_SETTINGS.transcribeProviders.siliconflow;
    const currentSpeech = (this.plugin.settings.transcribeProviders || {}).siliconflow || {};
    this.plugin.settings.transcribeProviders.siliconflow = Object.assign({}, currentSpeech, {
      name: currentSpeech.name || speechDefaults.name,
      endpoint: speechDefaults.endpoint,
      model: speechDefaults.model,
      language: currentSpeech.language || speechDefaults.language || "auto",
    });
    this.plugin.settings.activeTranscribeProvider = "siliconflow";

    const llmPreset = getLlmServicePreset("siliconflow");
    if (llmPreset) {
      this.plugin.settings.llmServicePreset = llmPreset.id;
      this.plugin.settings.llmEndpoint = llmPreset.endpoint;
    }
    if (!this.plugin.settings.llmApiKey && currentSpeech.apiKey) {
      this.plugin.settings.llmApiKey = currentSpeech.apiKey;
    }
    await this.plugin.saveSettings();
  }

  async restoreTranscribeProviderDefaults(providerId) {
    const defaults = DEFAULT_SETTINGS.transcribeProviders[providerId];
    if (!defaults) return false;
    const current = (this.plugin.settings.transcribeProviders || {})[providerId] || {};
    this.plugin.settings.transcribeProviders[providerId] = Object.assign({}, current, {
      name: current.name || defaults.name,
      endpoint: defaults.endpoint || "",
      model: defaults.model || "",
      language: defaults.language || "",
      targetLanguage: current.targetLanguage || defaults.targetLanguage || "zh",
    });
    await this.plugin.saveSettings();
    return true;
  }

  async autoConfigureAudioInput() {
    const info = await enumerateAudioDevices();
    const virtual = info.virtualCables && info.virtualCables[0];
    const hasMic = info.mics && info.mics.length > 0;
    if (virtual) {
      this.plugin.settings.selectedVirtualDevice = virtual.deviceId;
      this.plugin.settings.captureMode = hasMic ? "mix-virtual" : "virtualCable";
      await this.plugin.saveSettings();
      new obsidian.Notice(`已选择：${audioInputModeLabel(this.plugin.settings.captureMode)}（${virtual.label || "虚拟声卡"}）`, 6000);
      return;
    }
    this.plugin.settings.selectedVirtualDevice = "";
    this.plugin.settings.captureMode = "mic";
    await this.plugin.saveSettings();
    const msg = info.permissionRequired
      ? "未获得音频权限或未检测到电脑音频输入，已保持「仅麦克风」。如需录 B 站客户端、浏览器视频或系统声音，请先授权并配置虚拟声卡。"
      : "未检测到电脑音频输入，已保持「仅麦克风」。如需录 B 站客户端、浏览器视频或系统声音，请先配置虚拟声卡。";
    new obsidian.Notice(msg, 7000);
  }

  renderHome(c) {
    const page = c.createDiv({ cls: "lexvoice-home" });
    const jump = (tab) => { this.activeTab = tab; this.display(); };
    const hasSpeechProvider = (() => {
      const id = this.plugin.settings.activeTranscribeProvider || "siliconflow";
      const p = (this.plugin.settings.transcribeProviders || {})[id] || {};
      // 从 provider profile 取 requiresKey，避免硬编码与 profile 不一致
      const profile = this.getTranscribeProviderProfile(id, p);
      const needsKey = !!profile.requiresKey;
      return !!(p.endpoint && p.model && (!needsKey || p.apiKey));
    })();
    const hasLlm = !!(this.plugin.settings.llmEndpoint && this.plugin.settings.llmModel && (this.plugin.settings.llmApiKey || isLocalLlmEndpoint(this.plugin.settings.llmEndpoint)));
    const dailyOn = this.plugin.settings.writeDailyMeetingOverview !== false;

    const head = page.createDiv({ cls: "lexvoice-home-head" });
    const titleLine = head.createDiv({ cls: "lexvoice-home-title-line" });
    titleLine.createEl("h2", { text: "LexVoice" });
    titleLine.createDiv({ cls: "lexvoice-home-version", text: this.plugin.manifest.version || "" });
    head.createDiv({
      cls: "lexvoice-home-summary",
      text: "在 Obsidian 桌面端完成录音、转写与 AI 整理：支持后台录制、流式或切片转写，自动按业务模式整理为可检索的 Markdown 纪要。配置一个语音转写服务即可使用；如需自动生成结构化纪要、待办与翻译，再配置一个大模型服务。",
    });
    const primary = head.createDiv({ cls: "lexvoice-home-actions" });
    const apiBtn = primary.createEl("button", { text: "配置 API" });
    apiBtn.addClass("mod-cta");
    apiBtn.onclick = () => jump("api");
    const quickBtn = primary.createEl("button", { text: "使用入门配置" });
    quickBtn.onclick = async () => {
      await this.applyBeginnerDefaults();
      new obsidian.Notice("已切换为入门连接配置：硅基流动转写 + 硅基流动大模型服务。请填写访问密钥和模型标识后测试连接。", 7000);
      jump("api");
    };
    const aiBtn = primary.createEl("button", { text: hasLlm ? "AI 整理设置" : "配置大模型" });
    aiBtn.onclick = () => jump(hasLlm ? "ai" : "api");
    const panelBtn = primary.createEl("button", { text: "打开实时面板" });
    panelBtn.onclick = () => this.plugin.openOutlineView();

    const prep = page.createDiv({ cls: "lexvoice-home-block" });
    prep.createEl("h3", { text: "前置准备" });
    const prepGrid = prep.createDiv({ cls: "lexvoice-home-prep-grid" });
    const prepItems = [
      {
        name: "语音转写服务",
        need: "必填",
        price: "云端付费 / 本地免费",
        desc: "将录音转换为原始文字。可选择云端转写服务或本地 Whisper、SenseVoice 等服务；对数据本地化有要求时优先考虑本地部署。",
        action: "配置转写服务",
        target: "api",
        status: hasSpeechProvider ? "已配置" : "未配置",
        statusClass: hasSpeechProvider ? "is-ready" : "is-required",
      },
      {
        name: "大模型 LLM API",
        need: "推荐",
        price: "按量付费",
        desc: "将原始转写整理为会议纪要、待办或访谈记录。未配置时仅保留转写文本，不会进行结构化整理。",
        action: "配置大模型服务",
        target: "api",
        status: hasLlm ? "已配置" : "未配置",
        statusClass: hasLlm ? "is-ready" : "is-required",
      },
      {
        name: "电脑音频捕获",
        need: "会议/视频适用",
        price: "可免费",
        desc: "仅录制本人声音时无需配置。如需采集会议对方声音、B 站客户端、浏览器视频或 YouTube 音频，需要把播放声音输出到电脑音频输入（虚拟声卡），并配置真实扬声器/耳机监听。",
        action: "查看设备指引",
        target: "advanced",
        status: "按需准备",
        statusClass: "is-neutral",
      },
      {
        name: "Obsidian 日记",
        need: "可选",
        price: "免费",
        desc: "启用后，处理完成时会将「今日会议概要」与待办写入当日日记；若文件不存在，按日记插件配置的路径与模板自动创建。",
        action: "设置日记概要",
        target: "general",
        status: dailyOn ? "已开启" : "未开启",
        statusClass: dailyOn ? "is-ready" : "is-neutral",
      },
    ];
    for (const item of prepItems) {
      const card = prepGrid.createDiv({ cls: "lexvoice-home-prep" });
      card.createDiv({ cls: "lexvoice-home-prep-name", text: item.name });
      const meta = card.createDiv({ cls: "lexvoice-home-prep-meta" });
      meta.createDiv({ cls: "lexvoice-home-chip" + (item.need === "必填" ? " is-required" : item.need === "推荐" ? " is-recommended" : ""), text: item.need });
      meta.createDiv({ cls: "lexvoice-home-chip is-cost", text: item.price });
      card.createDiv({ cls: "lexvoice-home-prep-desc", text: item.desc });
      const actions = card.createDiv({ cls: "lexvoice-home-prep-actions" });
      actions.createDiv({ cls: "lexvoice-home-status " + item.statusClass, text: item.status });
      const btn = actions.createEl("button", { text: item.action });
      btn.onclick = () => jump(item.target);
    }

    const route = page.createDiv({ cls: "lexvoice-home-block" });
    route.createEl("h3", { text: "推荐配置路径" });
    const routeRows = [
      ["必填", "配置语音转写", "确保单次录音可顺利完成转写。保存后在 API 页执行连通性测试；云端服务需提供访问密钥，本地服务需提前启动。", hasSpeechProvider ? "已配置" : "去配置", "api"],
      ["推荐", "配置 LLM API", "用于生成会议纪要、标题、待办、翻译及优化自定义提示词。未配置时 LexVoice 仅保留原始转写。", hasLlm ? "已配置" : "去配置", "api"],
      ["建议", "确认保存路径与音频输入方式", "默认录音保存于 LexVoice/录音，纪要保存于 LexVoice/转写纪要；学习视频或会议音频建议先配置「电脑音频输入 + 真实扬声器/耳机监听」。", "去设置", "general"],
    ];
    const BADGE_CLASS = {
      "必填": "is-required",
      "推荐": "is-recommended",
      "建议": "is-suggested",
    };
    for (const [badge, name, desc, btnText, target] of routeRows) {
      const row = new obsidian.Setting(route)
        .setName(name)
        .setDesc(desc);
      const cls = ["lexvoice-home-row-badge", BADGE_CLASS[badge] || ""].filter(Boolean).join(" ");
      row.nameEl.createSpan({ cls, text: badge });
      row.addButton((btn) => btn.setButtonText(btnText).onClick(() => jump(target)));
    }

    const better = page.createDiv({ cls: "lexvoice-home-block" });
    better.createEl("h3", { text: "进阶能力" });
    const betterRows = [
      ["转写提示词", "在 AI 整理中管理内置提示词和自定义提示词；自定义提示词会出现在录音、导入和重新整理的选择列表里。", hasLlm ? "去管理" : "先配大模型", hasLlm ? "ai" : "api"],
      ["多语种会议整理", "在 AI 整理中启用纪要翻译，可由大模型在整理阶段统一输出至目标语言，或保留关键原文形成双语纪要。", "去设置", "ai"],
      ["专有名词词库", "将人名、公司名、产品名与项目名加入词库，提升转写阶段的识别准确率，适合术语密集的团队、客户与行业场景。", "打开词库设置", "ai"],
      ["自动更新", "从 LexVoice 官方 GitHub 仓库检查新版本并增量更新；本地设置、保存路径与自定义 Prompt 不会被覆盖。", "去更新", "updates"],
    ];
    for (const [name, desc, btnText, target] of betterRows) {
      new obsidian.Setting(better)
        .setName(name)
        .setDesc(desc)
        .addButton((btn) => btn.setButtonText(btnText).onClick(() => jump(target)));
    }

    const footer = page.createDiv({ cls: "lexvoice-home-footnote" });
    footer.setText("费用说明：LexVoice 插件本身免费。云端转写与 LLM 服务由对应平台按量计费；本地模型不产生平台费用，但需自行安装、启动与维护。");
  }

  renderGeneral(c) {
    new obsidian.Setting(c).setName("默认音频输入")
      .setDesc("仅录本人声音选「仅麦克风」。看 B 站客户端、浏览器视频或课程时选「仅电脑音频」；线上会议或边听边讲解时选「麦克风加电脑音频」。")
      .addDropdown(d => d.addOption("mic", "仅麦克风")
        .addOption("mix-virtual", "麦克风加电脑音频")
        .addOption("virtualCable", "仅电脑音频")
        .setValue(normalizeAudioInputMode(this.plugin.settings.captureMode || "mic"))
        .onChange(async v => { this.plugin.settings.captureMode = normalizeAudioInputMode(v); await this.plugin.saveSettings(); }))
      .addButton(b => b.setButtonText("自动选择").onClick(async () => {
        await this.autoConfigureAudioInput();
        this.display();
      }))
      .addButton(b => b.setButtonText("电脑音频指引").onClick(() => new VirtualCableSetupModal(this.app, this.plugin).open()));

    new obsidian.Setting(c).setName("LexVoice 录音文件夹")
      .setDesc("vault 内相对路径。录音文件默认保存到 LexVoice/录音，可按需要改成其他位置。")
      .addText(t => t
        .setPlaceholder("LexVoice/录音")
        .setValue(this.plugin.settings.audioFolder)
        .onChange(async v => { this.plugin.settings.audioFolder = v.trim() || DEFAULT_SETTINGS.audioFolder; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("LexVoice 转写纪要文件夹")
      .setDesc("vault 内相对路径。转写和整理后的纪要默认保存到 LexVoice/转写纪要，可按需要改成其他位置。")
      .addText(t => t
        .setPlaceholder("LexVoice/转写纪要")
        .setValue(this.plugin.settings.mdFolder)
        .onChange(async v => { this.plugin.settings.mdFolder = v.trim() || DEFAULT_SETTINGS.mdFolder; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("笔记文件名格式")
      .setDesc("每次录音生成一篇独立笔记。使用 moment.js 格式占位符，例如 YYYY-MM-DD HHmm。")
      .addText(t => t.setValue(this.plugin.settings.noteFileNameFormatNew).onChange(async v => { this.plugin.settings.noteFileNameFormatNew = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("完成后自动打开笔记")
      .addToggle(t => t.setValue(this.plugin.settings.autoOpenNoteAfterFinish).onChange(async v => { this.plugin.settings.autoOpenNoteAfterFinish = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("写入今日会议概要到日记")
      .setDesc("Obsidian 日记已启用时，处理完成后写入纪要链接、概要；识别到待办时用 - [ ] 任务语法写入。如果今天的日记文件不存在，会按日记插件配置的路径与模板自动创建。")
      .addToggle(t => t.setValue(this.plugin.settings.writeDailyMeetingOverview !== false).onChange(async v => { this.plugin.settings.writeDailyMeetingOverview = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("悬浮气泡")
      .setDesc("常驻停靠显示，可拖动到任意位置；关闭此项才隐藏悬浮气泡。")
      .addToggle(t => t.setValue(this.plugin.settings.showFloatingBall).onChange(async v => {
        this.plugin.settings.showFloatingBall = v; await this.plugin.saveSettings();
        this.plugin.syncBubbleVisibility();
      }));
  }



  getTranscribeProviderProfile(id, provider) {
    return this.plugin.getTranscribeProviderProfile(id, provider);
  }

  renderTranscribeProviderGuide(c, activeId, provider, profile) {
    const p = provider || {};
    const needsKey = !!profile.requiresKey;
    const ready = !!(p.endpoint && p.model && (!needsKey || p.apiKey));
    const missing = [];
    if (!p.endpoint) missing.push("服务地址");
    if (!p.model) missing.push("模型名称");
    if (needsKey && !p.apiKey) missing.push("访问密钥");

    const panel = c.createDiv({ cls: "lexvoice-provider-panel" });
    const head = panel.createDiv({ cls: "lexvoice-provider-head" });
    const titleWrap = head.createDiv({ cls: "lexvoice-provider-title-wrap" });
    titleWrap.createDiv({ cls: "lexvoice-provider-title", text: profile.title });
    titleWrap.createDiv({ cls: "lexvoice-provider-subtitle", text: profile.description });
    const badges = head.createDiv({ cls: "lexvoice-provider-badges" });
    badges.createDiv({ cls: "lexvoice-provider-badge", text: profile.badge });
    badges.createDiv({ cls: ready ? "lexvoice-provider-status is-ready" : "lexvoice-provider-status is-missing", text: ready ? "已填写" : "待填写" });

    const body = panel.createDiv({ cls: "lexvoice-provider-body" });
    const checklist = body.createEl("ol", { cls: "lexvoice-provider-checklist" });
    for (const step of profile.steps || []) checklist.createEl("li", { text: step });
    if (missing.length) {
      body.createDiv({ cls: "lexvoice-provider-missing", text: "还需要填写：" + missing.join("、") });
    }
    if (profile.priceHint) {
      body.createDiv({ cls: "lexvoice-provider-price", text: profile.priceHint });
    }
    if (profile.note) {
      body.createDiv({ cls: "lexvoice-provider-note", text: profile.note });
    }
    if (profile.links && profile.links.length) {
      const row = body.createDiv({ cls: "lexvoice-provider-links" });
      for (const [label, url] of profile.links) {
        const btn = row.createEl("button", { text: label });
        btn.onclick = () => openLexVoiceExternalUrl(url);
      }
    }
  }

  renderApi(c) {
    new obsidian.Setting(c).setName("语音转文字").setHeading();

    this.renderDataRiskNotice(c, "is-api");

    new obsidian.Setting(c).setName("转写服务")
      .setDesc("选择当前用于语音转文字的服务。下方只显示所选服务的配置项。")
      .addDropdown(d => {
        for (const id of Object.keys(this.plugin.settings.transcribeProviders)) {
          const p = this.plugin.settings.transcribeProviders[id];
          const optProfile = this.getTranscribeProviderProfile(id, p);
          d.addOption(id, optProfile.title || id);
        }
        d.setValue(this.plugin.settings.activeTranscribeProvider || "siliconflow")
          .onChange(async v => {
            this.plugin.settings.activeTranscribeProvider = v;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    const activeId = this.plugin.settings.activeTranscribeProvider || "siliconflow";
    const provider = this.plugin.settings.transcribeProviders[activeId] || {};
    const profile = this.getTranscribeProviderProfile(activeId, provider);
    this.renderTranscribeProviderGuide(c, activeId, provider, profile);
    const writeProvider = async (key, val) => {
      this.plugin.settings.transcribeProviders[activeId][key] = val;
      await this.plugin.saveSettings();
    };

    new obsidian.Setting(c).setName("当前转写服务").setHeading();

    new obsidian.Setting(c).setName(profile.requiresKey ? "访问密钥" : "访问密钥（可选）")
      .setDesc(profile.keyHelp)
      .addText(t => { t.inputEl.type = "password"; t.setValue(provider.apiKey || "").onChange(v => writeProvider("apiKey", v)); });

    new obsidian.Setting(c).setName("服务地址")
      .setDesc(profile.endpointHelp)
      .addText(t => t.setValue(provider.endpoint || "")
        .setPlaceholder(profile.endpointPlaceholder || "")
        .onChange(v => writeProvider("endpoint", v.trim())));

    new obsidian.Setting(c).setName("模型名称")
      .setDesc(profile.modelHelp)
      .addText(t => t.setValue(provider.model || "")
        .setPlaceholder(profile.modelPlaceholder || "")
        .onChange(v => writeProvider("model", v.trim())));

    new obsidian.Setting(c).setName("识别语言")
      .setDesc("留空或 auto 表示自动检测；中文通常填 zh，英文填 en。")
      .addText(t => t.setValue(provider.language || "")
        .setPlaceholder(profile.languagePlaceholder || "")
        .onChange(v => writeProvider("language", v.trim())));

    if (activeId !== "custom") {
      new obsidian.Setting(c).setName("推荐连接信息")
        .setDesc("如果误改了服务地址、模型名称或识别语言，可恢复当前服务的推荐值；不会覆盖访问密钥。")
        .addButton(b => b.setButtonText("恢复推荐值").onClick(async () => {
          const ok = await this.restoreTranscribeProviderDefaults(activeId);
          new obsidian.Notice(ok ? "已恢复当前转写服务的推荐连接信息，不会覆盖访问密钥。" : "当前服务没有内置推荐值。", 6000);
          this.display();
        }));
    }

    if (profile.showTargetLanguage) {
      const targetLanguages = [
        ["en", "英语 English"],
        ["zh", "中文 Chinese"],
        ["ja", "日语 日本語"],
        ["ko", "韩语 한국어"],
        ["fr", "法语 Français"],
        ["es", "西班牙语 Español"],
        ["de", "德语 Deutsch"],
        ["it", "意大利语 Italiano"],
        ["pt", "葡萄牙语 Português"],
        ["ru", "俄语 Русский"],
        ["ar", "阿拉伯语 العربية"],
        ["hi", "印地语 हिन्दी"],
        ["tr", "土耳其语 Türkçe"],
      ];
      new obsidian.Setting(c).setName("目标语言（翻译输出）")
        .setDesc("选择 LexVoice 把语音翻译成哪种语言。说话人语言会自动检测。")
        .addDropdown(d => {
          for (const [code, label] of targetLanguages) d.addOption(code, label);
          d.setValue(provider.targetLanguage || "zh")
            .onChange(v => writeProvider("targetLanguage", v));
        });
    }

    if (profile.transcribeMode === "streaming") {
      const tip = c.createDiv({ cls: "lexvoice-provider-streaming-tip" });
      tip.setText("流式模式：跳过分段切片，整段录音走一条 WebSocket 实时推流。下方「分段间隔」「即时分段」对此服务不生效。");
    }

    new obsidian.Setting(c).setName("连通性测试")
      .setDesc("用一段 1 秒静音音频验证当前转写服务是否可用。")
      .addButton(b => b.setButtonText("测试").onClick(async () => {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          const dest = ctx.createMediaStreamDestination();
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(dest);
          src.start();
          const rec = new MediaRecorder(dest.stream);
          const chunks = [];
          rec.ondataavailable = (e) => chunks.push(e.data);
          await new Promise((resolve) => {
            rec.onstop = resolve;
            rec.start();
            setTimeout(() => rec.stop(), 1000);
          });
          await ctx.close();
          const blob = new Blob(chunks, { type: rec.mimeType });
          new obsidian.Notice("测试中…");
          const text = await transcribeAudio(this.plugin, blob, blob.type);
          new obsidian.Notice(`连通成功（返回：${(text || "<空>").slice(0, 30)}）`);
        } catch (e) {
          new obsidian.Notice(`测试失败：${e.message || e}`);
        }
      }));

    new obsidian.Setting(c).setName("AI 整理服务").setHeading();

    const activeLlmPresetId = getActiveLlmServicePresetId(this.plugin.settings);
    const activeLlmPreset = getLlmServicePreset(activeLlmPresetId);
    new obsidian.Setting(c).setName("服务预设")
      .setDesc("用于快速填入服务地址和必要的请求头适配，不会覆盖访问密钥。模型标识请按对应服务商或中转站控制台填写。")
      .addDropdown(d => {
        d.addOption("", "自定义服务…");
        for (const preset of LLM_SERVICE_PRESETS) d.addOption(preset.id, preset.label);
        d.setValue(activeLlmPresetId || "");
        d.onChange(async id => {
          const preset = getLlmServicePreset(id);
          this.plugin.settings.llmServicePreset = id || "";
          if (!preset) {
            await this.plugin.saveSettings();
            this.display();
            return;
          }
          if (preset.endpoint) this.plugin.settings.llmEndpoint = preset.endpoint;
          if (id === "siliconflow" && !this.plugin.settings.llmApiKey) {
            const sfKey = ((this.plugin.settings.transcribeProviders || {}).siliconflow || {}).apiKey || "";
            if (sfKey) this.plugin.settings.llmApiKey = sfKey;
          }
          await this.plugin.saveSettings();
          new obsidian.Notice(`已应用服务预设：${preset.label}。请确认访问密钥和模型标识后测试连接。`, 6000);
          this.display();
        });
      });

    const llmEndpointHelp = activeLlmPreset && activeLlmPreset.endpointHelp
      ? activeLlmPreset.endpointHelp
      : "填写 OpenAI Chat Completions 兼容地址。可填完整 /v1/chat/completions；如果服务只提供 Base URL，填到 /v1 或根地址即可。";
    const llmKeyHelp = activeLlmPreset && activeLlmPreset.keyHelp
      ? activeLlmPreset.keyHelp
      : "填写服务商或中转站提供的 API Key。本地 localhost 大模型服务可留空。";
    const llmModelHelp = activeLlmPreset && activeLlmPreset.modelHelp
      ? activeLlmPreset.modelHelp
      : "填写服务要求的 model 名称；Poe、OpenRouter 等中转站请以其控制台或模型列表显示的名称为准。";

    new obsidian.Setting(c).setName("服务地址")
      .setDesc(llmEndpointHelp)
      .addText(t => t.setValue(this.plugin.settings.llmEndpoint).onChange(async v => {
        this.plugin.settings.llmEndpoint = v;
        this.plugin.settings.llmServicePreset = inferLlmServicePresetId(this.plugin.settings);
        await this.plugin.saveSettings();
      }));

    const llmKeyRow = new obsidian.Setting(c).setName("访问密钥")
      .setDesc(llmKeyHelp)
      .addText(t => { t.inputEl.type = "password"; t.setValue(this.plugin.settings.llmApiKey).onChange(async v => { this.plugin.settings.llmApiKey = v; await this.plugin.saveSettings(); }); });
    const sfSpeechKey = ((this.plugin.settings.transcribeProviders || {}).siliconflow || {}).apiKey || "";
    if (sfSpeechKey && !this.plugin.settings.llmApiKey && /siliconflow\.cn/i.test(this.plugin.settings.llmEndpoint || "")) {
      llmKeyRow.addButton(b => b.setButtonText("复用转写密钥").onClick(async () => {
        this.plugin.settings.llmApiKey = sfSpeechKey;
        await this.plugin.saveSettings();
        new obsidian.Notice("已复用硅基流动转写密钥到大模型服务。", 5000);
        this.display();
      }));
    }

    new obsidian.Setting(c).setName("模型标识")
      .setDesc(llmModelHelp)
      .addText(t => {
        t.setPlaceholder(activeLlmPreset && activeLlmPreset.modelPlaceholder ? activeLlmPreset.modelPlaceholder : "例如：服务商控制台显示的模型标识");
        t.setValue(this.plugin.settings.llmModel);
        t.onChange(async v => { this.plugin.settings.llmModel = v; await this.plugin.saveSettings(); });
      });

    new obsidian.Setting(c).setName("大模型连通性测试")
      .setDesc("发送一条极短文本请求，验证服务地址、访问密钥和模型名称是否匹配；不会上传录音、转写文本或 Prompt。")
      .addButton(b => b.setButtonText("测试连接").onClick(async () => {
        b.setDisabled(true);
        b.setButtonText("测试中…");
        try {
          const result = await testLlmConnection(this.plugin);
          new obsidian.Notice(`大模型连通成功：${result.model || "未命名模型"}（返回：${result.preview || "<空>"}）`, 7000);
        } catch (e) {
          new obsidian.Notice(`大模型测试失败：${e.message || e}`, 8000);
        } finally {
          b.setButtonText("测试连接");
          b.setDisabled(false);
        }
      }));

    new obsidian.Setting(c).setName("默认润色模式")
      .setDesc("不在工作台单独切换时所有录音用此模式整理。")
      .addDropdown(d => {
        for (const [key, label] of getVisibleModeEntries(this.plugin.settings, true)) d.addOption(key, label);
        d.setValue(getEffectivePolishMode(this.plugin.settings, this.plugin.settings.polishMode, "meeting"));
        d.onChange(async v => { this.plugin.settings.polishMode = v; await this.plugin.saveSettings(); });
      });
  }

  renderAI(c) {
    if (!this.plugin.settings.industryProfile) this.plugin.settings.industryProfile = {};

    new obsidian.Setting(c).setName("结构化程度").setHeading();
    const structHint = c.createDiv({ cls: "setting-item-description lexvoice-section-hint" });
    structHint.setText("控制 AI 在整理纪要时的层级提炼力度。所有模式都受此设置影响。");

    new obsidian.Setting(c).setName("结构化程度")
      .setDesc("宽松：散文为主，仅必要时分点。均衡：散文加 1–2 级列表（推荐）。严谨：多层嵌套列表（最多 3 级），把口语化叙述提炼为论点—支撑—证据。")
      .addDropdown(d => d
        .addOption("loose", "宽松（散文为主）")
        .addOption("balanced", "均衡（推荐）")
        .addOption("strict", "严谨（多层嵌套）")
        .setValue(this.plugin.settings.briefingStructureLevel || "balanced")
        .onChange(async v => {
          this.plugin.settings.briefingStructureLevel = v;
          await this.plugin.saveSettings();
        }));

    new obsidian.Setting(c).setName("纪要翻译与语言").setHeading();
    const langHint = c.createDiv({ cls: "setting-item-description lexvoice-section-hint" });
    langHint.setText("用于多语种会议。原始转写保持原文；翻译和统一语言只发生在 AI 整理后的纪要里。");

    new obsidian.Setting(c).setName("语言策略")
      .setDesc("默认跟随原文。开启后由大模型在整理纪要时统一语言。")
      .addDropdown(d => d
        .addOption("off", "跟随原文（不翻译）")
        .addOption("translate", "统一为目标语言")
        .addOption("bilingual", "目标语言为主，关键原文括注")
        .setValue(this.plugin.settings.briefingTranslationMode || "off")
        .onChange(async v => { this.plugin.settings.briefingTranslationMode = v; await this.plugin.saveSettings(); this.display(); }));

    if ((this.plugin.settings.briefingTranslationMode || "off") !== "off") {
      new obsidian.Setting(c).setName("目标语言")
        .addDropdown(d => d
          .addOption("zh-CN", "中文")
          .addOption("en", "English")
          .addOption("ja", "日本語")
          .addOption("ko", "한국어")
          .addOption("custom", "自定义")
          .setValue(this.plugin.settings.briefingTargetLanguage || "zh-CN")
          .onChange(async v => { this.plugin.settings.briefingTargetLanguage = v; await this.plugin.saveSettings(); this.display(); }));

      if ((this.plugin.settings.briefingTargetLanguage || "zh-CN") === "custom") {
        new obsidian.Setting(c).setName("自定义目标语言")
          .setDesc("例如：繁体中文、Deutsch、Français。")
          .addText(t => t.setValue(this.plugin.settings.briefingCustomLanguage || "")
            .onChange(async v => { this.plugin.settings.briefingCustomLanguage = v.trim(); await this.plugin.saveSettings(); }));
      }

      new obsidian.Setting(c).setName("保留专有名词原文")
        .setDesc("人名、公司名、模型名、代码标识、英文缩写等优先保留原写法，避免翻译后失真。")
        .addToggle(t => t.setValue(this.plugin.settings.briefingKeepOriginalTerms !== false)
          .onChange(async v => { this.plugin.settings.briefingKeepOriginalTerms = v; await this.plugin.saveSettings(); }));

      new obsidian.Setting(c).setName("额外语言要求");
      const langTa = c.createEl("textarea", { cls: "lexvoice-textarea" });
      langTa.value = this.plugin.settings.briefingLanguageInstruction || "";
      langTa.placeholder = "例如：日文发言保留原文括注；英文术语不要翻译；输出为繁体中文。";
      langTa.rows = 3;
      langTa.addEventListener("change", async () => {
        this.plugin.settings.briefingLanguageInstruction = langTa.value.trim();
        await this.plugin.saveSettings();
      });
    }

    new obsidian.Setting(c).setName("转写提示词管理").setHeading();
    const sceneHint = c.createDiv({ cls: "setting-item-description lexvoice-section-hint" });
    sceneHint.setText("提示词决定一段音频最终被整理成什么成果。内置提示词负责开箱即用；你的职业化规则、固定格式和长期工作流，可以存成自定义提示词。");

    const currentMode = getEffectivePolishMode(this.plugin.settings, this.plugin.settings.polishMode, "meeting");
    const currentMeta = getModeMeta(this.plugin.settings, currentMode);
    new obsidian.Setting(c).setName("当前默认提示词")
      .setDesc((currentMeta.label || currentMeta.prefix) + "。录音、导入音频和重新整理都会优先使用这个默认值；具体操作时仍可临时切换。")
      .addDropdown(d => {
        for (const [key, label] of getVisibleModeEntries(this.plugin.settings, false)) d.addOption(key, label);
        d.setValue(currentMode);
        d.onChange(async v => { this.plugin.settings.polishMode = v; await this.plugin.saveSettings(); this.display(); });
      })
      .addButton(b => b.setButtonText("管理提示词").setCta().onClick(() => {
        const modal = new PromptTemplateModal(this.app, this.plugin);
        const origClose = modal.onClose.bind(modal);
        modal.onClose = () => { origClose(); this.display(); };
        modal.open();
      }));

    const customScenes = getCustomPromptModeTemplates(this.plugin.settings);
    const sceneSummary = c.createDiv({ cls: "lexvoice-scene-summary" });
    sceneSummary.createDiv({ cls: "lexvoice-scene-summary-main", text: "可用提示词：" + getVisiblePolishModeKeys(this.plugin.settings).length + " 个，其中自定义 " + customScenes.length + " 个" });
    sceneSummary.createDiv({ cls: "lexvoice-scene-summary-sub", text: "建议只为真实会反复使用的任务创建自定义提示词，例如产品需求访谈、投研电话会、课程学习笔记、客户复盘。" });

    new obsidian.Setting(c)
      .setName("提示词库")
      .setDesc("查看内置提示词，新建或编辑自定义提示词，并把常用条目设为默认。")
      .addButton(b => b.setButtonText("打开提示词管理").setCta().onClick(() => {
        const modal = new PromptTemplateModal(this.app, this.plugin);
        const origClose = modal.onClose.bind(modal);
        modal.onClose = () => {
          origClose();
          this.display();
        };
        modal.open();
      }));

    new obsidian.Setting(c).setName("领域词汇表").setHeading();
    const vocabHint = c.createDiv({ cls: "setting-item-description lexvoice-section-hint" });
    vocabHint.setText("默认保存为 LexVoice/词汇表.md。转写时会自动注入到 ASR prompt 上下文，用于提升人名、品牌名、项目名和行业术语的识别准确度。");

    const vocabPathSetting = new obsidian.Setting(c).setName("词汇表文件路径")
      .addText(t => t.setValue(this.plugin.settings.vocabularyFile || "")
        .setPlaceholder("LexVoice/词汇表.md")
        .onChange(async v => { this.plugin.settings.vocabularyFile = v; await this.plugin.saveSettings(); }));

    const refreshStatus = async () => {
      const path = this.plugin.settings.vocabularyFile;
      if (!path) { vocabPathSetting.setDesc("当前未指定路径。"); return; }
      const norm = obsidian.normalizePath(path);
      const file = this.plugin.app.vault.getAbstractFileByPath(norm);
      if (!(file instanceof obsidian.TFile)) {
        vocabPathSetting.setDesc(`文件不存在，提取或打开时会自动创建。`);
        return;
      }
      try {
        const content = await this.plugin.app.vault.cachedRead(file);
        const groups = parseVocabularyGroups(content);
        vocabPathSetting.setDesc(`当前 ${countVocabularyGroups(groups)} 个词汇（${summarizeVocabularyGroups(groups)}），文件大小 ${(file.stat.size / 1024).toFixed(1)} KB。`);
      } catch (e) {
        vocabPathSetting.setDesc(`读取失败：${e.message || e}`);
      }
    };
    refreshStatus();

    new obsidian.Setting(c).setName("打开或生成词汇表")
      .addButton(b => b.setButtonText("打开/创建").onClick(async () => {
        const path = this.plugin.settings.vocabularyFile;
        if (!path) { new obsidian.Notice("请先填写文件路径"); return; }
        const norm = obsidian.normalizePath(path);
        let file = this.plugin.app.vault.getAbstractFileByPath(norm);
        if (!(file instanceof obsidian.TFile)) {
          const folderPath = norm.includes("/") ? norm.slice(0, norm.lastIndexOf("/")) : "";
          if (folderPath) await this.plugin.ensureFolder(folderPath);
          const stub = formatVocabularyMarkdown([], this.plugin.settings.industryProfile);
          file = await this.plugin.app.vault.create(norm, stub);
          new obsidian.Notice(`已创建：${norm}`);
        }
        if (file instanceof obsidian.TFile) {
          const content = await this.plugin.app.vault.cachedRead(file);
          if (!isStructuredVocabularyMarkdown(content)) {
            await this.plugin.app.vault.modify(file, formatVocabularyMarkdown(parseVocabularyGroups(content), this.plugin.settings.industryProfile));
            new obsidian.Notice("已整理为分区词汇表");
          }
        }
        await this.plugin.app.workspace.getLeaf(false).openFile(file);
      }))
      .addButton(b => b.setButtonText("AI 重新生成").onClick(async () => {
        await this._extractVocab(false, refreshStatus);
      }))
      .addButton(b => b.setButtonText("AI 追加补充").onClick(async () => {
        await this._extractVocab(true, refreshStatus);
      }));
  }

  async _extractVocab(merge, refreshStatus) {
    if (!this.plugin.settings.llmApiKey && !isLocalLlmEndpoint(this.plugin.settings.llmEndpoint)) {
      new obsidian.Notice("请先配置大模型服务");
      return;
    }
    try {
      const list = await this.plugin.extractVocabulary(merge);
      await refreshStatus();
      new obsidian.Notice(`${merge ? "追加" : "替换"} ${list.length} 个词汇`);
    } catch (e) {
      console.error(e);
      new obsidian.Notice(`提取失败：${e.message || e}`);
    }
  }




  renderUpdates(c) {
    this.plugin.settings.updateRepoUrl = DEFAULT_SETTINGS.updateRepoUrl;
    this.plugin.settings.updateBranch = DEFAULT_SETTINGS.updateBranch;
    this.plugin.settings.updatePluginDir = DEFAULT_SETTINGS.updatePluginDir;
    this.plugin.settings.updateRawBaseUrl = DEFAULT_SETTINGS.updateRawBaseUrl;

    new obsidian.Setting(c).setName("插件更新").setHeading();
    const currentVersion = this.plugin.manifest.version || "0.0.0";
    const update = this.plugin.settings.availableUpdate;
    const rawBase = resolveUpdateRawBase(this.plugin.settings);
    const status = [
      "当前版本：" + currentVersion,
      update && update.version ? "可用版本：" + update.version : "暂无可用更新",
      this.plugin.settings.lastUpdateCheckAt ? "上次检查：" + this.plugin.settings.lastUpdateCheckAt : "尚未检查",
      this.plugin.settings.lastUpdateError ? "上次错误：" + this.plugin.settings.lastUpdateError : "",
    ].filter(Boolean).join("；");

    new obsidian.Setting(c).setName("更新状态")
      .setDesc(status);

    new obsidian.Setting(c).setName("官方发布源")
      .setDesc("LexVoice 会从官方 GitHub 仓库检查并安装更新。更新只替换插件发布文件，不会覆盖 data.json、API Key、保存路径、自定义提示词或队列数据。")
      .addButton(b => b.setButtonText("打开 GitHub").onClick(() => openLexVoiceExternalUrl(DEFAULT_SETTINGS.updateRepoUrl)))
      .addButton(b => b.setButtonText("打开 Release").onClick(() => openLexVoiceExternalUrl(DEFAULT_SETTINGS.updateRepoUrl + "/releases")));

    new obsidian.Setting(c).setName("启动时自动检查")
      .setDesc("开启后最多每 24 小时检查一次官方仓库。")
      .addToggle(t => t.setValue(this.plugin.settings.autoCheckUpdates !== false)
        .onChange(async v => { this.plugin.settings.autoCheckUpdates = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("检查与安装")
      .setDesc("推荐先点「检查更新」。发现新版本后，再点「一键增量更新」。安装前会备份当前插件文件和设置。")
      .addButton(b => b.setButtonText("检查更新").onClick(async () => {
        await this.plugin.checkForUpdates({ silent: false });
        this.display();
      }))
      .addButton(b => b.setButtonText("一键增量更新").setCta().onClick(async () => {
        try {
          await this.plugin.installAvailableUpdate();
          this.display();
        } catch (e) {
          console.error(e);
          new obsidian.Notice("LexVoice 更新失败：" + ((e && e.message) || e), 12000);
        }
      }));

    new obsidian.Setting(c).setName("版权与许可")
      .setDesc("LexVoice © 2026 Lynnx。项目以 MIT License 开源发布。第三方 API、模型和虚拟声卡工具由用户自行配置和承担费用；LexVoice 不运营云端存储，也不会上传录音到 LexVoice 服务器。");
  }

  renderAdvanced(c) {
    // ---- 录音行为 ----
    new obsidian.Setting(c).setName("录音行为").setHeading();

    new obsidian.Setting(c).setName("即时分段转写")
      .setDesc("录音过程中按设定间隔切段并实时转写。关闭则停止录音后一次性处理。")
      .addToggle(t => t.setValue(this.plugin.settings.enableInterimOutput).onChange(async v => { this.plugin.settings.enableInterimOutput = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("过滤 3 秒内录音")
      .setDesc("开启后，少于 3 秒的误触录音会直接丢弃：不保存录音文件、不创建纪要、不进入转写或 AI 整理。")
      .addToggle(t => t.setValue(this.plugin.settings.filterShortRecordings !== false).onChange(async v => { this.plugin.settings.filterShortRecordings = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("分段间隔")
      .setDesc("每隔多少分钟切一段，单位分钟。")
      .addText(t => t.setValue(String(this.plugin.settings.segmentIntervalMinutes)).onChange(async v => {
        const n = parseFloat(v); if (isFinite(n) && n >= 0.5) { this.plugin.settings.segmentIntervalMinutes = n; await this.plugin.saveSettings(); }
      }));

    new obsidian.Setting(c).setName("整合版排版")
      .setDesc("录音完成后笔记重排：顶部 AI 整合内容，底部可折叠原始分段。")
      .addToggle(t => t.setValue(this.plugin.settings.consolidatedLayout).onChange(async v => { this.plugin.settings.consolidatedLayout = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("自动加场景标签到文件名")
      .setDesc("录音、导入音频、重新整理或队列重试完成后，由 AI 提炼一个不超过 15 字的主题追加到笔记文件名。")
      .addToggle(t => t.setValue(this.plugin.settings.autoRenameWithTitle).onChange(async v => { this.plugin.settings.autoRenameWithTitle = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("实时大纲")
      .setDesc("每段转写完成后自动调用 LLM 整理大纲。关闭后可在面板内手动刷新。每场录音 N 段会产生 N 次 LLM 调用。")
      .addToggle(t => t.setValue(this.plugin.settings.enableRealtimeOutline).onChange(async v => { this.plugin.settings.enableRealtimeOutline = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("录音开始时自动打开纪要面板")
      .addToggle(t => t.setValue(this.plugin.settings.autoOpenOutlineOnRecord).onChange(async v => { this.plugin.settings.autoOpenOutlineOnRecord = v; await this.plugin.saveSettings(); }));

    // ---- 设备与诊断 ----
    new obsidian.Setting(c).setName("设备与诊断").setHeading();

    new obsidian.Setting(c).setName("音频设备检测")
      .setDesc("检测麦克风、电脑音频输入是否就位。录制 B 站客户端、浏览器视频、课程或会议对方声音前建议先检查。")
      .addButton(b => b.setButtonText("检测").onClick(async () => {
        await this.runAudioDiagnostic();
      }))
      .addButton(b => b.setButtonText("电脑音频指引").onClick(() => {
        new VirtualCableSetupModal(this.app, this.plugin).open();
      }));
    this.diagResultEl = c.createDiv({ cls: "lexvoice-diag-result" });

    // ---- 外部音频联动 ----
    new obsidian.Setting(c).setName("外部音频联动").setHeading();

    new obsidian.Setting(c).setName("收件箱文件夹")
      .setDesc("vault 内相对路径。任何音频出现在此文件夹会被自动转写并归档。留空则禁用此功能。")
      .addText(t => t.setValue(this.plugin.settings.inboxFolder || "")
        .setPlaceholder("LexVoice/录音/inbox")
        .onChange(async v => { this.plugin.settings.inboxFolder = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("自动处理新文件")
      .setDesc("关闭后需手动用命令面板的扫描收件箱命令触发。")
      .addToggle(t => t.setValue(this.plugin.settings.inboxAutoImport).onChange(async v => { this.plugin.settings.inboxAutoImport = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("归档子文件夹")
      .setDesc("处理完成后移到此子文件夹。留空将不归档，可能导致重复处理。")
      .addText(t => t.setValue(this.plugin.settings.inboxArchiveSubfolder || "")
        .setPlaceholder("processed")
        .onChange(async v => { this.plugin.settings.inboxArchiveSubfolder = v; await this.plugin.saveSettings(); }));

    new obsidian.Setting(c).setName("同步稳定等待")
      .setDesc("文件出现后等待多少毫秒再开始处理，防止 iCloud 或坚果云同步未完。建议 3000 到 10000 毫秒。")
      .addText(t => t.setValue(String(this.plugin.settings.inboxStabilizeDelayMs || 3000)).onChange(async v => {
        const n = parseInt(v, 10); if (isFinite(n) && n >= 0) { this.plugin.settings.inboxStabilizeDelayMs = n; await this.plugin.saveSettings(); }
      }));

    new obsidian.Setting(c).setName("立即扫描收件箱")
      .setDesc("处理所有未归档的音频文件。用于补漏或初次配置后批量处理。")
      .addButton(b => b.setButtonText("扫描").onClick(() => this.plugin.scanInboxFolder()));

    new obsidian.Setting(c).setName("清理空白短录音")
      .setDesc("扫描转写纪要文件夹，将时长不超过 10 秒且没有有效转写文本的 LexVoice 条目移入系统废纸篓，并同步处理其引用的录音文件。")
      .addButton(b => b.setButtonText("扫描并清理").setWarning().onClick(() => this.plugin.cleanupEmptyShortRecordings()));

    // ---- 视图（Bases）----
    new obsidian.Setting(c).setName("筛选视图").setHeading();
    const viewsHint = c.createDiv({ cls: "setting-item-description lexvoice-section-hint" });
    viewsHint.setText("自动创建 9 个 .base 文件到 LexVoice/视图 目录下，按模式（5 个）+ 使用场景（4 个）筛选纪要。基于 frontmatter 的 mode 和 tags 字段。");

    new obsidian.Setting(c).setName("创建视图文件")
      .setDesc("已存在的 .base 文件不会被覆盖。可在 Obsidian 任意位置打开查看。")
      .addButton(b => b.setButtonText("创建").setCta().onClick(async () => {
        try {
          const r = await this.plugin.createLexVoiceBases({ overwrite: false });
          new obsidian.Notice(`视图创建完成：新建 ${r.created} 个，跳过 ${r.skipped} 个`);
        } catch (e) {
          console.error(e);
          new obsidian.Notice(`创建失败：${e.message || e}`);
        }
      }))
      .addButton(b => b.setButtonText("强制重写").setWarning().onClick(async () => {
        if (!confirm("将覆盖所有 LexVoice 视图文件，包括你可能做过的自定义。继续吗？")) return;
        try {
          const r = await this.plugin.createLexVoiceBases({ overwrite: true });
          new obsidian.Notice(`视图重写完成：${r.created + r.updated} 个`);
        } catch (e) {
          console.error(e);
          new obsidian.Notice(`重写失败：${e.message || e}`);
        }
      }));

    new obsidian.Setting(c).setName("迁移历史笔记")
      .setDesc("扫描笔记文件夹，为没有 frontmatter 的老纪要补全 mode/日期/主题/tags 等字段。已有 mode 字段的笔记跳过。这样它们才会出现在 .base 视图里。")
      .addButton(b => b.setButtonText("扫描并迁移").setCta().onClick(async () => {
        const folder = this.plugin.settings.mdFolder || "LexVoice/转写纪要";
        if (!confirm(`将扫描「${folder}」下所有 .md 文件，为缺失 frontmatter 的老纪要补全字段。\n\n建议先备份 vault。继续吗？`)) return;
        try {
          const r = await this.plugin.migrateLegacyNotes();
          const msg = `迁移完成：补全 ${r.migrated} / 跳过 ${r.skipped}（已有 mode）/ 无法识别模式 ${r.noMode} / 失败 ${r.failed}`;
          new obsidian.Notice(msg, 10000);
          if (r.noMode > 0) {
            new obsidian.Notice(`提示：${r.noMode} 个文件无法识别模式，可手动加 frontmatter 后再迁移。`, 8000);
          }
        } catch (e) {
          console.error(e);
          new obsidian.Notice(`迁移失败：${e.message || e}`, 8000);
        }
      }));

    // ---- 失败重试 ----
    new obsidian.Setting(c).setName("失败重试").setHeading();

    new obsidian.Setting(c).setName("最大重试次数")
      .addText(t => t.setValue(String(this.plugin.settings.maxRetries || 3)).onChange(async v => {
        const n = parseInt(v, 10); if (isFinite(n) && n >= 0) { this.plugin.settings.maxRetries = n; await this.plugin.saveSettings(); }
      }));

    new obsidian.Setting(c).setName("待处理队列")
      .setDesc(`当前 ${this.plugin.queue.tasks.length} 个任务。`)
      .addButton(b => b.setButtonText("打开队列").onClick(() => new QueueModal(this.app, this.plugin).open()))
      .addButton(b => b.setButtonText("重试全部").onClick(() => this.plugin.retryQueue()));
  }

  async runAudioDiagnostic() {
    const result = this.diagResultEl;
    if (!result) return;
    result.empty();
    result.createDiv({ text: "检测中…", cls: "lexvoice-diag-loading" });

    let info;
    try {
      info = await enumerateAudioDevices();
    } catch (e) {
      result.empty();
      result.createDiv({ text: `检测失败：${e.message || e}`, cls: "lexvoice-diag-error" });
      return;
    }
    result.empty();
    const card = result.createDiv({ cls: "lexvoice-diag-card" });

    const micRow = card.createDiv({ cls: "lexvoice-diag-row" });
    const micOk = info.mics.length > 0;
    micRow.createSpan({ cls: `lexvoice-diag-dot ${micOk ? "is-ok" : "is-fail"}` });
    const micText = micRow.createDiv({ cls: "lexvoice-diag-text" });
    micText.createDiv({ text: micOk ? "麦克风" : "未检测到麦克风", cls: "lexvoice-diag-label" });
    if (micOk) {
      micText.createDiv({ text: info.mics.map(d => `• ${d.label || "未授权读取"}`).slice(0, 3).join("\n"), cls: "lexvoice-diag-sub" });
    }

    const vcRow = card.createDiv({ cls: "lexvoice-diag-row" });
    const vcOk = info.virtualCables.length > 0;
    vcRow.createSpan({ cls: `lexvoice-diag-dot ${vcOk ? "is-ok" : "is-warn"}` });
    const vcText = vcRow.createDiv({ cls: "lexvoice-diag-text" });
    vcText.createDiv({ text: vcOk ? "电脑音频输入（虚拟声卡）" : "未检测到电脑音频输入", cls: "lexvoice-diag-label" });
    if (vcOk) {
      vcText.createDiv({ text: info.virtualCables.map(d => `• ${d.label}`).join("\n"), cls: "lexvoice-diag-sub" });
    } else {
      vcText.createDiv({ text: "录制 B 站客户端、浏览器视频、系统声音或会议对方声音需要虚拟声卡。点上方「电脑音频指引」查看分平台指引。", cls: "lexvoice-diag-sub" });
    }

    if (info.permissionRequired) {
      const permRow = card.createDiv({ cls: "lexvoice-diag-row" });
      permRow.createSpan({ cls: "lexvoice-diag-dot is-warn" });
      const permText = permRow.createDiv({ cls: "lexvoice-diag-text" });
      permText.createDiv({ text: "麦克风权限未授予", cls: "lexvoice-diag-label" });
      permText.createDiv({ text: "未授权时设备名为空，无法准确识别电脑音频输入。", cls: "lexvoice-diag-sub" });
    }

    const summary = card.createDiv({ cls: "lexvoice-diag-summary" });
    const mode = normalizeAudioInputMode(this.plugin.settings.captureMode || "mic");
    let modeStatus, modeOk;
    if (mode === "mic") { modeOk = micOk; modeStatus = micOk ? "当前音频输入可用" : "当前音频输入不可用（无麦克风）"; }
    else if (mode === "virtualCable") { modeOk = vcOk; modeStatus = vcOk ? "当前音频输入可用" : "当前音频输入不可用（无电脑音频输入）"; }
    else if (mode === "mix-virtual") { modeOk = micOk && vcOk; modeStatus = modeOk ? "当前音频输入可用" : `当前音频输入不可用（${!micOk ? "无麦克风" : "无电脑音频输入"}）`; }

    summary.createDiv({ text: `当前音频输入：${audioInputModeLabel(mode)}`, cls: "lexvoice-diag-summary-mode" });
    summary.createDiv({ text: modeStatus, cls: `lexvoice-diag-summary-status ${modeOk ? "is-ok" : "is-warn"}` });

    if (!micOk && vcOk) {
      const warn = card.createDiv({ cls: "lexvoice-diag-summary-status is-warn" });
      warn.setText("当前只识别到电脑音频输入，没有识别到真实麦克风。请确认 Windows 默认输入不是 CABLE Output，并检查麦克风权限。");
    }

    if (info.mics.length > 0) {
      const micSel = card.createDiv({ cls: "lexvoice-diag-vc-select" });
      micSel.createDiv({ text: "优先使用的真实麦克风：", cls: "lexvoice-diag-label" });
      const micDropdown = micSel.createEl("select", { cls: "dropdown" });
      const autoMic = micDropdown.createEl("option", { value: "", text: "（自动，避开 CABLE Output）" });
      if (!this.plugin.settings.selectedMicrophoneDevice) autoMic.selected = true;
      for (const d of info.mics) {
        const opt = micDropdown.createEl("option", { value: d.deviceId, text: d.label || "未授权读取" });
        if (this.plugin.settings.selectedMicrophoneDevice === d.deviceId) opt.selected = true;
      }
      micDropdown.addEventListener("change", async () => {
        this.plugin.settings.selectedMicrophoneDevice = micDropdown.value;
        await this.plugin.saveSettings();
        new obsidian.Notice("真实麦克风选择已保存");
      });
    }

    if (info.virtualCables.length > 1) {
      const sel = card.createDiv({ cls: "lexvoice-diag-vc-select" });
      sel.createDiv({ text: "优先使用的电脑音频输入：", cls: "lexvoice-diag-label" });
      const dropdown = sel.createEl("select", { cls: "dropdown" });
      const autoOpt = dropdown.createEl("option", { value: "", text: "（自动）" });
      if (!this.plugin.settings.selectedVirtualDevice) autoOpt.selected = true;
      for (const d of info.virtualCables) {
        const opt = dropdown.createEl("option", { value: d.deviceId, text: d.label });
        if (this.plugin.settings.selectedVirtualDevice === d.deviceId) opt.selected = true;
      }
      dropdown.addEventListener("change", async () => {
        this.plugin.settings.selectedVirtualDevice = dropdown.value;
        await this.plugin.saveSettings();
        new obsidian.Notice("电脑音频输入选择已保存");
      });
    }
  }
}

class QueueModal extends obsidian.Modal {
  constructor(app, plugin) { super(app); this.plugin = plugin; }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "LexVoice 待处理队列" });
    const tasks = this.plugin.queue.tasks;
    if (!tasks.length) { contentEl.createEl("p", { text: "队列为空" }); return; }
    const actionBar = contentEl.createDiv({ cls: "lexvoice-queue-actions" });
    const retryAllBtn = actionBar.createEl("button", { text: `重试全部 (${tasks.length})`, cls: "mod-cta" });
    retryAllBtn.onclick = async () => { await this.plugin.retryQueue(); this.onOpen(); };
    const clearBtn = actionBar.createEl("button", { text: "清空队列" });
    clearBtn.onclick = async () => {
      this.plugin.queue.tasks = [];
      await this.plugin.saveAll();
      this.plugin.renderStatusBar();
      this.onOpen();
    };
    const list = contentEl.createDiv({ cls: "lexvoice-queue-list" });
    for (const t of tasks) {
      const row = list.createDiv({ cls: "lexvoice-queue-row" });
      const info = row.createDiv({ cls: "lexvoice-queue-info" });
      const title = t.type === "transcribe"
        ? `转写重试 · 段${(t.segmentIndex || 0) + 1}`
        : t.type === "merge" ? `合并重试 · ${(t.segments || []).length} 段` : t.type;
      info.createEl("div", { cls: "lexvoice-queue-title", text: title });
      info.createEl("div", { cls: "lexvoice-queue-meta", text: `${t.mdPath || ""} · 重试 ${t.retries || 0}/${this.plugin.settings.maxRetries || 3}` });
      if (t.lastError) info.createEl("div", { cls: "lexvoice-queue-error", text: t.lastError });
      const actions = row.createDiv({ cls: "lexvoice-queue-row-actions" });
      const retryBtn = actions.createEl("button", { text: "重试" });
      retryBtn.onclick = async () => { try { await this.plugin.queue.processOne(t); } catch {} this.onOpen(); };
      const delBtn = actions.createEl("button", { text: "删除" });
      delBtn.onclick = async () => { await this.plugin.queue.remove(t.id); this.onOpen(); };
    }
  }
  onClose() { this.contentEl.empty(); }
}

// 电脑音频捕获安装/配置向导 Modal —— 分平台引导
class VirtualCableSetupModal extends obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.activePlatform = this.detectPlatform();
  }
  detectPlatform() {
    const p = (typeof process !== "undefined" && process.platform) || "";
    if (p === "darwin") return "mac";
    if (p === "win32") return "win";
    return "linux";
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("lexvoice-vcable-modal");

    contentEl.createEl("h2", { text: "电脑音频捕获设置" });
    const desc = contentEl.createEl("p", { cls: "lexvoice-vcable-desc" });
    desc.setText("LexVoice 不能直接监听耳机或扬声器里正在播放的声音。要录 B 站客户端、浏览器视频、课程或会议对方声音，需要先把这些声音输出到虚拟声卡，让 LexVoice 把它当作「电脑音频输入」；同时再把同一份声音监听到真实扬声器或耳机，保证你自己也能听见。一次配置，长期可用。");

    // 平台 tabs
    const tabs = contentEl.createDiv({ cls: "lexvoice-vcable-tabs" });
    const platforms = [
      ["mac", "macOS"],
      ["win", "Windows"],
      ["linux", "Linux"],
    ];
    const tabBtns = {};
    for (const [k, label] of platforms) {
      const b = tabs.createEl("button", { text: label, cls: "lexvoice-vcable-tab" });
      if (k === this.activePlatform) b.addClass("is-active");
      b.onclick = () => {
        this.activePlatform = k;
        for (const key in tabBtns) tabBtns[key].removeClass("is-active");
        b.addClass("is-active");
        this.renderContent();
      };
      tabBtns[k] = b;
    }
    this.tabBtns = tabBtns;
    this.contentBox = contentEl.createDiv({ cls: "lexvoice-vcable-content" });
    this.renderContent();

    // 底部操作
    const actions = contentEl.createDiv({ cls: "modal-button-container lexvoice-vcable-actions" });
    const closeBtn = actions.createEl("button", { text: "关闭" });
    closeBtn.onclick = () => this.close();
    const recheckBtn = actions.createEl("button", { text: "重新检测", cls: "mod-cta" });
    recheckBtn.onclick = async () => {
      const info = await enumerateAudioDevices();
      if (info.virtualCables.length > 0) {
        const labels = info.virtualCables.map(d => d.label).join("、");
        new obsidian.Notice(`检测到电脑音频输入：${labels}`);
        this.close();
      } else {
        new obsidian.Notice("尚未检测到电脑音频输入，请确认已安装虚拟声卡并重启 Obsidian。");
      }
    };
  }
  renderContent() {
    this.contentBox.empty();
    if (this.activePlatform === "mac")   this.renderMacContent(this.contentBox);
    else if (this.activePlatform === "win") this.renderWinContent(this.contentBox);
    else this.renderLinuxContent(this.contentBox);
  }
  step(parent, n, title, body) {
    const s = parent.createDiv({ cls: "lexvoice-vcable-step" });
    const head = s.createDiv({ cls: "lexvoice-vcable-step-head" });
    head.createSpan({ text: `Step ${n}`, cls: "lexvoice-vcable-step-num" });
    head.createSpan({ text: title, cls: "lexvoice-vcable-step-title" });
    const b = s.createDiv({ cls: "lexvoice-vcable-step-body" });
    if (typeof body === "function") body(b);
    else b.innerHTML = body;
    return s;
  }
  renderMacContent(parent) {
    this.step(parent, 1, "安装 BlackHole（开源免费）", (b) => {
      b.createEl("p", { text: "推荐 BlackHole 2ch（双声道版本足够会议使用）。" });
      const ul = b.createEl("ul");
      const li1 = ul.createEl("li");
      li1.createSpan({ text: "下载页：" });
      const a1 = li1.createEl("a", { text: "existential.audio/blackhole/", href: "https://existential.audio/blackhole/" });
      a1.target = "_blank";
      const li2 = ul.createEl("li");
      li2.createSpan({ text: "或用 Homebrew：" });
      li2.createEl("code", { text: "brew install blackhole-2ch" });
    });
    this.step(parent, 2, "创建多输出设备（Multi-Output Device）", (b) => {
      const ol = b.createEl("ol");
      ol.createEl("li", { text: "启动台 → Audio MIDI Setup（音频 MIDI 设置）" });
      ol.createEl("li", { text: "左下角「+」→ 创建多输出设备" });
      ol.createEl("li", { text: "勾选「内建扬声器」（或耳机）+「BlackHole 2ch」" });
      ol.createEl("li", { text: "Master Device 选你的耳机；Drift Correction 勾选 BlackHole" });
      const tip = b.createEl("p", { cls: "lexvoice-vcable-tip" });
      tip.setText("这样系统音频会同时进耳机（你能听到）和 BlackHole（LexVoice 能录到）。");
    });
    this.step(parent, 3, "把系统或应用输出切到这个多输出设备", (b) => {
      const ol = b.createEl("ol");
      ol.createEl("li", { text: "系统设置 → 声音 → 输出" });
      ol.createEl("li", { text: "选择刚才创建的「多输出设备」" });
      ol.createEl("li", { text: "浏览器视频和大多数桌面视频客户端通常跟随系统输出；会议软件如单独设置了扬声器，也改成这个多输出设备" });
      const warn = b.createEl("p", { cls: "lexvoice-vcable-warn" });
      warn.setText("切换后会议软件可能需要重新选择扬声器。");
    });
    this.step(parent, 4, "在 LexVoice 选择电脑音频模式", (b) => {
      b.createEl("p", { text: "只整理视频、课程或播客时选择「仅电脑音频」；线上会议或你需要边听边讲解时选择「麦克风加电脑音频」。" });
    });
  }
  renderWinContent(parent) {
    this.step(parent, 1, "安装 VB-Cable（免费）", (b) => {
      b.createEl("p", { text: "下载：" });
      const a = b.createEl("a", { text: "https://vb-audio.com/Cable/", href: "https://vb-audio.com/Cable/" });
      a.target = "_blank";
      const ol = b.createEl("ol");
      ol.createEl("li", { text: "下载 VB-Cable Driver Pack 后解压" });
      ol.createEl("li", { text: "右键 VBCABLE_Setup_x64.exe → 以管理员身份运行" });
      ol.createEl("li", { text: "点击 Install Driver → 重启电脑" });
    });
    this.step(parent, 2, "把要录制的声音输出切到 CABLE Input（播放设备）", (b) => {
      b.createEl("p", { text: "线上会议可以在飞书、腾讯会议或 Zoom 的音频设置里改扬声器；B 站客户端、浏览器视频、播放器等桌面应用，可以在 Windows 音量混合器里单独指定输出设备。目标输出统一改为：" });
      b.createEl("code", { text: "CABLE Input (VB-Audio Virtual Cable)" });
      b.createEl("p", { cls: "lexvoice-vcable-tip" }).setText("注意：这里选的是 CABLE Input。虽然名字叫 Input，但它在 Windows 里是“播放/输出设备”；LexVoice 后面录的是同一根虚拟线缆另一端的 CABLE Output。");
      const ol = b.createEl("ol");
      ol.createEl("li", { text: "录会议：在会议软件的扬声器/输出设备中选择 CABLE Input" });
      ol.createEl("li", { text: "录 B 站客户端：先播放一段视频，让应用出现在音量混合器里；Windows 设置 → 系统 → 声音 → 音量混合器 → 找到哔哩哔哩/bilibili → 输出设备选择 CABLE Input" });
      ol.createEl("li", { text: "录浏览器：同样在音量混合器中找到 Chrome、Edge、Firefox 等浏览器 → 输出设备选择 CABLE Input" });
      ol.createEl("li", { text: "录全部系统声音：把系统默认输出设备直接改为 CABLE Input" });
      const warn = b.createEl("p", { cls: "lexvoice-vcable-warn" });
      warn.setText("这一步会让你暂时听不到对方声音，必须做下一步的侦听设置才能恢复。");
    });
    this.step(parent, 3, "用 CABLE Output 侦听到真实扬声器或耳机（关键）", (b) => {
      b.createEl("p", { text: "让你自己也听得到，需要把 CABLE Output 侦听到真实耳机或扬声器：" });
      const ol = b.createEl("ol");
      ol.createEl("li", { text: "打开：控制面板 → 声音 → 录制（或右键任务栏喇叭图标 → 声音设置 → 更多声音设置）" });
      ol.createEl("li", { text: "找到 CABLE Output" });
      ol.createEl("li", { text: "双击 → 切到「侦听」标签" });
      ol.createEl("li", { text: "勾选「侦听此设备」" });
      ol.createEl("li", { text: "「通过此设备播放」选择你的耳机或扬声器，不要选 CABLE Input" });
      ol.createEl("li", { text: "点「应用」" });
      const tip = b.createEl("p", { cls: "lexvoice-vcable-tip" });
      tip.setText("音频链路是：应用/浏览器 → CABLE Input（播放输出）→ CABLE Output（录制输入，LexVoice 读取）→ 侦听到真实耳机/扬声器。若侦听延迟明显，可改用 VoiceMeeter 这类混音工具做多输出。");
    });
    this.step(parent, 4, "把默认输入改回真实麦克风", (b) => {
      const ol = b.createEl("ol");
      ol.createEl("li", { text: "Windows 设置 → 系统 → 声音 → 输入" });
      ol.createEl("li", { text: "选择你的真实麦克风，不要选 CABLE Output" });
      ol.createEl("li", { text: "如果其他语音输入软件也没声音，通常就是这里被改成了 CABLE Output" });
      const warn = b.createEl("p", { cls: "lexvoice-vcable-warn" });
      warn.setText("CABLE Output 是给 LexVoice 这类录音软件读取电脑音频用的，不适合作为日常语音输入麦克风。");
    });
    this.step(parent, 5, "在 LexVoice 选择电脑音频模式", (b) => {
      b.createEl("p", { text: "看 B 站、YouTube、课程或播客时选择「仅电脑音频」；线上会议或你需要把自己的讲解也录进去时选择「麦克风加电脑音频」。" });
    });
  }
  renderLinuxContent(parent) {
    this.step(parent, 1, "PulseAudio：用 monitor source", (b) => {
      b.createEl("p", { text: "PulseAudio 的每个真实输出设备都自带 monitor source。保持系统输出为你的耳机/扬声器，LexVoice 选择对应的 Monitor of ... 输入，即可同时听见和录到系统音频。" });
      b.createEl("p", { text: "查看可用 monitor source：" });
      const code = b.createEl("pre");
      code.createEl("code", { text: "pactl list sources short | grep monitor" });
    });
    this.step(parent, 2, "若用 PipeWire（较新发行版）", (b) => {
      b.createEl("p", { text: "PipeWire 兼容 PulseAudio API，命令相同。如默认 monitor 不工作，可装 pavucontrol 在「录制」标签里把 LexVoice 的输入切到 Monitor of <你的扬声器>。" });
    });
    this.step(parent, 3, "在 LexVoice 选择电脑音频模式", (b) => {
      b.createEl("p", { text: "LexVoice 的设备检测会把名为「Monitor of ...」的输入识别为电脑音频输入。只整理视频/课程时选择「仅电脑音频」；需要同时录自己的声音时选择「麦克风加电脑音频」。" });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
}

// 招聘面试模式上下文 Modal —— 录音前注入 JD/简历/候选人信息
class RecruitContextModal extends obsidian.Modal {
  constructor(app, plugin, opts) {
    super(app);
    this.plugin = plugin;
    this.opts = opts || {};
    // 从 settings 读上次的上下文作为预填
    const saved = (plugin.settings.recruitContext) || {};
    this.ctx = {
      jd: saved.jd || "",
      resume: saved.resume || "",
      candidateName: saved.candidateName || "",
      position: saved.position || "",
      round: saved.round || "初面",
      interviewer: saved.interviewer || "",
      seniority: saved.seniority || "",
    };
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("lexvoice-recruit-modal");

    contentEl.createEl("h2", { text: "🧑‍💼 招聘面试上下文" });
    const desc = contentEl.createEl("p", { cls: "lexvoice-recruit-desc" });
    desc.setText("录音前先注入 JD 和简历，AI 评价才有锚点——否则评价会偏宽（默认按通用 HR 框架打分）。所有字段都可跳过，但强烈建议至少填 JD。");

    // —— JD 区块 ——
    const jdSec = contentEl.createDiv({ cls: "lexvoice-recruit-section" });
    const jdHead = jdSec.createDiv({ cls: "lexvoice-recruit-section-head" });
    jdHead.createEl("label", { text: "📋 岗位 JD（强烈建议）", cls: "lexvoice-recruit-label-strong" });
    if (this.plugin.settings.recruitContextLibrary && this.plugin.settings.recruitContextLibrary.length > 0) {
      const libBtn = jdHead.createEl("button", { text: "从历史 JD 选择…", cls: "lexvoice-recruit-lib-btn" });
      libBtn.onclick = () => this.openLibrary();
    }
    const jdTa = jdSec.createEl("textarea", { cls: "lexvoice-recruit-textarea lexvoice-recruit-textarea-large" });
    jdTa.value = this.ctx.jd;
    jdTa.placeholder = "粘贴完整 JD 文本，含岗位职责、任职要求、加分项等。\nAI 会从中拆解硬性要求作为评分锚点。";
    jdTa.addEventListener("input", () => { this.ctx.jd = jdTa.value; });

    // —— 简历区块 ——
    const resumeSec = contentEl.createDiv({ cls: "lexvoice-recruit-section" });
    resumeSec.createEl("label", { text: "📄 候选人简历（可选，文本/Markdown）" });
    const resumeTa = resumeSec.createEl("textarea", { cls: "lexvoice-recruit-textarea" });
    resumeTa.value = this.ctx.resume;
    resumeTa.placeholder = "粘贴简历文本。建议包含：现任公司+岗位+年限、过往主要项目、技能栈、教育背景。\nAI 会用简历核验候选人在面试中的陈述。";
    resumeTa.addEventListener("input", () => { this.ctx.resume = resumeTa.value; });

    // —— 元信息 grid ——
    const metaGrid = contentEl.createDiv({ cls: "lexvoice-recruit-meta-grid" });
    const addMetaInput = (label, key, placeholder) => {
      const cell = metaGrid.createDiv({ cls: "lexvoice-recruit-meta-cell" });
      cell.createEl("label", { text: label });
      const inp = cell.createEl("input", { type: "text", cls: "lexvoice-recruit-input" });
      inp.value = this.ctx[key] || "";
      inp.placeholder = placeholder || "";
      inp.addEventListener("input", () => { this.ctx[key] = inp.value; });
    };
    const addMetaSelect = (label, key, options) => {
      const cell = metaGrid.createDiv({ cls: "lexvoice-recruit-meta-cell" });
      cell.createEl("label", { text: label });
      const sel = cell.createEl("select", { cls: "lexvoice-recruit-input dropdown" });
      for (const opt of options) {
        const o = sel.createEl("option", { value: opt, text: opt || "（未指定）" });
        if (this.ctx[key] === opt) o.selected = true;
      }
      sel.addEventListener("change", () => { this.ctx[key] = sel.value; });
    };

    addMetaInput("候选人姓名", "candidateName", "如：某候选人");
    addMetaInput("应聘岗位", "position", "如：高级 OD（AI 方向）");
    addMetaSelect("面试轮次", "round", ["初面", "二面", "终面", "复试", "交叉面"]);
    addMetaInput("面试官", "interviewer", "如：某用人经理");
    addMetaSelect("岗位资历", "seniority", ["", "初级", "中级", "高级", "资深", "总监"]);
    addMetaInput("自定义提示", "customNote", "（可选）特殊关注点，会注入到 AI 评价 prompt");

    // —— 按钮 ——
    const actions = contentEl.createDiv({ cls: "lexvoice-recruit-actions" });

    const skipBtn = actions.createEl("button", { text: "跳过（不注入上下文）" });
    skipBtn.onclick = () => {
      this.confirmed = "skip";
      this.close();
    };

    const saveOnlyBtn = actions.createEl("button", { text: "保存草稿" });
    saveOnlyBtn.onclick = async () => {
      this.ctx.savedAt = new Date().toISOString();
      this.plugin.settings.recruitContext = { ...this.ctx };
      await this.plugin.saveSettings();
      new obsidian.Notice("已保存招聘上下文草稿");
    };

    const startBtn = actions.createEl("button", { text: "确认并开始录音", cls: "mod-cta" });
    startBtn.onclick = async () => {
      this.ctx.savedAt = new Date().toISOString();
      this.plugin.settings.recruitContext = { ...this.ctx };
      // 加入历史库（按 position+candidateName 去重）
      const lib = this.plugin.settings.recruitContextLibrary || [];
      const sig = `${this.ctx.position}|${this.ctx.candidateName}`;
      if (sig.trim() !== "|" && this.ctx.jd) {
        const existing = lib.findIndex(x => `${x.position}|${x.candidateName}` === sig);
        if (existing >= 0) lib.splice(existing, 1);
        lib.unshift({ ...this.ctx });
        if (lib.length > 20) lib.length = 20;
        this.plugin.settings.recruitContextLibrary = lib;
      }
      await this.plugin.saveSettings();
      this.confirmed = "start";
      this.close();
    };
  }
  openLibrary() {
    const lib = this.plugin.settings.recruitContextLibrary || [];
    if (!lib.length) { new obsidian.Notice("历史 JD 为空"); return; }
    // 简单的列表 sub-modal
    const sub = new obsidian.Modal(this.app);
    sub.contentEl.empty();
    sub.contentEl.createEl("h3", { text: "选择历史 JD" });
    const list = sub.contentEl.createDiv({ cls: "lexvoice-recruit-lib-list" });
    for (const item of lib) {
      const row = list.createDiv({ cls: "lexvoice-recruit-lib-row" });
      row.createDiv({ cls: "lexvoice-recruit-lib-title", text: item.position || "（未命名岗位）" });
      const meta = [
        item.candidateName,
        item.round,
        item.savedAt ? new Date(item.savedAt).toLocaleDateString() : "",
      ].filter(Boolean).join(" · ");
      row.createDiv({ cls: "lexvoice-recruit-lib-meta", text: meta });
      row.onclick = () => {
        Object.assign(this.ctx, item);
        sub.close();
        this.close();
        this.onOpen();
      };
    }
    sub.open();
  }
  onClose() {
    this.contentEl.empty();
    if (this.opts.onConfirm) this.opts.onConfirm(this.confirmed || "cancel", this.ctx);
  }
}

// 转写提示词管理 Modal
class PromptTemplateModal extends obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.editingId = null;
  }

  builtInModes() {
    return getBuiltInVisiblePolishModeKeys(this.plugin.settings);
  }

  newCustomScene(seed, baseMode, prompt) {
    const id = makeCustomPromptModeId(seed || "prompt");
    return {
      id,
      mode: id,
      name: seed || "新自定义提示词",
      description: "",
      baseMode: baseMode || "learning",
      prompt: prompt || [
        "你是专业的录音整理助手。请根据下面规则，把原始转写整理成可直接保存到 Obsidian 的 Markdown 笔记。",
        "",
        "请先补全这份提示词：",
        "- 使用场景：说明这类录音通常来自什么任务、谁会继续使用这份笔记。",
        "- 重点内容：说明必须识别哪些信息，例如事实、结论、待办、风险、争议、关键原话、术语、外语内容；待办 / 行动项必须输出为 `- [ ]` todo 任务。",
        "- 必须输出：说明最终笔记必须包含哪些部分，以及不需要出现哪些过度模板化内容。",
        "- 待办语法：如果有待办，统一写成 `- [ ] 责任人：<人> 事项：<具体动作> 截止：<时间>`，不要写成表格或普通列表。",
        "- 写作要求：说明语气、详略、是否翻译、是否保留原文、如何处理不确定信息。",
        "- 反幻觉：没有出现在转写里的信息不要编造，拿不准要标注不确定。",
        "",
        "原始转写：",
        "{{TRANSCRIPT}}"
      ].join("\n"),
      isBuiltin: false,
      customMode: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async saveScene(tpl, activate) {
    const clean = sanitizePromptTemplate(tpl, tpl && tpl.baseMode);
    this.plugin.settings.promptTemplates = Object.assign({}, this.plugin.settings.promptTemplates || {}, { [clean.id]: clean });
    this.plugin.settings.activeTemplateByMode = Object.assign({}, this.plugin.settings.activeTemplateByMode || {}, { [clean.id]: clean.id });
    if (activate) this.plugin.settings.polishMode = clean.id;
    await this.plugin.saveSettings();
    return clean;
  }

  getBuiltinOverride(mode) {
    const tpls = this.plugin.settings.promptTemplates || {};
    const activeId = (this.plugin.settings.activeTemplateByMode || {})[mode];
    const tpl = activeId && tpls[activeId];
    if (tpl && tpl.prompt && tpl.prompt.trim() && !isCustomPromptModeTemplate(tpl)) return tpl;
    return null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("lexvoice-tpl-modal");
    contentEl.createEl("h2", { text: this.editingId ? "编辑自定义提示词" : "转写提示词管理" });

    const desc = contentEl.createDiv({ cls: "setting-item-description lexvoice-tpl-desc" });
    desc.setText("提示词是整理规则本身。内置提示词用于快速开始；需要固定格式、职业化判断或长期工作流时，请新建自定义提示词，并把常用条目设为默认。");

    const body = contentEl.createDiv({ cls: "lexvoice-tpl-body" });
    if (this.editingId) this.renderEditor(body, this.editingId);
    else this.renderList(body);
  }

  renderList(body) {
    const defaultMode = getEffectivePolishMode(this.plugin.settings, this.plugin.settings.polishMode, "meeting");
    const defaultMeta = getModeMeta(this.plugin.settings, defaultMode);
    const toolbar = body.createDiv({ cls: "lexvoice-tpl-toolbar" });
    toolbar.createDiv({ cls: "lexvoice-tpl-current", text: "当前默认：" + (defaultMeta.prefix || defaultMeta.label || defaultMode) });
    const createBtn = toolbar.createEl("button", { text: "新建自定义提示词", cls: "mod-cta" });
    createBtn.onclick = async () => {
      const tpl = this.newCustomScene("新自定义提示词", "learning");
      await this.saveScene(tpl, true);
      this.editingId = tpl.id;
      this.onOpen();
    };

    const builtInSection = body.createDiv({ cls: "lexvoice-tpl-section" });
    builtInSection.createDiv({ cls: "lexvoice-tpl-section-title", text: "内置提示词" });
    builtInSection.createDiv({ cls: "lexvoice-tpl-section-copy", text: "这些是 LexVoice 提供的默认整理规则，适合直接设为默认。需要固定格式或专业判断时，请新建自定义提示词。" });
    const list = builtInSection.createDiv({ cls: "lexvoice-tpl-list" });
    for (const mode of this.builtInModes()) this.renderBuiltinRow(list, mode);

    const customSection = body.createDiv({ cls: "lexvoice-tpl-section" });
    customSection.createDiv({ cls: "lexvoice-tpl-section-title", text: "自定义提示词" });
    customSection.createDiv({ cls: "lexvoice-tpl-section-copy", text: "每个自定义提示词都会出现在录音、导入音频和重新整理菜单里，也可以设为默认。" });
    const customList = customSection.createDiv({ cls: "lexvoice-tpl-list" });
    const customs = getCustomPromptModeTemplates(this.plugin.settings);
    if (!customs.length) customList.createDiv({ cls: "lexvoice-tpl-empty", text: "还没有自定义提示词。点击上方按钮新建一条。" });
    for (const tpl of customs) this.renderCustomRow(customList, tpl);
  }

  renderBuiltinRow(list, mode) {
    const meta = getModeMeta(this.plugin.settings, mode);
    const row = list.createDiv({ cls: "lexvoice-tpl-row" });
    if (this.plugin.settings.polishMode === mode) row.addClass("is-active");
    const pill = row.createDiv({ cls: "lexvoice-tpl-mode-pill", text: meta.emoji || "" });
    pill.setAttr("aria-hidden", "true");
    const text = row.createDiv({ cls: "lexvoice-tpl-row-meta" });
    text.createDiv({ cls: "lexvoice-tpl-row-name", text: meta.prefix || meta.label || mode });
    const override = this.getBuiltinOverride(mode);
    const state = override ? "当前使用旧版自定义规则。" : "内置提示词";
    text.createDiv({ cls: "lexvoice-tpl-row-sub", text: (meta.goal || "") + " · " + state });

    const actions = row.createDiv({ cls: "lexvoice-tpl-row-actions" });
    const defaultBtn = actions.createEl("button", { text: this.plugin.settings.polishMode === mode ? "已默认" : "设为默认" });
    defaultBtn.onclick = async () => {
      this.plugin.settings.polishMode = mode;
      await this.plugin.saveSettings();
      this.onOpen();
    };
  }

  renderCustomRow(list, tpl) {
    const meta = getModeMeta(this.plugin.settings, tpl.id);
    const baseMeta = getModeMeta(this.plugin.settings, tpl.baseMode || "learning");
    const row = list.createDiv({ cls: "lexvoice-tpl-row" });
    if (this.plugin.settings.polishMode === tpl.id) row.addClass("is-active");
    const pill = row.createDiv({ cls: "lexvoice-tpl-mode-pill", text: meta.emoji || baseMeta.emoji || "" });
    pill.setAttr("aria-hidden", "true");
    const text = row.createDiv({ cls: "lexvoice-tpl-row-meta" });
    text.createDiv({ cls: "lexvoice-tpl-row-name", text: tpl.name || "自定义提示词" });
    const updated = tpl.updatedAt && window.moment ? window.moment(tpl.updatedAt).format("YYYY-MM-DD HH:mm") : "未记录";
    text.createDiv({ cls: "lexvoice-tpl-row-sub", text: "自定义提示词 · 更新于 " + updated });

    const actions = row.createDiv({ cls: "lexvoice-tpl-row-actions" });
    const defaultBtn = actions.createEl("button", { text: this.plugin.settings.polishMode === tpl.id ? "已默认" : "设为默认" });
    defaultBtn.onclick = async () => {
      this.plugin.settings.polishMode = tpl.id;
      await this.plugin.saveSettings();
      this.onOpen();
    };
    const editBtn = actions.createEl("button", { text: "编辑" });
    editBtn.onclick = () => { this.editingId = tpl.id; this.onOpen(); };
    const delBtn = actions.createEl("button", { text: "删除" });
    delBtn.addClass("mod-warning");
    delBtn.onclick = async () => {
      if (!confirm("删除自定义提示词「" + (tpl.name || tpl.id) + "」？此操作不可恢复。")) return;
      const tpls = Object.assign({}, this.plugin.settings.promptTemplates || {});
      delete tpls[tpl.id];
      const active = Object.assign({}, this.plugin.settings.activeTemplateByMode || {});
      delete active[tpl.id];
      this.plugin.settings.promptTemplates = tpls;
      this.plugin.settings.activeTemplateByMode = active;
      if (this.plugin.settings.polishMode === tpl.id) this.plugin.settings.polishMode = "learning";
      await this.plugin.saveSettings();
      this.onOpen();
    };
  }

  async optimizePromptDraft(tpl, draft) {
    const current = String(draft || "").trim();
    const seed = current || this.newCustomScene(tpl && tpl.name ? tpl.name : "自定义提示词", tpl && tpl.baseMode ? tpl.baseMode : "learning").prompt;
    const sys = "你是提示词优化专家，专门把用户草稿改写成稳定、清晰、可执行的录音转写整理 Prompt。";
    const user = [
      "请优化下面这份 LexVoice 转写整理提示词。",
      "",
      "要求：",
      "- 只输出优化后的完整 Prompt，不要解释、不要代码块。",
      "- 必须保留 {{TRANSCRIPT}} 占位符。",
      "- 明确使用场景、重点内容、必须输出的内容、写作风格、翻译要求和反幻觉边界。",
      "- 不要强行套大量 callout；结构化可以有，但正文应贴近真实讨论内容。",
      "- 让用户保存后可以直接用于录音、导入和重新整理。",
      "",
      "提示词名称：" + ((tpl && tpl.name) || "自定义提示词"),
      "",
      "当前草稿：",
      seed,
    ].join("\n");
    let result = await callLlm(this.plugin, sys, user);
    result = String(result || "").trim().replace(/^```(?:markdown|md|text)?\s*/i, "").replace(/```$/i, "").trim();
    if (!result.includes("{{TRANSCRIPT}}")) {
      result += "\n\n原始转写：\n{{TRANSCRIPT}}";
    }
    return result;
  }

  renderEditor(body, id) {
    const tpls = this.plugin.settings.promptTemplates || {};
    const tpl = tpls[id];
    if (!tpl || !isCustomPromptModeTemplate(tpl)) {
      this.editingId = null;
      this.onOpen();
      return;
    }

    const back = body.createDiv({ cls: "lexvoice-tpl-back" });
    const backBtn = back.createEl("button", { text: "返回提示词库" });
    backBtn.onclick = () => { this.editingId = null; this.onOpen(); };
    back.createSpan({ cls: "lexvoice-tpl-builtin-tag", text: "自定义提示词" });

    const editor = body.createDiv({ cls: "lexvoice-tpl-editor" });
    new obsidian.Setting(editor).setName("提示词名称")
      .setDesc("这个名称会出现在录音、导入音频和重新整理菜单里。")
      .addText(t => {
        t.setValue(tpl.name || "");
        t.onChange(v => { tpl.name = v || "自定义提示词"; });
      });

    const promptSetting = new obsidian.Setting(editor).setName("提示词内容");
    promptSetting.setDesc("这里写的是实际发送给大模型的整理规则。请定义使用场景、重点内容、必须输出的内容、写作风格、翻译要求和反幻觉边界，并保留 {{TRANSCRIPT}} 作为原始转写占位符。");
    const ta = editor.createEl("textarea", { cls: "lexvoice-textarea lexvoice-textarea-mono lexvoice-tpl-textarea" });
    ta.value = tpl.prompt || "";
    ta.placeholder = "例如：这份提示词用于……；重点识别……；必须输出……；不要输出……；外语内容……；不确定信息……；最后保留 {{TRANSCRIPT}}。";
    ta.rows = 18;
    ta.addEventListener("input", () => { tpl.prompt = ta.value; });

    const actions = editor.createDiv({ cls: "lexvoice-tpl-edit-actions" });
    const cancelBtn = actions.createEl("button", { text: "取消" });
    cancelBtn.onclick = () => { this.editingId = null; this.onOpen(); };
    const optimizeBtn = actions.createEl("button", { text: "AI 优化提示词" });
    optimizeBtn.onclick = async () => {
      try {
        optimizeBtn.disabled = true;
        optimizeBtn.setText("优化中…");
        const optimized = await this.optimizePromptDraft(tpl, ta.value);
        ta.value = optimized;
        tpl.prompt = optimized;
        new obsidian.Notice("已生成优化稿，请检查后保存");
      } catch (e) {
        console.error(e);
        new obsidian.Notice("AI 优化失败：" + ((e && e.message) || e));
      } finally {
        optimizeBtn.disabled = false;
        optimizeBtn.setText("AI 优化提示词");
      }
    };
    const saveBtn = actions.createEl("button", { text: "保存并设为默认", cls: "mod-cta" });
    saveBtn.onclick = async () => {
      tpl.name = (tpl.name || "自定义提示词").trim();
      tpl.description = "";
      tpl.baseMode = tpl.baseMode || "learning";
      tpl.mode = tpl.id;
      tpl.customMode = true;
      tpl.isBuiltin = false;
      tpl.prompt = ta.value.trim();
      if (!tpl.prompt) { new obsidian.Notice("请填写提示词内容"); return; }
      if (!tpl.prompt.includes("{{TRANSCRIPT}}")) { new obsidian.Notice("提示词必须包含 {{TRANSCRIPT}} 占位符"); return; }
      tpl.updatedAt = new Date().toISOString();
      await this.saveScene(tpl, true);
      new obsidian.Notice("自定义提示词已保存");
      this.editingId = null;
      this.onOpen();
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

class ImportAudioModal extends obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.selected = new Set();
    this.processBtn = null;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "导入音频文件转写润色" });
    const desc = contentEl.createEl("p", { cls: "lexvoice-import-desc" });
    desc.setText(`从 ${this.plugin.settings.audioFolder} 选择一个或多个音频文件。多选时按文件名升序合并为一份整合版笔记。`);

    const folderPath = obsidian.normalizePath(this.plugin.settings.audioFolder);
    const folder = this.plugin.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof obsidian.TFolder)) {
      contentEl.createEl("p", { text: `音频文件夹不存在：${folderPath}` });
      return;
    }
    const files = folder.children
      .filter((f) => f instanceof obsidian.TFile && AUDIO_EXT.has(f.extension.toLowerCase()))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);

    if (!files.length) {
      contentEl.createEl("p", { text: "音频文件夹无可识别的音频文件" });
      return;
    }

    const list = contentEl.createDiv({ cls: "lexvoice-import-list" });
    files.forEach((file) => {
      const row = list.createDiv({ cls: "lexvoice-import-row" });
      const cbId = `lv-import-${file.path.replace(/[^a-z0-9]/gi, "_")}`;
      const cb = row.createEl("input", { type: "checkbox", attr: { id: cbId } });
      const lbl = row.createEl("label", { attr: { for: cbId }, cls: "lexvoice-import-label" });
      const sizeMB = (file.stat.size / 1024 / 1024).toFixed(1);
      const mtime = window.moment(file.stat.mtime).format("MM-DD HH:mm");
      lbl.createEl("div", { cls: "lexvoice-import-name", text: file.name });
      lbl.createEl("div", { cls: "lexvoice-import-meta", text: `${sizeMB} MB · ${mtime}` });
      if (file.stat.size > 25 * 1024 * 1024) {
        lbl.createEl("div", { cls: "lexvoice-import-warn", text: "文件超过 25 MB，多数转写 API 会拒绝。建议先用 ffmpeg 降码率。" });
      }
      cb.onchange = () => {
        if (cb.checked) this.selected.add(file.path);
        else this.selected.delete(file.path);
        this.updateButton();
      };
    });

    const actions = contentEl.createDiv({ cls: "lexvoice-import-actions" });
    this.processBtn = actions.createEl("button", { text: "开始处理（0 个）", cls: "mod-cta" });
    this.processBtn.disabled = true;
    this.processBtn.onclick = () => this.process();
    const cancelBtn = actions.createEl("button", { text: "取消" });
    cancelBtn.onclick = () => this.close();
  }
  updateButton() {
    if (!this.processBtn) return;
    const n = this.selected.size;
    this.processBtn.setText(`开始处理（${n} 个）`);
    this.processBtn.disabled = n === 0;
  }
  async process() {
    const paths = Array.from(this.selected);
    if (!paths.length) return;
    this.close();
    await this.plugin.importAudioFiles(paths);
  }
  onClose() { this.contentEl.empty(); }
}

export default LexVoicePlugin;
