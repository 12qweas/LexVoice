import type { AvailableUpdate, PluginSettings } from "./shared/types";
import { compareVersions } from "./shared/version";
import {
  resolvePluginBasePath,
  resolveUpdateRawBase,
  resolveUpdateRawBases,
  resolveUpdateVersionedBases,
} from "./update-source";

export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const UPDATE_STARTUP_DELAY_MS = 4000;
export const UPDATE_PLUGIN_FILES = ["manifest.json", "main.js", "styles.css", "README.md"] as const;

export type UpdateSettings = Pick<
  PluginSettings,
  | "autoCheckUpdates"
  | "lastUpdateCheckAt"
  | "availableUpdate"
  | "lastUpdateError"
  | "installedUpdateVersion"
>;

export interface UpdateManifest {
  id: string;
  version: string;
  dir?: string;
}

export interface UpdateAdapter {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  mkdir(path: string): Promise<void>;
}

export interface UpdateServiceHost {
  settings: UpdateSettings;
  manifest: UpdateManifest;
  configDir: string;
  adapter: UpdateAdapter;
  saveSettings(): Promise<void>;
}

export interface UpdateRequestOptions {
  url: string;
  method: "GET";
  headers: Readonly<Record<string, string>>;
}

export interface UpdateResponse {
  status: number;
  text: string;
}

export interface UpdateRuntime {
  requestUrl?(options: UpdateRequestOptions): Promise<UpdateResponse>;
  notice(message: string, duration?: number): void;
  warn(message: string, error?: unknown): void;
  now(): number;
  normalizePath(path: string): string;
  setTimeout(handler: () => void, delayMs: number): number;
  clearTimeout(handle: number): void;
  buildVersion: string;
}

export interface CheckForUpdatesOptions {
  silent?: boolean;
  allowSameVersion?: boolean;
}

interface FetchedUpdateText {
  text: string;
  rawBaseUrl: string;
  url: string;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    if (message) return String(message);
  }
  return String(error);
}

function parseRemoteManifest(text: string): { id: string; version: string } {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || !("id" in parsed) || typeof parsed.id !== "string") {
    return { id: "", version: "0.0.0" };
  }
  const version = "version" in parsed && typeof parsed.version === "string" && parsed.version
    ? parsed.version
    : "0.0.0";
  return { id: parsed.id, version };
}

function joinUpdateUrl(rawBase: string, fileName: string): string {
  return `${rawBase.replace(/\/+$/g, "")}/${fileName.replace(/^\/+/, "")}`;
}

export class UpdateService {
  private startupTimer: number | null = null;
  private disposed = false;

  constructor(
    private readonly host: UpdateServiceHost,
    private readonly runtime: UpdateRuntime,
  ) {}

  getUpdateRawBase(): string {
    return resolveUpdateRawBase(this.host.settings);
  }

  getUpdateRawBases(): string[] {
    return resolveUpdateRawBases(this.host.settings);
  }

  checkForUpdatesOnStartup(): void {
    if (this.disposed) return;
    if (!this.host.settings.autoCheckUpdates) return;
    if (!this.getUpdateRawBase()) return;
    const last = Date.parse(this.host.settings.lastUpdateCheckAt || "");
    if (last && this.runtime.now() - last < UPDATE_CHECK_INTERVAL_MS) return;
    if (this.startupTimer !== null) return;

    this.startupTimer = this.runtime.setTimeout(() => {
      this.startupTimer = null;
      void this.checkForUpdates({ silent: true })
        .catch(error => this.runtime.warn("[LexVoice] update check failed", error));
    }, UPDATE_STARTUP_DELAY_MS);
  }

  dispose(): void {
    this.disposed = true;
    if (this.startupTimer === null) return;
    this.runtime.clearTimeout(this.startupTimer);
    this.startupTimer = null;
  }

