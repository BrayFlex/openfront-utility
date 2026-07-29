import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import fs from "node:fs";
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


// new dev staging

const basePath = process.env.BASE_PATH || '/openfront-utility/';

// Function to update HTML files with correct base path
function updateHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      updateHtmlFiles(fullPath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Add or update base tag
      if (content.includes('<base')) {
        content = content.replace(/<base[^>]*>/, `<base href="${basePath}">`);
      } else {
        content = content.replace('<head>', `<head>\n  <base href="${basePath}">`);
      }
      
      fs.writeFileSync(fullPath, content);
    }
  });
}

// Your copy logic here...