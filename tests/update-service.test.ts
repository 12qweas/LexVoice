import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  normalizePath: (path: string) => path.replace(/\\/g, "/").replace(/\/+/g, "/"),
}));

import type { AvailableUpdate } from "../src/shared/types";
import {
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_PLUGIN_FILES,
  UPDATE_STARTUP_DELAY_MS,
  UpdateService,
  type UpdateAdapter,
  type UpdateRuntime,
  type UpdateSettings,
} from "../src/update-service";
import {
  pluginBasePath,
  resolveUpdateRawBases,
  resolveUpdateVersionedBases,
} from "../src/update-source";

const NOW = Date.parse("2025-02-03T04:05:06.789Z");
const BASE_PATH = ".obsidian/plugins/lexvoice";

type RequestHandler = (url: string) => Promise<{ status: number; text: string }>;

class MemoryAdapter implements UpdateAdapter {
  readonly files = new Map<string, string>();
  readonly events: string[];

  constructor(events: string[], initialFiles: Record<string, string> = {}) {
    this.events = events;
    for (const [path, content] of Object.entries(initialFiles)) this.files.set(path, content);
  }

  async exists(path: string): Promise<boolean> {
    this.events.push(`exists:${path}`);
    return this.files.has(path);
  }

  async read(path: string): Promise<string> {
    this.events.push(`read:${path}`);
    const content = this.files.get(path);
    if (content === undefined) throw new Error(`missing ${path}`);
    return content;
  }

  async write(path: string, data: string): Promise<void> {
    this.events.push(`write:${path}`);
    this.files.set(path, data);
  }

  async mkdir(path: string): Promise<void> {
    this.events.push(`mkdir:${path}`);
    this.files.set(path, "<dir>");
  }
}

interface FixtureOptions {
  currentVersion?: string;
  buildVersion?: string;
  availableUpdate?: AvailableUpdate | null;
  initialFiles?: Record<string, string>;
  request?: RequestHandler;
  now?: number;
}

function fileNameFromUrl(url: string): string {
  return new URL(url).pathname.split("/").pop() ?? "";
}

function createFixture(options: FixtureOptions = {}) {
  const events: string[] = [];
  const notices: Array<{ message: string; duration?: number }> = [];
  const warnings: Array<{ message: string; error?: unknown }> = [];
  const timers = new Map<number, () => void>();
  const clearedTimers: number[] = [];
  let nextTimer = 1;
  const now = options.now ?? NOW;
  const settings: UpdateSettings = {
    autoCheckUpdates: true,
    lastUpdateCheckAt: null,
    availableUpdate: options.availableUpdate ?? null,
    lastUpdateError: "",
    installedUpdateVersion: "",
  };
  const adapter = new MemoryAdapter(events, options.initialFiles);
  const request = options.request ?? (async (url: string) => {
    const fileName = fileNameFromUrl(url);
    if (fileName === "manifest.json") {
      return { status: 200, text: JSON.stringify({ id: "lexvoice", version: "2.0.0" }) };
    }
    return { status: 200, text: `remote:${fileName}` };
  });
  const saveSettings = vi.fn(async () => { events.push("saveSettings"); });
  const runtime: UpdateRuntime = {
    requestUrl: async ({ url }) => {
      events.push(`request:${url}`);
      return request(url);
    },
    notice: (message, duration) => notices.push({ message, duration }),
    warn: (message, error) => warnings.push({ message, error }),
    now: () => now,
    normalizePath: (path) => path.replace(/\\/g, "/").replace(/\/+/g, "/"),
    setTimeout: (handler, delayMs) => {
      events.push(`timer:set:${delayMs}`);
      const handle = nextTimer++;
      timers.set(handle, handler);
      return handle;
    },
    clearTimeout: (handle) => {
      events.push(`timer:clear:${handle}`);
      clearedTimers.push(handle);
      timers.delete(handle);
    },
    buildVersion: options.buildVersion ?? options.currentVersion ?? "1.0.0",
  };
  const service = new UpdateService({
    settings,
    manifest: { id: "lexvoice", version: options.currentVersion ?? "1.0.0" },
    configDir: ".obsidian",
    adapter,
    saveSettings,
  }, runtime);
  return {
    service,
    settings,
    adapter,
    events,
    notices,
    warnings,
    timers,
    clearedTimers,
    saveSettings,
  };
}

