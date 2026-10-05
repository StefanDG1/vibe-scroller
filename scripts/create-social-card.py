"""Compatibility entry point for the shared SVG-based brand asset generator."""
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent.parent
subprocess.run(["node", str(root / "scripts/generate-brand-assets.mjs")], check=True)