  async checkForUpdates(options: CheckForUpdatesOptions = {}): Promise<AvailableUpdate | null> {
    const silent = !!options.silent;
    const allowSameVersion = !!options.allowSameVersion;
    const rawBases = this.getUpdateRawBases();
    if (!rawBases.length) {
      if (!silent) this.runtime.notice("LexVoice 更新源未解析成功，请确认插件文件完整。", 8000);
      return null;
    }

    try {
      const manifestFetch = await this.fetchTextFromSources(rawBases, "manifest.json");
      const remoteManifest = parseRemoteManifest(manifestFetch.text);
      if (remoteManifest.id !== this.host.manifest.id) {
        throw new Error("远端 manifest id 与当前插件不一致，已停止更新。");
      }
      const currentVersion = this.host.manifest.version || "0.0.0";
      const remoteVersion = remoteManifest.version || "0.0.0";
      const info: AvailableUpdate = {
        version: remoteVersion,
        currentVersion,
        rawBaseUrl: manifestFetch.rawBaseUrl,
        manifestUrl: manifestFetch.url,
        checkedAt: new Date(this.runtime.now()).toISOString(),
        files: [...UPDATE_PLUGIN_FILES],
      };
      this.host.settings.lastUpdateCheckAt = info.checkedAt;
      this.host.settings.lastUpdateError = "";

      if (compareVersions(remoteVersion, currentVersion) > 0) {
        this.host.settings.availableUpdate = info;
        await this.host.saveSettings();
        this.runtime.notice(
          `LexVoice：发现新版本 ${remoteVersion}（当前 ${currentVersion}）。可在设置 > 更新 中一键增量更新。`,
          silent ? 12000 : 8000,
        );
        return info;
      }

      if (allowSameVersion && compareVersions(remoteVersion, currentVersion) === 0) {
        await this.host.saveSettings();
        if (!silent) {
          this.runtime.notice(`LexVoice 当前仍是 ${currentVersion}，将重新安装官方文件以修复本地副本。`, 8000);
        }
        return info;
      }

      this.host.settings.availableUpdate = null;
      await this.host.saveSettings();
      if (!silent) this.runtime.notice(`LexVoice 已是最新版本（${currentVersion}）。`);
      return null;
    } catch (error) {
      const message = errorMessage(error);
      this.host.settings.lastUpdateCheckAt = new Date(this.runtime.now()).toISOString();
      this.host.settings.lastUpdateError = message;
      await this.host.saveSettings();
      if (!silent) this.runtime.notice(`LexVoice 更新检查失败：${message}`, 10000);
      else this.runtime.warn("[LexVoice] update check failed", error);
      return null;
    }
  }

