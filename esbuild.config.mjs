import esbuild from "esbuild";
import { readFileSync } from "fs";
import path from "path";

const production = process.argv[2] === "production";
// 构建时把当前 manifest 版本号注入 main.js（LEXVOICE_BUILD_VERSION），供运行时自检「版本错位」：
// 若它与磁盘 manifest.json 的版本不一致，说明上次更新只换了 manifest、没换 main.js。
const buildVersion = JSON.parse(readFileSync("./manifest.json", "utf8")).version || "0.0.0";

// 强制 require("ws") 解析到它的 Node 实现（node_modules/ws/index.js），绕开 ws 的 "browser" 字段
// ——那个 browser 入口是个只会抛 "ws does not work in the browser" 的 stub。
// Obsidian 跑在 Electron 渲染进程（有 Node），能用 ws 设置 Authorization 请求头；浏览器原生 WebSocket 设不了头，
// dashscope 等流式 ASR 握手阶段校验鉴权头，缺了必 401/403。
const wsForceNodePlugin = {
  name: "ws-force-node",
  setup(build) {
    build.onResolve({ filter: /^ws$/ }, () => ({ path: path.resolve("node_modules/ws/index.js") }));
  },
};

const context = await esbuild.context({
  entryPoints: ["./src/main.ts"],
  bundle: true,
  // ws 打包进来（见上）；ws 依赖的 Node 内置模块 + 可选原生模块列 external，由 Electron 运行时提供 / 忽略。
  external: ["obsidian", "electron", "http", "https", "net", "tls", "crypto", "stream", "zlib", "events", "url", "util", "buffer", "bufferutil", "utf-8-validate"],
  plugins: [wsForceNodePlugin],
  format: "cjs",
  target: "es2018",
  define: {
    LEXVOICE_BUILD_VERSION: JSON.stringify(buildVersion),
  },
  charset: "utf8",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  minify: production,
  treeShaking: true,
  banner: {
    js: "/* LexVoice generated bundle. Edit src/main.ts, then run npm run build. */",
  },
  outfile: "main.js",
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
  console.log("Watching LexVoice source files...");
}
