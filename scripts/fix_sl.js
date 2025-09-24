import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// __dirname replacement for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Relative path to tagged JSON folder
const inputDir = path.resolve(__dirname, "../output/tagged");

// Desired key order
const KEY_ORDER = ["noteId", "SL", "Question", "OP1", "OP2", "OP3", "OP4", "Answer", "Solution", "Tags"];

function processFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    if (!Array.isArray(data)) {
      console.warn(`Skipping ${filePath} (not an array)`);
      return;
    }

    // Update SL, noteId and reorder keys exactly
    const updated = data.map((item, index) => {
      const slValue = index + 1;
      const reordered = {};

      KEY_ORDER.forEach((key) => {
        if (key === "SL") {
          reordered.SL = String(slValue);
        } else if (key === "noteId") {
          reordered.noteId = 1000 + slValue;
        } else if (key in item) {
          reordered[key] = item[key];
        }
      });

      return reordered;
    });

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
    console.log(`Processed: ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
  }
}

function main() {
  const files = fs.readdirSync(inputDir);

  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const filePath = path.join(inputDir, file);
      processFile(filePath);
    }
  });

  console.log("All JSON files processed: SL & noteId updated, keys reordered.");
}

main();
