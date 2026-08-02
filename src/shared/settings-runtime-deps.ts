import type {
  AudioInputMode,
  KnowledgeExtractionHistory,
  LlmProfile,
  PeopleContextMode,
  PeopleSuggestionCache,
  PromptTemplate,
} from "./types";

type AudioRuntime = {
  normalizeAudioInputMode(value: unknown): AudioInputMode;
};

type AsrRuntime = {
  normalizeAsrConcurrency(value: unknown): number;
};

type LlmRuntime = {
  normalizeLlmProfiles(value: unknown): LlmProfile[];
};

type PeopleRuntime = {
  normalizePeopleContextMode(value: unknown): PeopleContextMode;
  normalizePeopleSuggestionIgnores(value: unknown): unknown[];
  normalizePeopleSuggestionCache(value: unknown): PeopleSuggestionCache;
};

type ModeMetaRuntime = {
  isCustomPromptModeTemplate(value: unknown): boolean;
};

type KnowledgeRuntime = {
  normalizeKnowledgeExtractionHistory(value: unknown): KnowledgeExtractionHistory;
};

// Keep settings I/O's strict type-checking boundary narrow while still bundling and
// executing the existing normalization implementations. esbuild resolves these
// literal CommonJS requires into the final CJS plugin bundle.
const audioRuntime = require("../ui/helpers") as AudioRuntime;
const asrRuntime = require("../asr/transcribe") as AsrRuntime;
const llmRuntime = require("../llm/config") as LlmRuntime;
const peopleRuntime = require("../people") as PeopleRuntime;
const modeMetaRuntime = require("./mode-meta") as ModeMetaRuntime;
const knowledgeRuntime = require("./util-knowledge") as KnowledgeRuntime;

export const normalizeAudioInputMode = (value: unknown): AudioInputMode =>
  audioRuntime.normalizeAudioInputMode(value);

export const normalizeAsrConcurrency = (value: unknown): number =>
  asrRuntime.normalizeAsrConcurrency(value);

export const normalizeLlmProfiles = (value: unknown): LlmProfile[] =>
  llmRuntime.normalizeLlmProfiles(value);

export const normalizePeopleContextMode = (value: unknown): PeopleContextMode =>
  peopleRuntime.normalizePeopleContextMode(value);

export const normalizePeopleSuggestionIgnores = (value: unknown): unknown[] =>
  peopleRuntime.normalizePeopleSuggestionIgnores(value);

export const normalizePeopleSuggestionCache = (value: unknown): PeopleSuggestionCache =>
  peopleRuntime.normalizePeopleSuggestionCache(value);

export const isCustomPromptModeTemplate = (value: PromptTemplate): boolean =>
  modeMetaRuntime.isCustomPromptModeTemplate(value);

export const normalizeKnowledgeExtractionHistory = (value: unknown): KnowledgeExtractionHistory =>
  knowledgeRuntime.normalizeKnowledgeExtractionHistory(value);
