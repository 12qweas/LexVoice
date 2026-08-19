import { describe, expect, it } from "vitest";
import {
  BriefingPipelineIncompleteError,
  assembleBriefingParts,
  createBriefingCheckpoint,
  createBriefingJobId,
  assessBriefingPartFidelity,
  getBriefingFidelityPolicy,
  getBriefingPartTargetChars,
  normalizeBriefingPartBody,
  planBriefingParts,
  reconcileBriefingCheckpoint,
} from "../src/briefing/pipeline";
import { BriefingCheckpointStore } from "../src/briefing/checkpoint-store";

function segment(index: number, chars: number) {
  return {
    index,
    startOffsetMs: index * 60_000,
    endOffsetMs: (index + 1) * 60_000,
    text: String(index % 10).repeat(chars),
  };
}

describe("纪要整理流水线", () => {
  it("详略偏好同时控制分部体量，详细模式用更小分部保护细节", () => {
    expect(getBriefingPartTargetChars({ detailLevel: "detailed" })).toBe(14_000);
    expect(getBriefingPartTargetChars({ structureLevel: "balanced" })).toBe(20_000);
    expect(getBriefingPartTargetChars({ detailLevel: "concise" })).toBe(28_000);

    const medium = [segment(0, 14_000), segment(1, 14_000), segment(2, 14_000)];
    expect(planBriefingParts(medium, getBriefingPartTargetChars({ detailLevel: "detailed" }))).toHaveLength(3);
    expect(planBriefingParts(medium, getBriefingPartTargetChars({ detailLevel: "concise" }))).toHaveLength(2);
  });

  it("详细模式正文下限随原始转写增长，明显摘要化时要求补充", () => {
    const policy = getBriefingFidelityPolicy({ detailLevel: "detailed" });
    expect(policy.minimumOutputRatio).toBe(0.48);

    const shortDraft = assessBriefingPartFidelity(12_000, "纪要".repeat(1_500), { detailLevel: "detailed" });
    expect(shortDraft.minimumOutputChars).toBe(5_760);
    expect(shortDraft.targetOutputChars).toBe(7_440);
    expect(shortDraft.needsExpansion).toBe(true);

    const completeDraft = assessBriefingPartFidelity(12_000, "纪要".repeat(3_000), { detailLevel: "detailed" });
    expect(completeDraft.needsExpansion).toBe(false);
  });

  it("分部计划按总体量均衡，避免最后只剩很小一段", () => {
    const parts = planBriefingParts([
      segment(0, 4_000), segment(1, 4_000), segment(2, 4_000),
      segment(3, 4_000), segment(4, 4_000), segment(5, 4_000), segment(6, 2_000),
    ], 14_000);
    expect(parts).toHaveLength(2);
    expect(parts.map((part) => part.chars)).toEqual([12_000, 14_000]);
  });

  it("七十分钟约 2.6 万字的详细纪要至少保留约一半有效正文", () => {
    const source = Array.from({ length: 13 }, (_, index) => segment(index, 2_000));
    const parts = planBriefingParts(source, getBriefingPartTargetChars({ detailLevel: "detailed" }));
    const minimumTotal = parts.reduce((sum, part) => (
      sum + assessBriefingPartFidelity(part.chars, "", { detailLevel: "detailed" }).minimumOutputChars
    ), 0);
    const targetTotal = parts.reduce((sum, part) => (
      sum + assessBriefingPartFidelity(part.chars, "", { detailLevel: "detailed" }).targetOutputChars
    ), 0);

    expect(parts).toHaveLength(2);
    expect(minimumTotal).toBe(12_480);
    expect(targetTotal).toBe(16_120);
  });

  it("短会和长会使用同一种分部计划，且不拆散单个转写段", () => {
    const short = planBriefingParts([segment(0, 1200)], 8000);
    expect(short).toHaveLength(1);
    expect(short[0].segmentStart).toBe(0);

    const long = planBriefingParts([segment(0, 2600), segment(1, 2600), segment(2, 2600)], 5000);
    expect(long).toHaveLength(2);
    expect(long.map((part) => part.segmentStart)).toEqual([0, 1]);
    expect(long.map((part) => part.segmentEnd)).toEqual([0, 2]);
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

  it("内部切片标题不会泄漏到最终纪要", () => {
    expect(normalizeBriefingPartBody("## 第 1 部分 · 00:00–42:00\n\n## 产品目标\n正文"))
      .toBe("## 产品目标\n正文");
    expect(normalizeBriefingPartBody("### 时间窗口 2：42:00–84:00\n\n延续讨论"))
      .toBe("延续讨论");
  });

  it("长会议分段拼装后仍是一篇连续纪要", () => {
    const segments = [segment(0, 2600), segment(1, 2600)];
    const parts = planBriefingParts(segments, 4000);
    const identity = createBriefingJobId({ segments, mode: "meeting", model: "model-a", optionsKey: "balanced" });
    const checkpoint = createBriefingCheckpoint({ ...identity, mode: "meeting", model: "model-a", parts });
    checkpoint.parts[0].status = "complete";
    checkpoint.parts[0].text = "## 第 1 部分 · 00:00–01:00\n\n## 产品定位\n前半段讨论";
    checkpoint.parts[1].status = "complete";
    checkpoint.parts[1].text = "## 第 2 部分 · 01:00–02:00\n\n## 落地路径\n后半段讨论";

    const assembled = assembleBriefingParts(checkpoint.parts);
    expect(assembled).toBe("## 产品定位\n前半段讨论\n\n## 落地路径\n后半段讨论");
    expect(assembled).not.toMatch(/第\s*[12]\s*部分/);
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
