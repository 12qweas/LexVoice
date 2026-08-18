export const BRIEFING_PIPELINE_VERSION = 1;

export type BriefingSegment = {
  index?: number;
  startOffsetMs?: number;
  endOffsetMs?: number;
  text?: string;
};

export type BriefingUsage = {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

export type BriefingPartStatus = "pending" | "running" | "complete" | "partial" | "failed";

export type BriefingPartCheckpoint = {
  index: number;
  segmentStart: number;
  segmentEnd: number;
  startOffsetMs: number;
  endOffsetMs: number;
  sourceHash: string;
  status: BriefingPartStatus;
  text: string;
  summary: string;
  people: string[];
  tags: string[];
  sedimentObjects: unknown;
  finishReason: string;
  attempts: number;
  usage: BriefingUsage;
  error: string;
  updatedAt: string;
};

export type BriefingCheckpointStatus = "running" | "partial" | "assembled" | "committed";

export type BriefingCheckpoint = {
  version: number;
  id: string;
  sourceHash: string;
  optionsHash: string;
  mode: string;
  model: string;
  status: BriefingCheckpointStatus;
  topicMap: string;
  topicMapSource: "llm" | "timeline" | "";
  topicMapFinishReason: string;
  topicMapUsage: BriefingUsage;
  auditStatus: "pending" | "complete" | "failed";
  auditText: string;
  auditFinishReason: string;
  auditUsage: BriefingUsage;
  parts: BriefingPartCheckpoint[];
  assembledBody: string;
  createdAt: string;
  updatedAt: string;
};

export type BriefingPartPlan = {
  index: number;
  segments: BriefingSegment[];
  segmentStart: number;
  segmentEnd: number;
  startOffsetMs: number;
  endOffsetMs: number;
  sourceHash: string;
  chars: number;
};

export const EMPTY_BRIEFING_USAGE: BriefingUsage = {
  promptTokens: 0,
  completionTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
};

function cleanText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value).trim();
  }
  return "";
}

