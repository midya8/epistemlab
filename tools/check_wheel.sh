#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
python - "$root" "$tmp/event-expected.json" <<'PYCODE'
import json,sys
from pathlib import Path
sys.path.insert(0,sys.argv[1])
from epistemlab.events import update
from epistemlab.event_oracle import verify_events
cs=json.loads((Path(sys.argv[1])/'docs/event-controls.json').read_text())
rows=[dict(request=c['request'],report=update(c['request']))for c in cs]
assert all(verify_events(r['report'])for r in rows)
Path(sys.argv[2]).write_text(json.dumps(rows))
PYCODE
python -m pip wheel --no-deps "$root" -w "$tmp/dist"
python -m venv "$tmp/venv"
"$tmp/venv/bin/python" -m pip install --no-deps "$tmp"/dist/*.whl
export PATH="$tmp/venv/bin:$PATH"
cd "$tmp"
python "$root/tools/verify_installed.py" "$root/docs/controls.json" "$root/docs/disclosure-controls.json"

python "$root/tools/verify_event_installed.py" "$tmp/event-expected.json"
