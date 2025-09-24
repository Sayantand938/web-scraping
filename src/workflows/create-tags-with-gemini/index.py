import json
import re
import signal
import sys
from pathlib import Path
import typer
from google import genai
from rich.console import Console

# ---------------- Global Configurations ----------------
PROJECT_ROOT = Path.cwd()
SCRAPED_FOLDER = PROJECT_ROOT / "output" / "scraped"
TAGGED_FOLDER = PROJECT_ROOT / "output" / "tagged"
MODEL_NAME = "gemini-2.5-flash"

DEFAULT_INSTRUCTION = Path(r"D:\Coding\anki-cli-2\instructions\tagging_instruction.md")
DEFAULT_TAGS = Path(r"D:\Coding\anki-cli-2\instructions\tags.json")
GEMINI_API_KEY = "AIzaSyCRiMtrVzgWhw-0IbTgFDWjhASK1jFByFw"

SUBJECT_TAGS = ["ENG", "MATH", "GI", "GK", "COMPUTER"]

app = typer.Typer()
console = Console()

# Global flag for graceful shutdown
shutdown_requested = False

def signal_handler(sig, frame):
    """Handle interrupt signals gracefully."""
    global shutdown_requested
    shutdown_requested = True
    console.print("\n[!] Interrupt received. Finishing current operation and exiting...", style="bold red")

# Set up signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def check_shutdown():
    """Check if shutdown was requested and exit if so."""
    if shutdown_requested:
        console.print("[!] Operation interrupted. Exiting gracefully.", style="bold red")
        sys.exit(0)

# ---------------- Helper Function ----------------
def process_json_file(file_path: Path, md_content: str, tagList_content: str):
    """Process a single JSON file with AI and update tags."""
    check_shutdown()  # Check before starting
    
    console.print(f"[*] Processing file: [bold cyan]{file_path.name}[/bold cyan]")

    try:
        # Load original JSON
        check_shutdown()
        with open(file_path, 'r', encoding='utf-8') as f:
            json_data = json.load(f)

        # Store Solution fields to restore later
        solution_lookup = {obj.get("noteId"): obj.get("Solution") for obj in json_data}

        # Remove 'Solution' for AI processing
        def remove_solution_field(data):
            if isinstance(data, dict):
                data.pop('Solution', None)
                for v in data.values():
                    remove_solution_field(v)
            elif isinstance(data, list):
                for item in data:
                    remove_solution_field(item)

        remove_solution_field(json_data)
        json_content = json.dumps(json_data, ensure_ascii=False)

        # Prepare prompt
        prompt = f"""
Path: {DEFAULT_INSTRUCTION}
<file_content>
{md_content}
</file_content>

Path: {DEFAULT_TAGS}
<file_content>
{tagList_content}
</file_content>

Path: {file_path}
<file_content>
{json_content}
</file_content>
"""

        check_shutdown()  # Check before API call
        console.print("[*] Calling AI API... (This may take a moment)")
        
        # Call Gemini AI
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        
        check_shutdown()  # Check after API call

        # Clean AI response
        clean_text = re.sub(r'```(?:json|markdown)?\n?|```', '', response.text or '').strip()

        # Parse AI JSON response
        try:
            ai_response = json.loads(clean_text)
        except json.JSONDecodeError:
            console.print(f"[-] Failed to parse AI response for [red]{file_path.name}[/red], skipping...")
            return

        check_shutdown()  # Check before processing

        # Build lookup: noteId -> newTag
        ai_lookup = {item["noteId"]: item["newTag"] for item in ai_response}

        # Track updated noteIds
        updated_notes = []

        # Process each object
        for obj in json_data:
            check_shutdown()  # Check during processing
            
            note_id = obj.get("noteId")
            original_tags = obj.get("Tags", [])

            if note_id in ai_lookup:
                new_tag = ai_lookup[note_id]
                subj_tag, topic_tag = new_tag.split("::", 1)

                if subj_tag in original_tags:
                    # Normal case: upgrade to SUBJCT::TOPIC
                    obj["Tags"] = [new_tag if tag == subj_tag else tag for tag in original_tags]
                else:
                    # Subject mismatch: downgrade to SUBJCT::Untagged
                    obj["Tags"] = [f"{tag}::Untagged" if tag in SUBJECT_TAGS else tag for tag in original_tags]

                updated_notes.append(note_id)

            else:
                # Missing AI noteId: downgrade all SUBJECT_TAGS to ::Untagged
                obj["Tags"] = [f"{tag}::Untagged" if tag in SUBJECT_TAGS else tag for tag in original_tags]
                updated_notes.append(note_id)

            # Restore Solution field
            if note_id in solution_lookup:
                obj["Solution"] = solution_lookup[note_id]

        check_shutdown()  # Check before saving

        # Reorder keys for final JSON
        final_json_data = []
        key_order = ["noteId", "SL", "Question", "OP1", "OP2", "OP3", "OP4", "Answer", "Solution", "Tags"]

        for obj in json_data:
            reordered_obj = {k: obj[k] for k in key_order if k in obj}
            final_json_data.append(reordered_obj)

        # Save updated JSON
        TAGGED_FOLDER.mkdir(parents=True, exist_ok=True)
        output_file = TAGGED_FOLDER / file_path.name
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(final_json_data, f, ensure_ascii=False, indent=2)

        console.print(f"[+] Saved updated JSON to [green]{output_file}[/green]")
        if updated_notes:
            console.print(f"[i] Updated noteIds: [yellow]{updated_notes}[/yellow]")
        else:
            console.print(f"[i] No noteIds updated in this file.")

    except Exception as e:
        if not shutdown_requested:  # Don't show error if we're shutting down
            console.print(f"[-] Error processing {file_path.name}: {str(e)}", style="red")

