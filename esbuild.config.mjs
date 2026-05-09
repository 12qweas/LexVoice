import esbuild from "esbuild";

const production = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["./src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "ws"],
  format: "cjs",
  target: "es2018",
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
