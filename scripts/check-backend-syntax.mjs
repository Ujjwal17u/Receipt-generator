import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function walk(dir, list = []) {
  for (const f of readdirSync(dir)) {
    const full = path.join(dir, f);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, list);
    else if (f.endsWith(".js") && !f.includes("node_modules")) list.push(full);
  }
  return list;
}

const folders = [path.join(ROOT, "backend"), path.join(ROOT, "api")];
const files = folders.flatMap((d) => walk(d).filter((f) => !f.includes("node_modules")));

let failed = 0;
for (const f of files) {
  try {
    execSync(`node --check "${f}"`, { stdio: "pipe", cwd: ROOT });
    console.log("✅", path.relative(ROOT, f));
  } catch (e) {
    failed++;
    console.error("❌", path.relative(ROOT, f));
    console.error(
      "   ",
      (e.stderr || e.stdout || "").toString().split("\n").slice(0, 6).join("\n    "),
    );
  }
}

console.log(`\n${files.length} files checked — ${files.length - failed} OK, ${failed} FAILED`);
process.exitCode = failed > 0 ? 1 : 0;
