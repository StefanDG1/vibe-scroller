"""Inspect a decrypted staging archive without displaying user content or credentials."""
import json
import sys
import zipfile

try:
    tables = 0
    records = 0
    with zipfile.ZipFile(sys.argv[1]) as archive:
        if sum(item.file_size for item in archive.infolist()) > 200_000_000:
            raise ValueError("Archive bound")
        for item in archive.infolist():
            if not item.filename.endswith("documents.jsonl"):
                continue
            if "_tables" in item.filename.split("/"):
                continue
            tables += 1
            with archive.open(item) as stream:
                for raw in stream:
                    if len(raw) > 2_000_000:
                        raise ValueError("Document bound")
                    if not raw.strip():
                        continue
                    row = json.loads(raw)
                    if not isinstance(row, dict) or not isinstance(row.get("_id"), str):
                        raise ValueError("Invalid document")
                    records += 1
    if tables == 0 or records == 0:
        raise ValueError("Empty export")
    print(json.dumps({"tables": tables, "records": records, "jsonDocumentsValid": True}))
except Exception:
    print(json.dumps({"jsonDocumentsValid": False}))
    sys.exit(1)