function existingPluginFiles(): Record<string, string> {
  return Object.fromEntries(
    [...UPDATE_PLUGIN_FILES, "data.json"].map(fileName => [`${BASE_PATH}/${fileName}`, `local:${fileName}`]),
  );
}

describe("update source and path resolution", () => {
  it("keeps official branch and versioned source ordering", () => {
    expect(resolveUpdateRawBases()).toEqual([
      "https://raw.githubusercontent.com/Lynn-x/LexVoice/main",
      "https://fastly.jsdelivr.net/gh/Lynn-x/LexVoice@main",
      "https://cdn.jsdelivr.net/gh/Lynn-x/LexVoice@main",
    ]);
    expect(resolveUpdateVersionedBases("2.0.0")).toEqual([
      "https://fastly.jsdelivr.net/gh/Lynn-x/LexVoice@2.0.0",
      "https://cdn.jsdelivr.net/gh/Lynn-x/LexVoice@2.0.0",
      "https://github.com/Lynn-x/LexVoice/releases/download/2.0.0",
      "https://mirror.ghproxy.com/https://github.com/Lynn-x/LexVoice/releases/download/2.0.0",
      "https://ghproxy.net/https://github.com/Lynn-x/LexVoice/releases/download/2.0.0",
    ]);
    expect(pluginBasePath({
      app: { vault: { configDir: ".obsidian" } },
      manifest: { id: "lexvoice", dir: ".obsidian/plugins/lexvoice" },
    })).toBe(BASE_PATH);
  });
});

describe("UpdateService startup scheduling", () => {
  it("applies 24-hour gating, fires after four seconds, and does not clear an already-fired timer", async () => {
    const fixture = createFixture({
      request: async () => ({ status: 200, text: JSON.stringify({ id: "lexvoice", version: "1.0.0" }) }),
    });
    fixture.settings.lastUpdateCheckAt = new Date(NOW - UPDATE_CHECK_INTERVAL_MS + 1).toISOString();
    fixture.service.checkForUpdatesOnStartup();
    expect(fixture.timers.size).toBe(0);

    fixture.settings.lastUpdateCheckAt = new Date(NOW - UPDATE_CHECK_INTERVAL_MS).toISOString();
    fixture.service.checkForUpdatesOnStartup();
    expect(fixture.events).toContain(`timer:set:${UPDATE_STARTUP_DELAY_MS}`);
    expect(fixture.events.some(event => event.startsWith("request:"))).toBe(false);

    const handler = [...fixture.timers.values()][0];
    handler();
    await vi.waitFor(() => expect(fixture.events.some(event => event.startsWith("request:"))).toBe(true));
    fixture.service.dispose();
    expect(fixture.clearedTimers).toEqual([]);
  });

  it("dispose clears only a startup timer that has not fired", () => {
    const fixture = createFixture();
    fixture.service.checkForUpdatesOnStartup();
    fixture.service.dispose();
    fixture.service.checkForUpdatesOnStartup();
    expect(fixture.clearedTimers).toEqual([1]);
    expect(fixture.timers.size).toBe(0);
    expect(fixture.events.filter(event => event.startsWith("timer:set:"))).toHaveLength(1);
  });
});

describe("UpdateService checks", () => {
  it("falls back in source order, writes check state, and still notices a new version when silent", async () => {
    const requestedHosts: string[] = [];
    const fixture = createFixture({
      request: async (url) => {
        requestedHosts.push(new URL(url).host);
        if (url.startsWith("https://raw.githubusercontent.com/")) throw new Error("primary down");
        return { status: 200, text: JSON.stringify({ id: "lexvoice", version: "2.0.0" }) };
      },
    });

    const info = await fixture.service.checkForUpdates({ silent: true });
    expect(requestedHosts.slice(0, 2)).toEqual(["raw.githubusercontent.com", "fastly.jsdelivr.net"]);
    expect(info?.rawBaseUrl).toBe("https://fastly.jsdelivr.net/gh/Lynn-x/LexVoice@main");
    expect(fixture.settings.availableUpdate).toEqual(info);
    expect(fixture.settings.lastUpdateCheckAt).toBe(new Date(NOW).toISOString());
    expect(fixture.settings.lastUpdateError).toBe("");
    expect(fixture.saveSettings).toHaveBeenCalledTimes(1);
    expect(fixture.notices).toEqual([{
      message: "LexVoice：发现新版本 2.0.0（当前 1.0.0）。可在设置 > 更新 中一键增量更新。",
      duration: 12000,
    }]);
  });

  it("saves failed check status while respecting silent Notice semantics", async () => {
    const fixture = createFixture({ request: async () => { throw new Error("offline"); } });
    const result = await fixture.service.checkForUpdates({ silent: true });
    expect(result).toBeNull();
    expect(fixture.settings.lastUpdateCheckAt).toBe(new Date(NOW).toISOString());
    expect(fixture.settings.lastUpdateError).toContain("所有更新源都不可用");
    expect(fixture.saveSettings).toHaveBeenCalledTimes(1);
    expect(fixture.notices).toEqual([]);
    expect(fixture.warnings[0]?.message).toBe("[LexVoice] update check failed");
  });
});

