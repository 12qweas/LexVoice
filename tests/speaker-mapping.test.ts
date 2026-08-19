import { describe, expect, it } from "vitest";
import {
  applySpeakerNamesForLlm,
  buildConfirmedSpeakerMappings,
  collectSpeakerCandidates,
} from "../src/asr/speaker-mapping";
import {
  getSpeakerDiarizationRequestOptions,
  isSpeakerDiarizationProvider,
} from "../src/asr/diarization";

describe("speaker confirmation preparation", () => {
  it("collects speaker labels and short evidence samples", () => {
    const candidates = collectSpeakerCandidates([
      "[说话人1] 我负责产品方案和时间表。",
      "[说话人2] 我来确认预算。",
      "[说话人1] 下周一给第一版。",
    ].join("\n"));
    expect(candidates).toEqual([
      { id: "spk-1", label: "说话人1", samples: ["我负责产品方案和时间表。", "下周一给第一版。"] },
      { id: "spk-2", label: "说话人2", samples: ["我来确认预算。"] },
    ]);
  });

  it("replaces labels only in the LLM copy and keeps unmapped speakers generic", () => {
    const source = "[说话人1] 我负责产品。\n[说话人2] 我负责预算。";
    const mappings = buildConfirmedSpeakerMappings(
      collectSpeakerCandidates(source),
      { "spk-1": "林女士", "spk-2": "" },
    );
    expect(applySpeakerNamesForLlm(source, mappings)).toBe("[林女士] 我负责产品。\n[说话人2] 我负责预算。");
    expect(source).toContain("[说话人1]");
  });
});

describe("diarization provider protocol", () => {
  it("uses OpenAI diarized JSON and automatic server chunking", () => {
    const provider = { model: "gpt-4o-transcribe-diarize", protocol: "openai-diarized-transcription" };
    expect(isSpeakerDiarizationProvider(provider)).toBe(true);
    expect(getSpeakerDiarizationRequestOptions(provider)).toEqual({
      responseFormat: "diarized_json",
      chunkingStrategy: "auto",
      supportsPrompt: false,
    });
  });

  it("keeps generic WhisperX-compatible services on JSON", () => {
    const provider = { model: "whisper-large-v3", protocol: "speaker-diarization" };
    expect(isSpeakerDiarizationProvider(provider)).toBe(true);
    expect(getSpeakerDiarizationRequestOptions(provider)).toEqual({
      responseFormat: "json",
      chunkingStrategy: "",
      supportsPrompt: true,
    });
  });
});
