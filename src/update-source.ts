import { normalizePath } from "obsidian";

export const LEXVOICE_UPDATE_REPO_URL = "https://github.com/Lynn-x/LexVoice";
export const LEXVOICE_UPDATE_BRANCH = "main";
export const LEXVOICE_UPDATE_PLUGIN_DIR = "";
export const LEXVOICE_UPDATE_RAW_BASE_URL = "";

export interface GithubRepository {
  owner: string;
  repo: string;
}

export interface PluginPathHost {
  app: {
    vault: {
      configDir: string;
    };
  };
  manifest: {
    id: string;
    dir?: string;
  };
}

export interface PluginBasePathInput {
  configDir: string;
  manifest: {
    id: string;
    dir?: string;
  };
}

export function parseGithubRepoUrl(url: string): GithubRepository | null {
  const text = url.trim();
  const match = text.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:[/#?].*)?$/i)
    ?? text.match(/^git@github\.com:([^/\s]+)\/([^/\s#?]+?)(?:\.git)?$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
}

export function trimSlashes(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function addUniqueBase(out: string[], url: string): void {
  const clean = url.trim().replace(/\/+$/g, "");
  if (clean && !out.includes(clean)) out.push(clean);
}

// The argument is intentionally accepted for compatibility with the former UI helper.
// Update sources are official constants; persisted settings have never overridden them.
export function resolveUpdateRawBase(_settings?: unknown): string {
  const rawBase = LEXVOICE_UPDATE_RAW_BASE_URL.trim().replace(/\/+$/g, "");
  if (rawBase) return rawBase;
  const repo = parseGithubRepoUrl(LEXVOICE_UPDATE_REPO_URL);
  if (!repo) return "";
  const branch = LEXVOICE_UPDATE_BRANCH.trim() || "main";
  const subdir = trimSlashes(LEXVOICE_UPDATE_PLUGIN_DIR);
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}${subdir ? `/${subdir}` : ""}`;
}

export function resolveUpdateRawBases(settings?: unknown): string[] {
  const out: string[] = [];
  addUniqueBase(out, resolveUpdateRawBase(settings));
  if (LEXVOICE_UPDATE_RAW_BASE_URL.trim()) return out;

  const repo = parseGithubRepoUrl(LEXVOICE_UPDATE_REPO_URL);
  if (!repo) return out;
  const branch = LEXVOICE_UPDATE_BRANCH.trim() || "main";
  const subdir = trimSlashes(LEXVOICE_UPDATE_PLUGIN_DIR);
  const suffix = `${repo.owner}/${repo.repo}@${branch}${subdir ? `/${subdir}` : ""}`;
  addUniqueBase(out, `https://fastly.jsdelivr.net/gh/${suffix}`);
  addUniqueBase(out, `https://cdn.jsdelivr.net/gh/${suffix}`);
  return out;
}

export function resolveUpdateVersionedBases(version: string): string[] {
  const targetVersion = version.trim();
  const out: string[] = [];
  const repo = parseGithubRepoUrl(LEXVOICE_UPDATE_REPO_URL);
  if (!repo || !targetVersion) return out;

  const subdir = trimSlashes(LEXVOICE_UPDATE_PLUGIN_DIR);
  const tagSuffix = `${repo.owner}/${repo.repo}@${targetVersion}${subdir ? `/${subdir}` : ""}`;
  addUniqueBase(out, `https://fastly.jsdelivr.net/gh/${tagSuffix}`);
  addUniqueBase(out, `https://cdn.jsdelivr.net/gh/${tagSuffix}`);
  const releaseBase = `${LEXVOICE_UPDATE_REPO_URL.replace(/\/+$/g, "")}/releases/download/${targetVersion}`;
  addUniqueBase(out, releaseBase);
  addUniqueBase(out, `https://mirror.ghproxy.com/${releaseBase}`);
  addUniqueBase(out, `https://ghproxy.net/${releaseBase}`);
  return out;
}

export function resolvePluginBasePath(input: PluginBasePathInput): string {
  const configDir = input.configDir;
  const dir = input.manifest.dir ? input.manifest.dir : input.manifest.id;
  const normalizedDir = normalizePath(dir);
  const pluginRoot = configDir ? normalizePath(`${configDir}/plugins`) : "";
  if (pluginRoot && normalizedDir.startsWith(`${pluginRoot}/`)) return normalizedDir;
  if (!pluginRoot) return normalizedDir;
  return normalizePath(`${pluginRoot}/${normalizedDir}`);
}

export function pluginBasePath(plugin: PluginPathHost): string {
  return resolvePluginBasePath({
    configDir: plugin.app.vault.configDir,
    manifest: plugin.manifest,
  });
}
