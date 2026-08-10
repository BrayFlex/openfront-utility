import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(rootDir, "src");
const outDir = path.join(rootDir, "docs");

const shouldCopy = (fileName) => !fileName.endsWith(".ts");

const copyStaticFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await copyStaticFiles(entryPath);
      continue;
    }
    if (!shouldCopy(entry.name)) {
      continue;
    }
    const relPath = path.relative(srcDir, entryPath);
    const destPath = path.join(outDir, relPath);
    await mkdir(path.dirname(destPath), { recursive: true });
    await cp(entryPath, destPath);
  }
};

// Copy noUiSlider assets
const nouisliderDir = path.join(rootDir, "node_modules", "nouislider", "dist");
const nouisliderOutDir = path.join(outDir, "nouislider");
await mkdir(nouisliderOutDir, { recursive: true });
await cp(path.join(nouisliderDir, "nouislider.min.css"), path.join(nouisliderOutDir, "nouislider.min.css"));
await cp(path.join(nouisliderDir, "nouislider.min.mjs"), path.join(nouisliderOutDir, "nouislider.min.mjs"));

await mkdir(outDir, { recursive: true });
await copyStaticFiles(srcDir);