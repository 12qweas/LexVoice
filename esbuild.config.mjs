import esbuild from "esbuild";
import { readFileSync } from "fs";

const production = process.argv[2] === "production";
// 构建时把当前 manifest 版本号注入 main.js（LEXVOICE_BUILD_VERSION），供运行时自检「版本错位」：
// 若它与磁盘 manifest.json 的版本不一致，说明上次更新只换了 manifest、没换 main.js。
const buildVersion = JSON.parse(readFileSync("./manifest.json", "utf8")).version || "0.0.0";

const context = await esbuild.context({
  entryPoints: ["./src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "ws"],
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
