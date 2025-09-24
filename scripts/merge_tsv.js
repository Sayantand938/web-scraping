import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = path.join(__dirname, '../output/tsv');
const outputFile = path.join(inputDir, 'merged.tsv');

const files = await fs.promises.readdir(inputDir);
const tsvFiles = files.filter(f => f.endsWith('.tsv'));

let mergedData = '';

for (let i = 0; i < tsvFiles.length; i++) {
  const filePath = path.join(inputDir, tsvFiles[i]);
  let data = await fs.promises.readFile(filePath, 'utf8');
  const lines = data.split('\n');

  // Keep top 3 lines only for the first file
  if (i === 0) {
    mergedData += lines.join('\n') + '\n';
  } else {
    mergedData += lines.slice(3).join('\n') + '\n';
  }
}

await fs.promises.writeFile(outputFile, mergedData.trim());
console.log(`Merged ${tsvFiles.length} files into merged.tsv with single header`);
