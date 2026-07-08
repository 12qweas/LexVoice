import { describe, it, expect } from "vitest";
import { buildQuickDictationCleanupPrompt, QUICK_DICTATION_DEFAULT_TEMPLATE } from "../src/prompts/clean-transcript";

describe("buildQuickDictationCleanupPrompt", () => {
  it("默认模板：占位符被替换为转写原文，且不残留占位符", () => {
    const out = buildQuickDictationCleanupPrompt("今天先测三件事", undefined);
    expect(out).toContain("今天先测三件事");
    expect(out).not.toContain("{{转写}}");
    expect(out).toContain("【必须结构化——最重要】");
  });

  it("自定义模板：宽松空白 {{ 转写 }} 也被识别并替换，不会再拼接一份", () => {
    const out = buildQuickDictationCleanupPrompt("原文A", "请整理：\n{{ 转写 }}\n完");
    expect(out).toBe("请整理：\n原文A\n完");
    // 识别了占位符就不该再走"拼接到末尾"分支
    expect(out).not.toContain("【待整理的转写】");
  });

  it("自定义模板无占位符：自动把原文拼接在末尾", () => {
    const out = buildQuickDictationCleanupPrompt("原文B", "只有指令没有占位符");
    expect(out).toContain("只有指令没有占位符");
    expect(out).toContain("【待整理的转写】\n原文B");
  });

  it("空/全空白模板：回退内置默认模板", () => {
    const a = buildQuickDictationCleanupPrompt("原文C", "");
    const b = buildQuickDictationCleanupPrompt("原文C", "   \n  ");
    const expected = QUICK_DICTATION_DEFAULT_TEMPLATE.replace(/\{\{\s*转写\s*\}\}/g, () => "原文C");
    expect(a).toBe(expected);
    expect(b).toBe(expected);
  });

  it("原文含 $ 美元序列（$& / $$ / $'）时必须原样保留，不被 replace 展开篡改", () => {
    const raw = "金额 $100，再加 $$，以及 $& 和 $' 这些符号";
    const out = buildQuickDictationCleanupPrompt(raw, "内容：{{转写}}");
    expect(out).toBe("内容：" + raw);
  });

  it("多处占位符：每一处都被替换", () => {
    const out = buildQuickDictationCleanupPrompt("X", "先看{{转写}}，再核对{{ 转写 }}。");
    expect(out).toBe("先看X，再核对X。");
  });
});
