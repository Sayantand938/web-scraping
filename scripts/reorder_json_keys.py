import json
from pathlib import Path

# Desired key order
KEY_ORDER = ["noteId", "SL", "Question", "OP1", "OP2", "OP3", "OP4", "Answer", "Solution", "Tags"]

# Current folder
CURRENT_DIR = Path.cwd()

# Process each JSON file
for json_file in CURRENT_DIR.glob("*.json"):
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Reorder keys
        reordered_data = []
        for obj in data:
            reordered_obj = {k: obj[k] for k in KEY_ORDER if k in obj}
            reordered_data.append(reordered_obj)

        # Overwrite the original file
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(reordered_data, f, ensure_ascii=False, indent=2)

        print(f"[+] Reordered keys in {json_file.name}")

    except Exception as e:
        print(f"[-] Failed to process {json_file.name}: {e}")