# ---------------- Main Command ----------------
@app.command()
def process(
    file: Path = typer.Option(None, "--file", help="Single JSON file path"),
    all: bool = typer.Option(False, "--all", help="Process all JSONs in scraped folder")
):
    """Process JSON files with AI tagging."""
    try:
        console.print("[*] Loading instruction and tag files...", style="cyan")
        check_shutdown()
        
        # Load instruction and tag files once
        with open(DEFAULT_INSTRUCTION, 'r', encoding='utf-8') as f:
            md_content = f.read()
        with open(DEFAULT_TAGS, 'r', encoding='utf-8') as f:
            tagList_content = json.dumps(json.load(f), ensure_ascii=False)

        if file:
            console.print(f"[*] Single-file mode selected: [bold cyan]{file.name}[/bold cyan]")
            process_json_file(file, md_content, tagList_content)
        elif all:
            console.print("[*] Batch mode selected. Scanning for unprocessed files...", style="cyan")
            check_shutdown()
            
            scraped_files = list(SCRAPED_FOLDER.glob("*.json"))
            tagged_files = {f.name for f in TAGGED_FOLDER.glob("*.json")}
            files_to_process = [f for f in scraped_files if f.name not in tagged_files]

            if not files_to_process:
                console.print("[i] All files in scraped folder are already processed.", style="yellow")
                return

            console.print(f"[i] {len(files_to_process)} files to process.", style="cyan")
            for i, fpath in enumerate(files_to_process, 1):
                check_shutdown()
                console.print(f"[*] Processing file {i}/{len(files_to_process)}")
                process_json_file(fpath, md_content, tagList_content)
        else:
            console.print("[-] Please provide --file <path> or --all", style="red")
            raise typer.Exit(code=1)

        console.print("[+] All operations completed successfully!", style="green")

    except KeyboardInterrupt:
        # This catches any KeyboardInterrupt that wasn't handled by signal handler
        console.print("\n[!] Operation interrupted by user. Exiting.", style="bold red")
        sys.exit(0)
    except Exception as e:
        if not shutdown_requested:
            console.print(f"[-] Unexpected error: {str(e)}", style="red")
            sys.exit(1)

# ---------------- Entry Point ----------------
if __name__ == "__main__":
    app()