  async installAvailableUpdate(): Promise<void> {
    let info = this.host.settings.availableUpdate;
    if (!info || !info.rawBaseUrl || compareVersions(info.version, this.host.manifest.version) <= 0) {
      info = await this.checkForUpdates({ silent: false, allowSameVersion: true });
    }
    if (!info || !info.rawBaseUrl) return;

    const basePath = resolvePluginBasePath({
      configDir: this.host.configDir,
      manifest: this.host.manifest,
    });
    const backupDir = `${basePath}/.lexvoice-update-backups/${this.backupStamp()}`;
    await this.ensureAdapterFolder(backupDir);

    for (const fileName of [...UPDATE_PLUGIN_FILES, "data.json"]) {
      const target = `${basePath}/${fileName}`;
      if (await this.host.adapter.exists(target)) {
        await this.host.adapter.write(`${backupDir}/${fileName}`, await this.host.adapter.read(target));
      }
    }

    const changed: string[] = [];
    const skipped: string[] = [];
    const rawBases = resolveUpdateVersionedBases(info.version)
      .concat([info.rawBaseUrl])
      .concat(this.getUpdateRawBases())
      .filter(Boolean);

    const fetchedFiles: Partial<Record<(typeof UPDATE_PLUGIN_FILES)[number], string>> = {};
    for (const fileName of UPDATE_PLUGIN_FILES) {
      try {
        const fetched = await this.fetchTextFromSources(rawBases, fileName);
        if (fileName === "manifest.json") info.rawBaseUrl = fetched.rawBaseUrl;
        fetchedFiles[fileName] = fetched.text;
      } catch (error) {
        if (fileName === "README.md") {
          skipped.push(fileName);
          continue;
        }
        throw new Error(`更新 ${fileName} 失败：${errorMessage(error)}（未改动任何本地文件，可稍后重试）`);
      }
    }

    const writeOrder = UPDATE_PLUGIN_FILES
      .filter(fileName => fileName !== "manifest.json" && fetchedFiles[fileName] !== undefined)
      .concat(fetchedFiles["manifest.json"] !== undefined ? ["manifest.json"] : []);
    for (const fileName of writeOrder) {
      const target = `${basePath}/${fileName}`;
      const next = fetchedFiles[fileName];
      if (next === undefined) continue;
      const current = await this.host.adapter.exists(target) ? await this.host.adapter.read(target) : "";
      if (current === next) {
        skipped.push(fileName);
        continue;
      }
      await this.host.adapter.write(target, next);
      const verified = await this.host.adapter.read(target);
      if (verified !== next) {
        throw new Error(`写入 ${fileName} 后校验失败，请检查插件目录写入权限。`);
      }
      changed.push(fileName);
    }

    this.host.settings.installedUpdateVersion = info.version;
    this.host.settings.availableUpdate = null;
    this.host.settings.lastUpdateError = "";
    await this.host.saveSettings();

    const changedText = changed.length ? changed.join("、") : "无文件变化";
    const skippedText = skipped.length ? `；跳过 ${skipped.join("、")}` : "";
    this.runtime.notice(
      `LexVoice 已安装 ${info.version}：更新 ${changedText}${skippedText}。写入目录：${basePath}。请重启 Obsidian 或重新启用插件生效。`,
      12000,
    );
  }

  warnIfBuildManifestSkew(): void {
    try {
      const built = this.runtime.buildVersion;
      const declared = this.host.manifest.version || "";
      if (built && declared && built !== declared) {
        this.runtime.warn(`[LexVoice] build/manifest 版本错位：main.js=${built} manifest=${declared}`);
        this.runtime.notice(
          `LexVoice 版本错位：实际运行的 main.js 是 ${built}，但 manifest 标的是 ${declared}`
          + "。上次更新可能没成功写入 main.js，当前在跑旧代码。请到 设置 > 更新 重新更新，或从 GitHub Release 手动重装最新版后重启 Obsidian。",
          0,
        );
      }
    } catch (error) {
      this.runtime.warn("[LexVoice] skew check failed", error);
    }
  }

  private async fetchText(url: string): Promise<string> {
    const errors: string[] = [];
    if (this.runtime.requestUrl) {
      try {
        const response = await this.runtime.requestUrl({
          url,
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
        });
        if (response.status < 200 || response.status >= 300) {
          throw new Error(`HTTP ${response.status} · ${url}`);
        }
        return response.text;
      } catch (error) {
        errors.push(`requestUrl: ${errorMessage(error)}`);
      }
    }
    errors.push("requestUrl unavailable");
    throw new Error(errors.join("；"));
  }

  private async fetchTextFromSources(rawBases: readonly string[], fileName: string): Promise<FetchedUpdateText> {
    const errors: string[] = [];
    for (const rawBase of rawBases) {
      const url = `${joinUpdateUrl(rawBase, fileName)}?t=${this.runtime.now()}`;
      try {
        const text = await this.fetchText(url);
        return { text, rawBaseUrl: rawBase, url };
      } catch (error) {
        errors.push(`${rawBase} -> ${errorMessage(error)}`);
      }
    }
    throw new Error(`所有更新源都不可用：${errors.join(" | ")}`);
  }

  private backupStamp(): string {
    return new Date(this.runtime.now()).toISOString().replace(/[:.]/g, "-");
  }

  private async ensureAdapterFolder(folderPath: string): Promise<void> {
    const parts = this.runtime.normalizePath(folderPath).split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!(await this.host.adapter.exists(current))) await this.host.adapter.mkdir(current);
    }
  }
}