function finiteNonNegative(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

export function stableBriefingHash(value: unknown): string {
  let text = "";
  if (typeof value === "string") text = value;
  else {
    try { text = JSON.stringify(value) ?? ""; }
    catch { text = ""; }
  }
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getBriefingSourceHash(segments: BriefingSegment[]): string {
  return stableBriefingHash((Array.isArray(segments) ? segments : []).map((segment, index) => [
    Number.isFinite(Number(segment?.index)) ? Number(segment.index) : index,
    finiteNonNegative(segment?.startOffsetMs),
    finiteNonNegative(segment?.endOffsetMs),
    cleanText(segment?.text),
  ].join("|")).join("\n"));
}

export function createBriefingJobId(input: {
  segments: BriefingSegment[];
  mode: string;
  model: string;
  optionsKey: string;
}): { id: string; sourceHash: string; optionsHash: string } {
  const sourceHash = getBriefingSourceHash(input.segments);
  const optionsHash = stableBriefingHash([
    BRIEFING_PIPELINE_VERSION,
    cleanText(input.mode),
    cleanText(input.model),
    cleanText(input.optionsKey),
  ].join("|"));
  return {
    id: `briefing-${sourceHash}-${optionsHash}`,
    sourceHash,
    optionsHash,
  };
}

export function planBriefingParts(
  inputSegments: BriefingSegment[],
  targetChars = 24000,
): BriefingPartPlan[] {
  const segments = (Array.isArray(inputSegments) ? inputSegments : [])
    .filter((segment) => cleanText(segment?.text));
  if (!segments.length) return [];
  const limit = Math.max(4000, Math.floor(Number(targetChars) || 24000));
  const groups: BriefingSegment[][] = [];
  let current: BriefingSegment[] = [];
  let chars = 0;
  for (const segment of segments) {
    const nextChars = cleanText(segment.text).length;
    if (current.length && chars + nextChars > limit) {
      groups.push(current);
      current = [];
      chars = 0;
    }
    current.push(segment);
    chars += nextChars;
  }
  if (current.length) groups.push(current);
  return groups.map((group, index) => {
    const first = group[0];
    const last = group[group.length - 1];
    const segmentStart = Number.isFinite(Number(first.index)) ? Number(first.index) : inputSegments.indexOf(first);
    const segmentEnd = Number.isFinite(Number(last.index)) ? Number(last.index) : inputSegments.indexOf(last);
    return {
      index,
      segments: group,
      segmentStart: Math.max(0, segmentStart),
      segmentEnd: Math.max(0, segmentEnd),
      startOffsetMs: finiteNonNegative(first.startOffsetMs),
      endOffsetMs: Math.max(finiteNonNegative(first.startOffsetMs), finiteNonNegative(last.endOffsetMs)),
      sourceHash: getBriefingSourceHash(group),
      chars: group.reduce((sum, segment) => sum + cleanText(segment.text).length, 0),
    };
  });
}

function createPartCheckpoint(plan: BriefingPartPlan): BriefingPartCheckpoint {
  return {
    index: plan.index,
    segmentStart: plan.segmentStart,
    segmentEnd: plan.segmentEnd,
    startOffsetMs: plan.startOffsetMs,
    endOffsetMs: plan.endOffsetMs,
    sourceHash: plan.sourceHash,
    status: "pending",
    text: "",
    summary: "",
    people: [],
    tags: [],
    sedimentObjects: null,
    finishReason: "",
    attempts: 0,
    usage: { ...EMPTY_BRIEFING_USAGE },
    error: "",
    updatedAt: new Date().toISOString(),
  };
}

export function createBriefingCheckpoint(input: {
  id: string;
  sourceHash: string;
  optionsHash: string;
  mode: string;
  model: string;
  parts: BriefingPartPlan[];
}): BriefingCheckpoint {
  const now = new Date().toISOString();
  return {
    version: BRIEFING_PIPELINE_VERSION,
    id: cleanText(input.id),
    sourceHash: cleanText(input.sourceHash),
    optionsHash: cleanText(input.optionsHash),
    mode: cleanText(input.mode),
    model: cleanText(input.model),
    status: "running",
    topicMap: "",
    topicMapSource: "",
    topicMapFinishReason: "",
    topicMapUsage: { ...EMPTY_BRIEFING_USAGE },
    auditStatus: "pending",
    auditText: "",
    auditFinishReason: "",
    auditUsage: { ...EMPTY_BRIEFING_USAGE },
    parts: input.parts.map(createPartCheckpoint),
    assembledBody: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function reconcileBriefingCheckpoint(
  checkpoint: BriefingCheckpoint | null,
  input: Parameters<typeof createBriefingCheckpoint>[0],
): BriefingCheckpoint {
  if (!checkpoint
    || checkpoint.version !== BRIEFING_PIPELINE_VERSION
    || checkpoint.id !== input.id
    || checkpoint.sourceHash !== input.sourceHash
    || checkpoint.optionsHash !== input.optionsHash) {
    return createBriefingCheckpoint(input);
  }
  const byIndex = new Map(checkpoint.parts.map((part) => [part.index, part]));
  checkpoint.parts = input.parts.map((plan) => {
    const previous = byIndex.get(plan.index);
    if (!previous || previous.sourceHash !== plan.sourceHash) return createPartCheckpoint(plan);
    if (previous.status === "running") {
      return { ...previous, status: "pending", error: "上次运行中断，等待恢复" };
    }
    return previous;
  });
  checkpoint.updatedAt = new Date().toISOString();
  return checkpoint;
}

export function buildProgrammaticTopicMap(parts: BriefingPartPlan[], formatElapsed: (ms: number) => string): string {
  const lines = ["## 全程议题索引"];
  for (const part of parts) {
    const firstText = cleanText(part.segments[0]?.text).replace(/\s+/g, " ");
    const preview = firstText.length > 90 ? `${firstText.slice(0, 90)}…` : firstText;
    lines.push(`- ${formatElapsed(part.startOffsetMs)}–${formatElapsed(part.endOffsetMs)}：${preview || "本时段转写内容"}`);
  }
  return lines.join("\n");
}

export function assembleBriefingParts(parts: BriefingPartCheckpoint[]): string {
  const ordered = [...parts].sort((left, right) => left.index - right.index);
  const incomplete = ordered.filter((part) => part.status !== "complete" || !cleanText(part.text));
  if (incomplete.length) {
    throw new BriefingPipelineIncompleteError(
      `纪要整理部分完成：${ordered.length - incomplete.length}/${ordered.length} 部分已完成`,
      ordered.length - incomplete.length,
      ordered.length,
      incomplete.map((part) => part.index),
    );
  }
  return ordered.map((part) => cleanText(part.text)).filter(Boolean).join("\n\n");
}

export class BriefingPipelineIncompleteError extends Error {
  readonly completedParts: number;
  readonly totalParts: number;
  readonly failedPartIndexes: number[];

  constructor(message: string, completedParts: number, totalParts: number, failedPartIndexes: number[]) {
    super(message);
    this.name = "BriefingPipelineIncompleteError";
    this.completedParts = completedParts;
    this.totalParts = totalParts;
    this.failedPartIndexes = failedPartIndexes;
  }
}
