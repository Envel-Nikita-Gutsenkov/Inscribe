// Node.js script to check for files longer than 400 lines
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const MAX_LINES = 400;

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!["node_modules", ".next", ".git", "dist", "data"].includes(file)) {
        walkDir(filePath, callback);
      }
    } else {
      if (filePath.endsWith(".ts") || filePath.endsWith(".tsx") || filePath.endsWith(".js") || filePath.endsWith(".jsx")) {
        callback(filePath);
      }
    }
  }
}

let warningsCount = 0;

walkDir(path.join(rootDir, "src"), (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").length;
  if (lines > MAX_LINES) {
    const relativePath = path.relative(rootDir, filePath);
    console.warn(`\x1b[33m[WARN] Spaghetti Code Alert: ${relativePath} is ${lines} lines long (Max recommended is ${MAX_LINES}). Consider refactoring.\x1b[0m`);
    warningsCount++;
  }
});

if (warningsCount === 0) {
  console.log(`\x1b[32m[SUCCESS] All files are well-sized (under ${MAX_LINES} lines).\x1b[0m`);
} else {
  console.log(`\n\x1b[33mFound ${warningsCount} files exceeding ${MAX_LINES} lines. Please keep files small!\x1b[0m`);
}
// Exit with 0 so it's non-blocking
process.exit(0);
