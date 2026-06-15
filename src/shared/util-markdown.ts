// 由 main.ts 抽出（模块化拆解，提升工程稳定性；纯搬迁、零行为改动）。
import * as obsidian from "obsidian";

export function escapeYamlScalar(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function escapeBaseString(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function makeFileWikiLink(file, label) {
  if (!(file instanceof obsidian.TFile)) return "";
  const target = obsidian.normalizePath(file.path || "").replace(/\.md$/i, "");
  const text = String(label || file.basename || "").trim();
  return text ? `[[${target}|${text}]]` : `[[${target}]]`;
}

export function escapeHtmlText(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
