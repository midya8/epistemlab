import unittest, json, copy, itertools, random
from pathlib import Path
from epistemlab import analyze, verify
from epistemlab.oracle import expected


def partitions(items):
    if not items:
        yield []
        return
    x = items[0]
    for p in partitions(items[1:]):
        yield sorted([[x]] + p)
        for i in range(len(p)):
            q = copy.deepcopy(p)
            q[i] = sorted([x] + q[i])
            yield sorted(q)


def req(ws, ps, vals, queries, ann=()):
    return dict(
        worlds=ws,
        atoms=["p"],
        valuation={w: ["p"] if vals >> i & 1 else [] for i, w in enumerate(ws)},
        partitions=dict(zip(["a", "b"], ps)),
        focus=ws[0],
        queries=queries,
        announcements=list(ann),
    )


p = ["atom", "p"]
group = ["a", "b"]


class Tests(unittest.TestCase):
    def test_eight_controls(self):
        cs = json.loads(Path("docs/controls.json").read_text())
        self.assertEqual(len(cs), 8)
        for c in cs:
            a = analyze(c["request"])
            self.assertTrue(verify(a), c["id"])
            for s in a["snapshots"]:
                for row in s["table"]:
                    for ob in row["obligations"]:
                        self.assertEqual(len(ob["paths"]), len(ob["possible"]))
                        for path in ob["paths"]:
                            self.assertEqual(path["worlds"][0], ob["world"])
                            self.assertEqual(
                                len(path["agents"]), len(path["worlds"]) - 1
                            )
                            for u, v, labels in zip(
                                path["worlds"], path["worlds"][1:], path["agents"]
                            ):
                                for agent in labels:
                                    self.assertTrue(
                                        any(
                                            u in b and v in b
                                            for b in s["partitions"][agent]
                                        )
                                    )
                        if ob["failure"]:
                            self.assertNotIn(
                                ob["failure"]["worlds"][-1],
                                next(
                                    r["truth"]
                                    for r in s["table"]
                                    if r["formula"] == row["formula"][2]
                                ),
                            )
        m = analyze(cs[0]["request"])
        self.assertEqual(m["updates"][0]["lost_truth"], ["w0"])
        self.assertEqual(
            [q["value"] for q in m["snapshots"][1]["queries"]], [False, True, True]
        )
        self.assertEqual(
            [q["value"] for q in analyze(cs[1]["request"])["snapshots"][0]["queries"]],
            [True, False, False],
        )
        self.assertEqual(
            [q["value"] for q in analyze(cs[2]["request"])["snapshots"][0]["queries"]],
            [True, False, False, False],
        )
        self.assertEqual(
            [len(s["worlds"]) for s in analyze(cs[7]["request"])["snapshots"]],
            [8, 7, 4, 1],
        )

    def test_every_three_world_two_agent_model(self):
        ws = ["w0", "w1", "w2"]
        ps = list(partitions(ws))
        self.assertEqual(len(ps), 5)
        qs = [
            ["K", "a", p],
            ["E", group, p],
            ["D", group, p],
            ["C", group, p],
            ["E", group, ["E", group, p]],
            ["not", ["C", group, p]],
        ]
        count = 0
        for a, b in itertools.product(ps, repeat=2):
            for vals in range(8):
                r = req(ws, [a, b], vals, qs, [p])
                out = analyze(r)
                self.assertTrue(verify(out))
                count += 1
                s = out["snapshots"][0]
                common = next(
                    row["truth"]
                    for row in s["table"]
                    if row["formula"] == ["C", group, p]
                )
                # Independent brute enumeration of all simple alternating-agent reachability walks.
                adj = {
                    w: {
                        v
                        for blocks in [a, b]
                        for block in blocks
                        if w in block
                        for v in block
                    }
                    for w in ws
                }
                for w in ws:
                    paths = [[w]]
                    for length in range(2):
                        paths += [
                            path + [v]
                            for path in list(paths)
                            if len(path) == length + 1
                            for v in adj[path[-1]]
                            if v not in path
                        ]
                    reach = {path[-1] for path in paths}
                    truth = {w for i, w in enumerate(ws) if vals >> i & 1}
                    self.assertEqual(w in common, reach <= truth)
        self.assertEqual(count, 200)

    def test_s5_and_group_laws(self):
        ws = ["w0", "w1", "w2"]
        ps = list(partitions(ws))
        qs = [
            ["K", "a", p],
            ["K", "a", ["K", "a", p]],
            ["not", ["K", "a", p]],
            ["K", "a", ["not", ["K", "a", p]]],
            ["D", group, p],
            ["C", group, p],
        ]
        for a, b in itertools.product(ps, repeat=2):
            for vals in range(8):
                out = analyze(req(ws, [a, b], vals, qs))
                s = out["snapshots"][0]
                sets = [
                    set(next(row["truth"] for row in s["table"] if row["formula"] == f))
                    for f in qs
                ]
                self.assertEqual(sets[0], sets[1])
                self.assertEqual(sets[2], sets[3])
                self.assertTrue(sets[0] <= sets[4])
                self.assertTrue(sets[5] <= sets[0])

    def test_seeded_nested_formulas_updates(self):
        rng = random.Random(1603)

        def f(depth):
            if not depth:
                return rng.choice([p, ["true"], ["false"]])
            op = rng.choice(["not", "and", "or", "K", "E", "D", "C"])
            if op == "not":
                return [op, f(depth - 1)]
            if op in ["and", "or"]:
                return [op, f(depth - 1), f(depth - 1)]
            return [
                op,
                rng.choice(["a", "b"])
                if op == "K"
                else rng.choice([["a"], ["b"], group]),
                f(depth - 1),
            ]

        for i in range(120):
            n = rng.randrange(1, 7)
            ws = ["w" + str(j) for j in range(n)]

            def partition():
                bins = {}
                for w in ws:
                    bins.setdefault(rng.randrange(n), []).append(w)
                return sorted(bins.values())

            r = req(
                ws,
                [partition(), partition()],
                rng.randrange(1 << n),
                [f(3), f(2)],
                [f(2), f(2)],
            )
            self.assertTrue(verify(analyze(r)), i)

    def test_empty_update_focus_not_false(self):
        r = req(["w0"], [[["w0"]], [["w0"]]], 1, [p, ["K", "a", p]], [["false"], p])
        a = analyze(r)
        self.assertTrue(verify(a))
        self.assertEqual([len(s["worlds"]) for s in a["snapshots"]], [1, 0, 0])
        self.assertTrue(all(q["value"] is None for q in a["snapshots"][1]["queries"]))

    def test_strict_forgery(self):
        r = json.loads(Path("docs/example.json").read_text())
        a = analyze(r)
        for mutate in [
            lambda a: a.update(extra=1),
            lambda a: a.update(subformula_count=True),
            lambda a: a["updates"][0].update(lost_truth=[]),
            lambda a: a["snapshots"][0]["table"].pop(),
            lambda a: a["snapshots"][0]["queries"][0].update(value=1),
            lambda a: a["snapshots"][1].update(focus_status="eliminated"),
        ]:
            b = copy.deepcopy(a)
            mutate(b)
            self.assertFalse(verify(b))
        for mutate in [
            lambda r: r.update(extra=1),
            lambda r: r.update(worlds=[]),
            lambda r: r["partitions"].update(a=[["w0"], ["w0", "w1"]]),
            lambda r: r.update(queries=[["C", [], p]]),
            lambda r: r.update(queries=[["atom", "unknown"]]),
            lambda r: r.update(focus="unknown"),
            lambda r: r.update(announcements=[p] * 5),
            lambda r: r.update(queries=[["K", "x", p]]),
        ]:
            b = copy.deepcopy(r)
            mutate(b)
            with self.assertRaises(ValueError):
                analyze(b)

    def test_disabled_generator(self):
        import epistemlab.core

        r = analyze(json.loads(Path("docs/example.json").read_text()))
        old = epistemlab.core.analyze
        epistemlab.core.analyze = lambda _: (_ for _ in ()).throw(
            AssertionError("called")
        )
        try:
            self.assertTrue(verify(r))
        finally:
            epistemlab.core.analyze = old


if __name__ == "__main__":
    unittest.main()
