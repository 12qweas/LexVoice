import { describe, expect, it } from "vitest";
import {
  buildSynthesisConsolidationPrompt,
  buildSynthesisCoverageRepairPrompt,
  buildSynthesisPartInstruction,
} from "../src/briefing/synthesis-policy";

const PARTS = [
  {
    index: 0,
    timeRange: "00:00–30:00",
    summary: "讨论产品定位与用户问题",
    body: "团队从用户场景、反例和已有数据讨论产品定位。",
  },
  {
    index: 1,
    timeRange: "30:00–60:00",
    summary: "回到产品定位并形成行动",
    body: "后半程补充约束条件，确认负责人和下一步。",
  },
];

describe("综合纪要全局成文策略", () => {
  it("把内部时间窗口视为议题证据，并要求归并成一场会议", () => {
    const prompt = buildSynthesisConsolidationPrompt({
      topicMap: "产品定位贯穿前后两段",
      parts: PARTS,
      detailLevel: "balanced",
      duration: "01:00:00",
      transcriptChars: 24_000,
    });

    expect(prompt).toContain("> [!abstract] 会议梗概");
    expect(prompt).toContain("## 1. 议题名称");
    expect(prompt).toContain("相同议题即使出现在不同时间，也必须合并到同一个章节");
    expect(prompt).toContain("以事情为主轴");
    expect(prompt).toContain("不得出现“第 N 部分”“内部窗口”“分段纪要”");
    expect(prompt).not.toContain("正文必须达到原文");
  });

  it("内部窗口只整理证据，不提前生成独立纪要", () => {
    const instruction = buildSynthesisPartInstruction({ partIndex: 2, partTotal: 3, detailLevel: "detailed" });
    expect(instruction).toContain("供全局归并使用的议题材料");
    expect(instruction).toContain("不能把当前窗口写成一场独立会议");
    expect(instruction).toContain("正反案例");
    expect(instruction).toContain("以事情为主语");
  });

  it("审计修补保留现有结构，只补缺失证据", () => {
    const prompt = buildSynthesisCoverageRepairPrompt({
      currentBody: "> [!abstract] 会议梗概\n> 当前稿\n\n## 1. 产品定位\n正文",
      findings: "遗漏后半程确认的责任人",
      topicMap: "产品定位与行动",
      parts: PARTS,
      detailLevel: "balanced",
    });
    expect(prompt).toContain("保留当前稿中已经正确的结构与内容");
    expect(prompt).toContain("只补入检查指出的缺失信息");
    expect(prompt).toContain("会议梗概 → 编号主要议题");
  });
});
