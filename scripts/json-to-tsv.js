import fs from "fs";
import path from "path";
import { program } from "commander";

/**
 * Converts a single JSON file to a TSV file.
 * @param {string} inputPath - The full path to the input JSON file.
 */
function convertJsonToTsv(inputPath) {
  // Read and parse the JSON file
  let jsonArray;
  try {
    const fileContent = fs.readFileSync(inputPath, "utf-8");
    jsonArray = JSON.parse(fileContent);
    if (!Array.isArray(jsonArray)) {
      throw new Error("JSON root must be an array");
    }
  } catch (err) {
    console.error(`Error reading/parsing JSON from ${inputPath}: ${err.message}`);
    return; // Skip this file and continue if in batch mode
  }

  // Metadata lines for the TSV file
  const meta = [
    "#separator:tab",
    "#html:true",
    "#tags column:10"
  ].join("\n");

  // Define the desired column order
  const columns = ["SL", "Question", "OP1", "OP2", "OP3", "OP4", "Answer", "Solution", "_blank", "Tags"];

  // Build the TSV rows from the JSON array
  const rows = jsonArray.map(obj => {
    return columns.map(col => {
      if (col === "_blank") return ""; // Handle the blank column
      if (col === "Tags") return (obj.Tags || []).join(" "); // Join tags with a space
      return String(obj[col] ?? "").replace(/\t/g, " "); // Replace tabs to prevent format issues
    }).join("\t");
  });

  // Combine metadata and rows into the final TSV content
  const tsvOutput = meta + "\n" + rows.join("\n");

  // Ensure the output directory exists
  const outDir = path.resolve(process.cwd(), "output", "tsv");
  fs.mkdirSync(outDir, { recursive: true });

  // Determine the output file name
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outFile = path.join(outDir, baseName + ".tsv");

  // Write the TSV file to disk
  fs.writeFileSync(outFile, tsvOutput, "utf-8");
  console.log(`✅ TSV saved to ${outFile}`);
}

// --- Main Program ---

program
  .option("--json-path <path>", "Path to a single JSON file to process")
  .option("--all", "Process all JSON files in output/tagged/");

program.parse(process.argv);
const options = program.opts();

if (options.all) {
  // Batch processing mode
  const sourceDir = path.resolve(process.cwd(), "output", "tagged");
  console.log(`Batch processing all .json files from ${sourceDir}`);

  try {
    const allFiles = fs.readdirSync(sourceDir);
    const jsonFiles = allFiles.filter(file => path.extname(file).toLowerCase() === '.json');

    if (jsonFiles.length === 0) {
      console.log(`No JSON files found in ${sourceDir}`);
      process.exit(0);
    }

    console.log(`Found ${jsonFiles.length} JSON files to process...`);
    jsonFiles.forEach(file => {
      const filePath = path.join(sourceDir, file);
      convertJsonToTsv(filePath);
    });
    console.log("\nBatch processing complete.");

  } catch (err) {
    console.error(`Error accessing directory ${sourceDir}: ${err.message}`);
    process.exit(1);
  }
} else if (options.jsonPath) {
  // Single file processing mode
  const inputPath = path.resolve(process.cwd(), options.jsonPath);
  convertJsonToTsv(inputPath);
} else {
  // No valid options provided
  console.error("Error: You must specify either --json-path or use the --all flag.");
  program.help(); // Display the help message
  process.exit(1);
}