describe("UpdateService skew warning", () => {
  it("preserves the build/manifest mismatch warning", () => {
    const fixture = createFixture({ currentVersion: "2.0.0", buildVersion: "1.9.0" });
    fixture.service.warnIfBuildManifestSkew();
    expect(fixture.warnings[0]?.message).toBe(
      "[LexVoice] build/manifest 版本错位：main.js=1.9.0 manifest=2.0.0",
    );
    expect(fixture.notices).toEqual([{
      message: "LexVoice 版本错位：实际运行的 main.js 是 1.9.0，但 manifest 标的是 2.0.0。上次更新可能没成功写入 main.js，当前在跑旧代码。请到 设置 > 更新 重新更新，或从 GitHub Release 手动重装最新版后重启 Obsidian。",
      duration: 0,
    }]);
  });
});

describe("UpdateService installation", () => {
  it("backs up five files before downloads, uses per-file sources, downloads fully before ordered verified writes, and treats README as optional", async () => {
    const availableUpdate: AvailableUpdate = {
      version: "2.0.0",
      currentVersion: "1.0.0",
      rawBaseUrl: "https://chosen.example/plugin",
      manifestUrl: "https://chosen.example/plugin/manifest.json",
      checkedAt: new Date(NOW).toISOString(),
      files: [...UPDATE_PLUGIN_FILES],
    };
    const successes = new Map<string, string>();
    const fixture = createFixture({
      availableUpdate,
      initialFiles: existingPluginFiles(),
      request: async (url) => {
        const fileName = fileNameFromUrl(url);
        if (fileName === "README.md") throw new Error("optional missing");
        if (fileName === "manifest.json" && url.startsWith("https://fastly.jsdelivr.net/")) {
          successes.set(fileName, "fastly");
          return { status: 200, text: JSON.stringify({ id: "lexvoice", version: "2.0.0" }) };
        }
        if (fileName === "main.js" && url.startsWith("https://cdn.jsdelivr.net/")) {
          successes.set(fileName, "cdn");
          return { status: 200, text: "remote:main.js" };
        }
        if (fileName === "styles.css" && url.startsWith("https://github.com/")) {
          successes.set(fileName, "release");
          return { status: 200, text: "remote:styles.css" };
        }
        throw new Error(`source miss ${fileName}`);
      },
    });

    await fixture.service.installAvailableUpdate();

    expect(successes).toEqual(new Map([
      ["manifest.json", "fastly"],
      ["main.js", "cdn"],
      ["styles.css", "release"],
    ]));
    const backupWrites = fixture.events.filter(event => event.startsWith(`write:${BASE_PATH}/.lexvoice-update-backups/`));
    expect(backupWrites.map(event => event.split("/").pop())).toEqual([
      "manifest.json", "main.js", "styles.css", "README.md", "data.json",
    ]);
    const firstRequest = fixture.events.findIndex(event => event.startsWith("request:"));
    expect(fixture.events.slice(0, firstRequest).filter(event => event.startsWith("write:"))).toHaveLength(5);

    const targetWrites = fixture.events.filter(event =>
      event.startsWith(`write:${BASE_PATH}/`) && !event.includes("/.lexvoice-update-backups/"),
    );
    expect(targetWrites).toEqual([
      `write:${BASE_PATH}/main.js`,
      `write:${BASE_PATH}/styles.css`,
      `write:${BASE_PATH}/manifest.json`,
    ]);
    const lastRequest = fixture.events.reduce((last, event, index) => event.startsWith("request:") ? index : last, -1);
    const firstTargetWrite = fixture.events.findIndex(event => targetWrites.includes(event));
    expect(lastRequest).toBeLessThan(firstTargetWrite);
    for (const writeEvent of targetWrites) {
      const writeIndex = fixture.events.indexOf(writeEvent);
      expect(fixture.events[writeIndex + 1]).toBe(writeEvent.replace("write:", "read:"));
    }
    expect(fixture.events.some(event => event.startsWith("request:") && event.includes("data.json"))).toBe(false);
    expect(fixture.events).not.toContain(`write:${BASE_PATH}/data.json`);
    expect(fixture.adapter.files.get(`${BASE_PATH}/data.json`)).toBe("local:data.json");
    expect(fixture.settings.installedUpdateVersion).toBe("2.0.0");
    expect(fixture.settings.availableUpdate).toBeNull();
    expect(fixture.saveSettings).toHaveBeenCalledTimes(1);
    expect(fixture.notices.at(-1)?.message).toContain("跳过 README.md");
  });

  it("supports same-version repair by checking and reinstalling official files", async () => {
    const fixture = createFixture({
      currentVersion: "1.0.0",
      initialFiles: existingPluginFiles(),
      request: async (url) => {
        const fileName = fileNameFromUrl(url);
        if (fileName === "manifest.json") {
          return { status: 200, text: JSON.stringify({ id: "lexvoice", version: "1.0.0" }) };
        }
        return { status: 200, text: `repaired:${fileName}` };
      },
    });

    await fixture.service.installAvailableUpdate();
    expect(fixture.notices.some(notice => notice.message.includes("重新安装官方文件以修复本地副本"))).toBe(true);
    expect(fixture.adapter.files.get(`${BASE_PATH}/main.js`)).toBe("repaired:main.js");
    expect(fixture.settings.installedUpdateVersion).toBe("1.0.0");
    expect(fixture.saveSettings).toHaveBeenCalledTimes(2);
  });

  it("does not save installed state when write verification fails", async () => {
    const availableUpdate: AvailableUpdate = {
      version: "2.0.0",
      currentVersion: "1.0.0",
      rawBaseUrl: "https://chosen.example/plugin",
      manifestUrl: "https://chosen.example/plugin/manifest.json",
      checkedAt: new Date(NOW).toISOString(),
      files: [...UPDATE_PLUGIN_FILES],
    };
    const fixture = createFixture({
      availableUpdate,
      initialFiles: existingPluginFiles(),
    });
    const mainPath = `${BASE_PATH}/main.js`;
    const originalRead = fixture.adapter.read.bind(fixture.adapter);
    let mainReads = 0;
    vi.spyOn(fixture.adapter, "read").mockImplementation(async (path) => {
      if (path === mainPath && ++mainReads === 3) return "corrupt-after-write";
      return originalRead(path);
    });

    await expect(fixture.service.installAvailableUpdate()).rejects.toThrow("写入 main.js 后校验失败");
    expect(fixture.settings.installedUpdateVersion).toBe("");
    expect(fixture.settings.availableUpdate).toBe(availableUpdate);
    expect(fixture.saveSettings).not.toHaveBeenCalled();
    expect(fixture.adapter.files.get(`${BASE_PATH}/manifest.json`)).toBe("local:manifest.json");
  });

  it("does not save installed state or write targets when a required download fails", async () => {
    const availableUpdate: AvailableUpdate = {
      version: "2.0.0",
      currentVersion: "1.0.0",
      rawBaseUrl: "https://chosen.example/plugin",
      manifestUrl: "https://chosen.example/plugin/manifest.json",
      checkedAt: new Date(NOW).toISOString(),
      files: [...UPDATE_PLUGIN_FILES],
    };
    const fixture = createFixture({
      availableUpdate,
      initialFiles: existingPluginFiles(),
      request: async (url) => {
        const fileName = fileNameFromUrl(url);
        if (fileName === "manifest.json") {
          return { status: 200, text: JSON.stringify({ id: "lexvoice", version: "2.0.0" }) };
        }
        throw new Error("required unavailable");
      },
    });

    await expect(fixture.service.installAvailableUpdate()).rejects.toThrow("更新 main.js 失败");
    const targetWrites = fixture.events.filter(event =>
      event.startsWith(`write:${BASE_PATH}/`) && !event.includes("/.lexvoice-update-backups/"),
    );
    expect(targetWrites).toEqual([]);
    expect(fixture.settings.installedUpdateVersion).toBe("");
    expect(fixture.settings.availableUpdate).toBe(availableUpdate);
    expect(fixture.saveSettings).not.toHaveBeenCalled();
  });
});
