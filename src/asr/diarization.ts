export interface DiarizationRequestOptions {
  responseFormat: "json" | "diarized_json";
  chunkingStrategy: "auto" | "";
  supportsPrompt: boolean;
}

function providerRecord(provider: unknown): Record<string, unknown> {
  return provider && typeof provider === "object" ? provider as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function isSpeakerDiarizationProvider(provider: unknown): boolean {
  const value = providerRecord(provider);
  const protocol = stringValue(value.protocol).trim().toLowerCase();
  const model = stringValue(value.model).trim().toLowerCase();
  return protocol === "dashscope-filetrans"
    || protocol === "openai-diarized-transcription"
    || protocol === "speaker-diarization"
    || /(?:^|[-_/])diari[sz](?:e|ation)(?:$|[-_/])/.test(model)
    || /whisperx/i.test(model);
}

export function getSpeakerDiarizationRequestOptions(provider: unknown): DiarizationRequestOptions {
  const value = providerRecord(provider);
  const protocol = stringValue(value.protocol).trim().toLowerCase();
  const model = stringValue(value.model).trim().toLowerCase();
  const openAiDiarized = protocol === "openai-diarized-transcription" || model === "gpt-4o-transcribe-diarize";
  return {
    responseFormat: openAiDiarized ? "diarized_json" : "json",
    chunkingStrategy: openAiDiarized ? "auto" : "",
    supportsPrompt: !openAiDiarized,
  };
}
