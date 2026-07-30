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

await mkdir(outDir, { recursive: true });
await copyStaticFiles(srcDir);