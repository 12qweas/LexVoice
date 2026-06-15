// 由 main.ts 抽出（模块化拆解，提升工程稳定性；纯搬迁、零行为改动）。
import * as obsidian from "obsidian";

export function compareVersions(a, b) {
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

export function isLexVoiceMobileRuntime() {
  return !!(obsidian.Platform && (obsidian.Platform.isMobile || obsidian.Platform.isMobileApp));
}
