"""Check installed event modules, two entrypoints, and atomic failed verification."""

import copy
import importlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

expected = json.load(open(sys.argv[1]))
origins = []
for name in [
    "epistemlab",
    "epistemlab.model",
    "epistemlab.core",
    "epistemlab.oracle",
    "epistemlab.__main__",
    "epistemlab.disclosures",
    "epistemlab.disclosure_oracle",
    "epistemlab.event_input",
    "epistemlab.events",
    "epistemlab.event_oracle",
    "epistemlab.event_cli",
]:
    p = Path(importlib.import_module(name).__file__).resolve()
    assert "site-packages" in p.parts
    assert Path(__file__).resolve().parents[1] not in p.parents
    origins.append(str(p))
from epistemlab.events import update
from epistemlab.event_oracle import verify_events

entry = [str(Path(sys.executable).with_name("epistemlab-events"))]
with tempfile.TemporaryDirectory() as d:
    for e in expected:
        assert update(e["request"]) == e["report"] and verify_events(e["report"])
    for command in [entry, [sys.executable, "-m", "epistemlab.event_cli"]]:
        for e in expected:
            p = subprocess.run(
                command + ["-"],
                input=json.dumps(e["request"]),
                text=True,
                capture_output=True,
                cwd=d,
            )
            assert p.returncode == 0, p.stderr
            assert json.loads(p.stdout) == e["report"]
            p = subprocess.run(
                command + ["-", "--verify"],
                input=json.dumps(e["report"]),
                text=True,
                capture_output=True,
                cwd=d,
            )
            assert (
                p.returncode == 0 and p.stdout.strip() == "Event evidence accepted"
            ), p.stderr
    for i in range(24):
        r = copy.deepcopy(expected[i % len(expected)]["report"])
        k = i % 7
        if k == 0:
            r["preconditions"][0]["truth"] = ["forged"]
        elif k == 1:
            r["candidates"][0]["allowed"] = not r["candidates"][0]["allowed"]
        elif k == 2:
            r["point"]["executable"] = not r["point"]["executable"]
        elif k == 3:
            r["product"]["valuation"]["forged"] = []
        elif k == 4:
            r["before"]["table"][0]["truth"] = ["forged"]
        elif k == 5:
            r["after"]["queries"][0]["value"] = "forged"
        else:
            r["public_counterfactual"]["update"]["removed"] = ["forged"]
        assert not verify_events(r)
        dest = Path(d) / "preserve.json"
        dest.write_bytes(b"existing output\n")
        command = (
            entry if i % 2 == 0 else [sys.executable, "-m", "epistemlab.event_cli"]
        )
        p = subprocess.run(
            command + ["-", "--verify", "--output", str(dest)],
            input=json.dumps(r),
            text=True,
            capture_output=True,
            cwd=d,
        )
        assert p.returncode == 2 and p.stdout == "" and "Traceback" not in p.stderr
        assert dest.read_bytes() == b"existing output\n"
        assert sorted(x.name for x in Path(d).iterdir()) == ["preserve.json"]
print(
    json.dumps(
        dict(
            event_reports=len(expected),
            entrypoints=2,
            installed_origins=origins,
            forged_cli_atomic_preservation=24,
            direct_checker_forgeries=24,
        )
    )
)
