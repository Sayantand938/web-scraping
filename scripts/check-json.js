import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const folder = process.cwd(); // current folder
const files = fs.readdirSync(folder).filter(f => f.endsWith(".json"));

if (files.length === 0) {
  console.log("No JSON files found in current folder.");
  process.exit(0);
}

for (const file of files) {
  const fullPath = path.join(folder, file);
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    JSON.parse(content);
    console.log(`✅ ${file} is valid JSON`);
  } catch (err) {
    console.log(`❌ ${file} is INVALID JSON`);
    console.error(`   Error: ${err.message}`);
  }
}
