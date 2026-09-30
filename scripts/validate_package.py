"""Validate the preserved handoff, not installed application dependencies."""
from pathlib import Path
import subprocess
import sys

package = Path(__file__).resolve().parents[1] / "handoff"
raise SystemExit(subprocess.run(
    [sys.executable, str(package / "scripts" / "validate_package.py")],
    cwd=package,
    check=False,
).returncode)
