"""Independent relation intersection and row-equivalence reconstruction.

Uses the existing separate truth-set/Floyd modal oracle, not the generator.
"""

import json
from copy import deepcopy
from .event_input import parse_events
from .oracle import expected


def expected_events(request):
    ws, atoms, agents, es, roots = parse_events(request)
    m, a = request["model"], request["action"]
    first = expected(dict(m, queries=roots))["snapshots"][0]
    truth = {json.dumps(t["formula"]): set(t["truth"]) for t in first["table"]}
    candidates = []
    for wi in range(len(ws)):
        for ei in range(len(es)):
            w, e = ws[wi], es[ei]
            candidates.append(
                dict(
                    id="x" + str(wi * len(es) + ei).zfill(2),
                    world=w,
                    event=e,
                    allowed=w in truth[json.dumps(a["preconditions"][e])],
                )
            )
    kept = {p["id"]: p for p in candidates if p["allowed"]}
    ids = sorted(kept)
    relations, parts, views = [], {}, []
    for agent in agents:
        rows = {}
        for s in ids:
            rows[s] = []
            for t in ids:
                p, q = kept[s], kept[t]
                br = any(
                    p["world"] in b and q["world"] in b for b in m["partitions"][agent]
                )
                er = any(
                    p["event"] in b and q["event"] in b for b in a["partitions"][agent]
                )
                relations.append(
                    dict(
                        agent=agent,
                        source=s,
                        target=t,
                        world_related=br,
                        event_related=er,
                        related=bool(br and er),
                    )
                )
                if br and er:
                    rows[s].append(t)
        parts[agent] = [list(x) for x in sorted({tuple(row) for row in rows.values()})]
    actual = next(
        (
            p["id"]
            for p in candidates
            if p["world"] == m["focus"] and p["event"] == a["actual"] and p["allowed"]
        ),
        None,
    )
    vals = {s: list(m["valuation"][kept[s]["world"]]) for s in ids}
    if ids:
        last = expected(
            dict(
                worlds=ids,
                atoms=atoms,
                valuation=vals,
                partitions=parts,
                focus=actual if actual is not None else ids[0],
                queries=roots,
                announcements=[],
            )
        )["snapshots"][0]
    else:
        last = expected(dict(m, queries=roots, announcements=[["false"]]))["snapshots"][
            1
        ]
        last["round"] = 0
        last["table"] = [t for t in last["table"] if json.dumps(t["formula"]) in truth]
    if actual is None:
        last["focus_status"] = "not_executable"
        for q in last["queries"]:
            q["value"] = None
    for s in ids:
        for agent in agents:
            possible = [
                z["target"]
                for z in relations
                if z["agent"] == agent and z["source"] == s and z["related"]
            ]
            views.append(
                dict(
                    pair=s,
                    agent=agent,
                    possible=possible,
                    worlds=sorted(set(kept[t]["world"] for t in possible)),
                    events=sorted(set(kept[t]["event"] for t in possible)),
                )
            )
    changes = []
    for row in last["table"]:
        old = truth[json.dumps(row["formula"])]
        values = []
        for s in ids:
            b, c = kept[s]["world"] in old, s in row["truth"]
            values.append(dict(pair=s, before=b, after=c, changed=b != c))
        changes.append(dict(formula=row["formula"], pairs=values))
    pub = expected(
        dict(m, queries=roots, announcements=[a["preconditions"][a["actual"]]])
    )
    comparisons = [
        dict(
            formula=f,
            before=first["queries"][i]["value"],
            product=last["queries"][i]["value"],
            public=pub["snapshots"][1]["queries"][i]["value"],
        )
        for i, f in enumerate(m["queries"])
    ]
    return dict(
        schema="epistemlab-events-v1",
        request=deepcopy(request),
        before=first,
        preconditions=[
            dict(
                event=e,
                formula=a["preconditions"][e],
                truth=sorted(truth[json.dumps(a["preconditions"][e])]),
            )
            for e in es
        ],
        candidates=candidates,
        point=dict(
            world=m["focus"],
            event=a["actual"],
            pair=actual,
            executable=actual is not None,
        ),
        product=dict(worlds=ids, valuation=vals, partitions=parts),
        relations=relations,
        views=views,
        after=last,
        changes=changes,
        public_counterfactual=dict(
            snapshot=pub["snapshots"][1], update=pub["updates"][0]
        ),
        comparisons=comparisons,
    )


def verify_events(report):
    try:
        return json.dumps(
            report, sort_keys=True, separators=(",", ":"), allow_nan=False
        ) == json.dumps(
            expected_events(report["request"]),
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
    except (ValueError, KeyError, TypeError, IndexError, OverflowError, RecursionError):
        return False
