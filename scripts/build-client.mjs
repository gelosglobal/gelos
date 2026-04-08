/**
 * Bundles the React app with esbuild (no Vite). Writes dist/index.html + dist/assets/*
 */
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const watch = process.argv.includes("--watch");

process.chdir(root);

fs.mkdirSync(path.join(root, "dist", "assets"), { recursive: true });

const define = {
  "import.meta.env.VITE_AUTH_URL": JSON.stringify(process.env.VITE_AUTH_URL ?? ""),
};

function writeIndexHtml() {
  const cssPath = path.join(root, "dist", "assets", "app.css");
  const hasCss = fs.existsSync(cssPath);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gelos OS</title>
    ${hasCss ? '<link rel="stylesheet" href="/assets/app.css" />' : ""}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(root, "dist", "index.html"), html, "utf8");
}

const pluginWriteHtml = {
  name: "write-html",
  setup(build) {
    build.onEnd(() => {
      try {
        writeIndexHtml();
      } catch (e) {
        console.error(e);
      }
    });
  },
};

const prod = process.env.NODE_ENV === "production";

const buildOptions = {
  absWorkingDir: root,
  entryPoints: ["src/main.tsx"],
  bundle: true,
  outfile: "dist/assets/app.js",
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: true,
  minify: prod,
  loader: { ".tsx": "tsx", ".ts": "ts", ".css": "css" },
  define,
  logLevel: "info",
  plugins: [pluginWriteHtml],
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    return;
  }
  await esbuild.build(buildOptions);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
