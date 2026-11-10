"""Run from outside the checkout against the installed wheel only."""

import json, sys, pathlib, subprocess, copy
import epistemlab

assert "site-packages" in str(epistemlab.__file__)
assert (
    pathlib.Path(sys.argv[1]).resolve().parent.parent
    not in pathlib.Path(epistemlab.__file__).resolve().parents
)
cs = json.loads(pathlib.Path(sys.argv[1]).read_text())
for i, c in enumerate(cs):
    request = pathlib.Path(f"request-{i}.json")
    request.write_text(json.dumps(c["request"]))
    reports = [
        json.loads(subprocess.check_output(cmd + ["analyze", str(request)], text=True))
        for cmd in [[sys.executable, "-m", "epistemlab"], ["epistemlab"]]
    ]
    assert reports[0] == reports[1] == epistemlab.analyze(
        c["request"]
    ) and epistemlab.verify(reports[0])
    evidence = pathlib.Path(f"evidence-{i}.json")
    evidence.write_text(json.dumps(reports[0]))
    for cmd in [[sys.executable, "-m", "epistemlab"], ["epistemlab"]]:
        p = subprocess.run(
            cmd + ["verify", str(evidence)], text=True, capture_output=True
        )
        assert p.returncode == 0 and p.stdout.strip() == "Evidence accepted"
    forged = copy.deepcopy(reports[0])
    forged["snapshots"][0]["queries"][0]["value"] = "forged"
    evidence.write_text(json.dumps(forged))
    for cmd in [[sys.executable, "-m", "epistemlab"], ["epistemlab"]]:
        p = subprocess.run(
            cmd + ["verify", str(evidence)], text=True, capture_output=True
        )
        assert p.returncode == 2 and "Evidence rejected" in p.stderr
print(
    "Installed wheel outside checkout: eight controls, module/console parity, independent verification, forged-evidence rejection"
)
