import { describe, expect, it } from "vitest";
import {
  BriefingPipelineIncompleteError,
  assembleBriefingParts,
  createBriefingCheckpoint,
  createBriefingJobId,
  planBriefingParts,
  reconcileBriefingCheckpoint,
} from "../src/briefing/pipeline";
import { BriefingCheckpointStore } from "../src/briefing/checkpoint-store";

function segment(index: number, chars: number) {
  return {
    index,
    startOffsetMs: index * 60_000,
    endOffsetMs: (index + 1) * 60_000,
    text: String(index).repeat(chars),
  };
}

describe("纪要整理流水线", () => {
  it("短会和长会使用同一种分部计划，且不拆散单个转写段", () => {
    const short = planBriefingParts([segment(0, 1200)], 8000);
    expect(short).toHaveLength(1);
    expect(short[0].segmentStart).toBe(0);

    const long = planBriefingParts([segment(0, 2600), segment(1, 2600), segment(2, 2600)], 5000);
    expect(long).toHaveLength(3);
    expect(long.map((part) => part.segmentStart)).toEqual([0, 1, 2]);
    expect(long.map((part) => part.segmentEnd)).toEqual([0, 1, 2]);
  });

  it("同一来源和偏好生成稳定任务 ID，偏好变化会隔离旧检查点", () => {
    const segments = [segment(0, 100)];
    const first = createBriefingJobId({ segments, mode: "meeting", model: "model-a", optionsKey: "balanced" });
    const same = createBriefingJobId({ segments, mode: "meeting", model: "model-a", optionsKey: "balanced" });
    const changed = createBriefingJobId({ segments, mode: "meeting", model: "model-a", optionsKey: "detailed" });
    expect(same).toEqual(first);
    expect(changed.id).not.toBe(first.id);
  });

  it("恢复时保留已完成分部，并把中断中的分部恢复为待处理", () => {
    const segments = [segment(0, 2600), segment(1, 2600)];
    const parts = planBriefingParts(segments, 4000);
    const identity = createBriefingJobId({ segments, mode: "meeting", model: "model-a", optionsKey: "balanced" });
    const input = { ...identity, mode: "meeting", model: "model-a", parts };
    const checkpoint = createBriefingCheckpoint(input);
    checkpoint.parts[0].status = "complete";
    checkpoint.parts[0].text = "第一部分正文";
    checkpoint.parts[1].status = "running";

    const restored = reconcileBriefingCheckpoint(checkpoint, input);
    expect(restored.parts[0]).toMatchObject({ status: "complete", text: "第一部分正文" });
    expect(restored.parts[1]).toMatchObject({ status: "pending", error: "上次运行中断，等待恢复" });
  });

  it("未完成分部不能被拼装成成功纪要", () => {
    const segments = [segment(0, 2600), segment(1, 2600)];
    const parts = planBriefingParts(segments, 4000);
    const identity = createBriefingJobId({ segments, mode: "meeting", model: "model-a", optionsKey: "balanced" });
    const checkpoint = createBriefingCheckpoint({ ...identity, mode: "meeting", model: "model-a", parts });
    checkpoint.parts[0].status = "complete";
    checkpoint.parts[0].text = "第一部分正文";
    checkpoint.parts[1].status = "partial";
    checkpoint.parts[1].text = "被截断的正文";

    expect(() => assembleBriefingParts(checkpoint.parts)).toThrow(BriefingPipelineIncompleteError);
  });

  it("所有分部完成后只按时间顺序做确定性拼装", () => {
    const segments = [segment(0, 2600), segment(1, 2600)];
    const parts = planBriefingParts(segments, 4000);
    const identity = createBriefingJobId({ segments, mode: "meeting", model: "model-a", optionsKey: "balanced" });
    const checkpoint = createBriefingCheckpoint({ ...identity, mode: "meeting", model: "model-a", parts });
    checkpoint.parts[1].status = "complete";
    checkpoint.parts[1].text = "第二部分正文";
    checkpoint.parts[0].status = "complete";
    checkpoint.parts[0].text = "第一部分正文";

    expect(assembleBriefingParts(checkpoint.parts)).toBe("第一部分正文\n\n第二部分正文");
  });

  it("检查点写入插件私有目录，并可在重启后恢复", async () => {
    const files = new Map<string, string>();
    const folders = new Set<string>([".obsidian/plugins/lexvoice"]);
    const adapter = {
      exists: async (path: string) => files.has(path) || folders.has(path),
      mkdir: async (path: string) => { folders.add(path); },
      write: async (path: string, data: string) => { files.set(path, data); },
      read: async (path: string) => {
        const value = files.get(path);
        if (value === undefined) throw new Error("missing");
        return value;
      },
      remove: async (path: string) => { files.delete(path); },
      rename: async (from: string, to: string) => {
        const value = files.get(from);
        if (value === undefined) throw new Error("missing");
        files.set(to, value);
        files.delete(from);
      },
    };
    const segments = [segment(0, 100)];
    const parts = planBriefingParts(segments, 4000);
    const identity = createBriefingJobId({ segments, mode: "meeting", model: "model-a", optionsKey: "balanced" });
    const checkpoint = createBriefingCheckpoint({ ...identity, mode: "meeting", model: "model-a", parts });
    checkpoint.parts[0].status = "complete";
    checkpoint.parts[0].text = "已付费生成的正文";
    const store = new BriefingCheckpointStore(adapter as never, ".obsidian", "lexvoice");

    await store.save(checkpoint);
    const restored = await store.load(checkpoint.id);
    expect(restored?.parts[0]).toMatchObject({ status: "complete", text: "已付费生成的正文" });

    await store.remove(checkpoint.id);
    expect(await store.load(checkpoint.id)).toBeNull();
  });
});
