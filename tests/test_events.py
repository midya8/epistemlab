import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from epistemlab.events import update
from epistemlab.event_input import parse_events
from epistemlab.event_oracle import expected_events, verify_events
from tools.event_cases import all_cases, controls


class EventTests(unittest.TestCase):
    def test_complete_finite_and_seeded_reports(self):
        rows = all_cases()
        self.assertEqual(len(rows), 648)
        counts = [0, 0, 0]
        for raw in rows:
            before = copy.deepcopy(raw)
            r = update(raw)
            self.assertEqual(r, expected_events(raw))
            self.assertEqual(before, raw)
            counts = [
                x + y
                for x, y in zip(
                    counts,
                    [
                        len(r["candidates"]),
                        len(r["relations"]),
                        len(r["before"]["table"]) + len(r["after"]["table"]),
                    ],
                )
            ]
            for p in r["candidates"]:
                if p["allowed"]:
                    self.assertEqual(
                        r["product"]["valuation"][p["id"]],
                        raw["model"]["valuation"][p["world"]],
                    )
        self.assertEqual(counts, [2552, 5984, 9208])
        print(
            "event reports648/candidates2552/relationobligations5984/beforeaftersets9208"
        )

    def test_silent_vs_observed_vs_public(self):
        silent, observed, public = [update(c["request"]) for c in controls()[:3]]
        self.assertEqual(
            [q["product"] for q in silent["comparisons"]], [True, False, False]
        )
        self.assertEqual(
            [q["product"] for q in observed["comparisons"]], [True, True, False]
        )
        self.assertEqual(
            [q["product"] for q in public["comparisons"]], [True, True, True]
        )
        self.assertEqual(
            [q["public"] for q in silent["comparisons"]], [True, True, True]
        )

    def test_nonexecutable_is_not_an_empty_model(self):
        r = update(controls()[3]["request"])
        self.assertFalse(r["point"]["executable"])
        self.assertTrue(r["product"]["worlds"])
        self.assertEqual(r["after"]["focus_status"], "not_executable")
        self.assertTrue(all(q["value"] is None for q in r["after"]["queries"]))
        self.assertTrue(r["after"]["table"])

    def test_empty_product_has_no_point(self):
        r = update(controls()[4]["request"])
        self.assertEqual(r["product"]["worlds"], [])
        self.assertEqual(r["relations"], [])
        self.assertTrue(
            all(
                t["truth"] == [] and t["obligations"] == [] for t in r["after"]["table"]
            )
        )
        self.assertTrue(all(q["product"] is None for q in r["comparisons"]))

    def test_preconditions_are_checked_before(self):
        r = update(controls()[6]["request"])
        f = r["preconditions"][0]["formula"]
        self.assertEqual(r["preconditions"][0]["truth"], ["w0"])
        self.assertEqual(
            next(t["truth"] for t in r["after"]["table"] if t["formula"] == f), []
        )
        self.assertTrue(r["point"]["executable"])

    def test_equal_preconditions_keep_event_copies(self):
        r = update(controls()[7]["request"])
        self.assertEqual(r["product"]["worlds"], ["x00", "x01"])
        self.assertEqual(r["product"]["partitions"]["a"], [["x00"], ["x01"]])
        self.assertEqual(r["product"]["partitions"]["b"], [["x00", "x01"]])

    def test_world_and_event_relations_both_required(self):
        for c in controls():
            r = update(c["request"])
            for edge in r["relations"]:
                self.assertEqual(
                    edge["related"], edge["world_related"] and edge["event_related"]
                )
        r = update(controls()[8]["request"])
        view = next(
            v
            for v in r["views"]
            if v["pair"] == r["point"]["pair"] and v["agent"] == "b"
        )
        self.assertEqual(view["events"], ["true_read"])

    def test_all_enabled_does_not_reveal_unknown_atom(self):
        r = update(controls()[5]["request"])
        self.assertEqual(
            [q["before"] for q in r["comparisons"]],
            [q["product"] for q in r["comparisons"]],
        )
        self.assertEqual(len(r["product"]["worlds"]), 6)

    def test_twelve_pair_boundary_and_s5(self):
        r = update(controls()[10]["request"])
        self.assertEqual(len(r["product"]["worlds"]), 12)
        for agent, blocks in r["product"]["partitions"].items():
            self.assertEqual(
                sorted(s for b in blocks for s in b), r["product"]["worlds"]
            )
            for row in r["relations"]:
                if row["agent"] == agent:
                    self.assertEqual(
                        row["related"],
                        any(row["source"] in b and row["target"] in b for b in blocks),
                    )

    def test_schema_bounds_and_unknown_fields(self):
        r = controls()[0]["request"]
        bad = []
        for path, value in [
            (["extra"], 1),
            (["model", "announcements"], [["true"]]),
            (["action", "actual"], "missing"),
            (["action", "extra"], True),
            (["action", "events"], ["z", "a"]),
            (["action", "partitions", "a"], [["false_read", "idle"]]),
            (["action", "preconditions", "idle"], ["K", "nobody", ["true"]]),
        ]:
            x = copy.deepcopy(r)
            d = x
            for k in path[:-1]:
                d = d[k]
            d[path[-1]] = value
            bad.append(x)
        for x in bad:
            with self.assertRaises(ValueError):
                update(x)
        x = copy.deepcopy(r)
        x["action"]["partitions"]["b"] = [["false_read"], ["idle"], ["true_read"]]
        self.assertTrue(verify_events(update(x)))

    def test_actual_event_does_not_filter_global_product(self):
        r = copy.deepcopy(controls()[0]["request"])
        a = update(r)
        r["action"]["actual"] = "false_read"
        b = update(r)
        for k in ["product", "candidates", "relations", "views", "changes"]:
            self.assertEqual(a[k], b[k])
        self.assertEqual(a["after"]["table"], b["after"]["table"])

    def test_oracle_does_not_import_generator(self):
        raw = controls()[0]["request"]
        r = update(raw)
        with patch(
            "epistemlab.events.update", side_effect=AssertionError("disabled")
        ), patch("epistemlab.core.analyze", side_effect=AssertionError("disabled")):
            self.assertEqual(expected_events(raw), r)
            self.assertTrue(verify_events(r))

    def test_every_noninput_primitive_mutation_rejected(self):
        r = update(controls()[0]["request"])
        paths = []

        def walk(x, p):
            if isinstance(x, dict):
                for k, v in x.items():
                    if p or k != "request":
                        walk(v, p + [k])
            elif isinstance(x, list):
                for i, v in enumerate(x):
                    walk(v, p + [i])
            else:
                paths.append(p)

        walk(r, [])
        for p in paths:
            x = copy.deepcopy(r)
            d = x
            for k in p[:-1]:
                d = d[k]
            v = d[p[-1]]
            d[p[-1]] = (
                not v
                if type(v) is bool
                else (
                    v + 1
                    if type(v) is int
                    else "changed" if v is None else v + " changed"
                )
            )
            self.assertFalse(verify_events(x), p)
        print("event primitive mutations rejected", len(paths))
        self.assertFalse(verify_events(dict(r, extra=True)))
        self.assertFalse(verify_events({"request": r["request"]}))

    def test_cli_stdin_atomic_and_duplicate_keys(self):
        r = controls()[0]["request"]
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "report.json"
            cmd = [
                sys.executable,
                "-m",
                "epistemlab.event_cli",
                "-",
                "--output",
                str(p),
            ]
            a = subprocess.run(cmd, input=json.dumps(r), text=True, capture_output=True)
            self.assertEqual(a.returncode, 0, a.stderr)
            data = p.read_bytes()
            self.assertTrue(verify_events(json.loads(data)))
            for payload in [
                '{"model":{},"model":{},"action":{}}',
                "NaN",
                json.dumps({"bad": True}),
            ]:
                a = subprocess.run(cmd, input=payload, text=True, capture_output=True)
                self.assertEqual(a.returncode, 2)
                self.assertEqual(p.read_bytes(), data)
            x = json.loads(data)
            x["point"]["executable"] = False
            a = subprocess.run(
                cmd + ["--verify"], input=json.dumps(x), text=True, capture_output=True
            )
            self.assertEqual(a.returncode, 2)
            self.assertEqual(p.read_bytes(), data)
            a = subprocess.run(
                [sys.executable, "-m", "epistemlab.event_cli", "-", "--verify"],
                input=data,
                capture_output=True,
            )
            self.assertEqual(a.returncode, 0, a.stderr)

    def test_three_agent_nested_group_formula(self):
        r = controls()[0]["request"]
        r = copy.deepcopy(r)
        r["model"]["partitions"]["c"] = [["w0"], ["w1"]]
        r["action"]["partitions"]["c"] = [r["action"]["events"][:]]
        r["model"]["queries"] = [
            [
                "C",
                ["a", "b", "c"],
                [
                    "or",
                    ["K", "a", ["atom", "p"]],
                    ["D", ["b", "c"], ["not", ["atom", "p"]]],
                ],
            ]
        ]
        self.assertEqual(update(r), expected_events(r))

    def test_byte_cap_and_formula_depth(self):
        r = copy.deepcopy(controls()[0]["request"])
        f = ["true"]
        for _ in range(8):
            f = ["not", f]
        r["action"]["preconditions"]["idle"] = f
        with self.assertRaises(ValueError):
            update(r)
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "keep.json"
            p.write_bytes(b"preserved")
            a = subprocess.run(
                [sys.executable, "-m", "epistemlab.event_cli", "-", "--output", str(p)],
                input=b" " * 8_000_001,
                capture_output=True,
            )
            self.assertEqual(a.returncode, 2)
            self.assertEqual(p.read_bytes(), b"preserved")
            self.assertEqual(sorted(x.name for x in Path(d).iterdir()), ["keep.json"])
