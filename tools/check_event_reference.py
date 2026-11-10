"""Optional actual CTL reference for reconstructed S5 products; no fairness API."""

import json
from importlib.metadata import version
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pyModelChecking import Kripke
import pyModelChecking.CTL as C
from epistemlab.events import update
from tools.event_cases import all_cases

counts = dict(requests=0, snapshots=0, subformula_sets=0, ctl_calls=0, product_pairs=0)


def tables(states, valuation, relation, rows):
    memo = {}

    def val(f):
        k = json.dumps(f)
        if k in memo:
            return memo[k]
        op = f[0]
        if op in ["true", "false", "atom"]:
            result = {
                s
                for s in states
                if op == "true" or (op == "atom" and f[1] in valuation[s])
            }
        else:
            if op == "not":
                left = val(f[1])
                right = set()
                formula = C.Not("left")
                edges = [(s, s) for s in states]
            elif op in ["and", "or"]:
                left, right = val(f[1]), val(f[2])
                formula = (C.And if op == "and" else C.Or)("left", "right")
                edges = [(s, s) for s in states]
            else:
                left = val(f[2])
                right = set()
                group = [f[1]] if op == "K" else f[1]
                edges = [
                    (s, t)
                    for s in states
                    for t in states
                    if (all if op == "D" else any)(relation(a, s, t) for a in group)
                ]
                formula = (C.AG if op == "C" else C.AX)("left")
            if states:
                graph = Kripke(
                    S=states,
                    R=edges,
                    L={
                        s: ({"left"} if s in left else set())
                        | ({"right"} if s in right else set())
                        for s in states
                    },
                )
                result = set(C.modelcheck(graph, formula))
                counts["ctl_calls"] += 1
            else:
                result = set()
        memo[k] = result
        return result

    for row in rows:
        assert val(row["formula"]) == set(row["truth"]), row["formula"]
        counts["subformula_sets"] += 1
    counts["snapshots"] += 1
    return val


for request in all_cases():
    r = update(request)
    m, a = request["model"], request["action"]
    ws, es = m["worlds"], a["events"]
    base_rel = lambda agent, s, t: any(
        s in b and t in b for b in m["partitions"][agent]
    )
    before = tables(ws, m["valuation"], base_rel, r["before"]["table"])
    pairs = {
        f"x{i*len(es)+j:02}": (w, e)
        for i, w in enumerate(ws)
        for j, e in enumerate(es)
        if w in before(a["preconditions"][e])
    }
    assert sorted(pairs) == r["product"]["worlds"]

    def rel(agent, s, t):
        w, e = pairs[s]
        v, f = pairs[t]
        return base_rel(agent, w, v) and any(
            e in b and f in b for b in a["partitions"][agent]
        )

    vals = {p: m["valuation"][w] for p, (w, e) in pairs.items()}
    tables(sorted(pairs), vals, rel, r["after"]["table"])
    public = sorted(before(a["preconditions"][a["actual"]]))
    tables(
        public,
        m["valuation"],
        base_rel,
        r["public_counterfactual"]["snapshot"]["table"],
    )
    counts["requests"] += 1
    counts["product_pairs"] += len(pairs)
print(
    json.dumps(
        dict(package="pyModelChecking", version=version("pyModelChecking"), **counts)
    )
)
