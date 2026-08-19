import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const modalSource = readFileSync(new URL("../src/ui/modals.ts", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

describe("progress modal interaction contract", () => {
  it("shows concrete task context instead of a generic running-health sentence", () => {
    expect(modalSource).toContain('text: "当前任务"');
    expect(modalSource).toContain('["来源文件夹", detail.sourceFolder]');
    expect(modalSource).toContain('["音频时长", Number(detail.durationMs) > 0 ? fmtDur(Number(detail.durationMs)) : ""]');
    expect(modalSource).toContain('["原模式", detail.sourceModeLabel]');
    expect(modalSource).toContain('["目标模式", detail.targetModeLabel || detail.modeLabel]');
    expect(modalSource).toContain('String(detail.liveness || "running") !== "running"');
    expect(modalSource).toContain('running: "",');
    expect(mainSource).toContain("sourceFolder: file.parent && file.parent.path ? file.parent.path : \"知识库根目录\"");
    expect(mainSource).toContain("durationMs: getLexVoiceSegmentsDurationMs(segments) || getSessionMetaDurationMs(sessionMeta)");
    expect(mainSource).toContain("sourceModeLabel,");
    expect(mainSource).toContain("targetModeLabel: [meta.label || meta.prefix, repolishOptions && repolishOptions.label]");
  });

  it("uses the available width for task facts and collapses responsively", () => {
    expect(styles).toContain(".lexvoice-progress-current-facts");
    expect(styles).toContain("grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(styles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
  });

  it("restores list scroll after dynamic rows have been rendered", () => {
    expect(modalSource).toContain("const restoreScrollTop = this._scrollTop;");
    expect(modalSource).toContain("window.requestAnimationFrame(() => {");
    expect(modalSource).toContain("list.scrollTop = Math.min(restoreScrollTop, maxScrollTop);");
  });

  it("does not refresh the entire modal while the user is scrolling", () => {
    expect(modalSource).toContain("this._lastScrollAt = Date.now();");
    expect(modalSource).toContain("if (Date.now() - this._lastScrollAt < 900) return;");
  });

  it("keeps the current-step icon and copy in one padded row", () => {
    expect(styles).toMatch(/\.lexvoice-progress-row\.lexvoice-progress-legacy-current\s*\{[^}]*grid-template-columns:\s*24px\s+minmax\(0,\s*1fr\)/s);
    expect(styles).toMatch(/\.lexvoice-progress-row\.lexvoice-progress-legacy-current\s*\{[^}]*padding:\s*var\(--size-4-3\)\s+var\(--size-4-6\)/s);
  });
});
