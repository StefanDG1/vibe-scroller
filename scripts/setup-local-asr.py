"""Download a fixed Whisper distribution at a recorded immutable revision."""
import hashlib
import json
from pathlib import Path
import sys
from huggingface_hub import HfApi, snapshot_download

repository = "Systran/faster-whisper-small.en"
destination = Path(sys.argv[1]).resolve()
if destination.exists() and (destination / "vibescroller-model.json").exists():
    raise SystemExit("An existing model manifest must be reviewed before replacement.")
revision = HfApi(token=False).model_info(repository).sha
assert len(revision) == 40 and all(c in "0123456789abcdef" for c in revision)
allowed = ["model.bin", "config.json", "tokenizer.json", "vocabulary.json", "vocabulary.txt", "preprocessor_config.json"]
snapshot_download(repository, revision=revision, allow_patterns=allowed, local_dir=destination, token=False)
files = {}
for name in allowed:
    path = destination / name
    if path.is_file():
        with path.open("rb") as content:
            files[name] = hashlib.file_digest(content, "sha256").hexdigest()
assert {"model.bin", "config.json", "tokenizer.json"}.issubset(files)
manifest = {"repository": repository, "revision": revision, "files": files}
with (destination / "vibescroller-model.json").open("x", encoding="utf-8") as output:
    json.dump(manifest, output, indent=2)
print(json.dumps({"downloaded": True, "repository": repository, "revision": revision, "fileCount": len(files)}))
