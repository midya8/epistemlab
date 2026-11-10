"""Product cells and crossed partition blocks; old pointwise modal semantics reused."""

from copy import deepcopy
from .event_input import parse_events
from .core import analyze


def update(r):
    ws, atoms, agents, es, roots = parse_events(r)
    m, a = r["model"], r["action"]
    before = analyze(dict(m, queries=roots))["snapshots"][0]
    pre = {
        e: next(
            t["truth"] for t in before["table"] if t["formula"] == a["preconditions"][e]
        )
        for e in es
    }
    candidates = [
        dict(id=f"x{i * len(es) + j:02}", world=w, event=e, allowed=w in pre[e])
        for i, w in enumerate(ws)
        for j, e in enumerate(es)
    ]
    kept = [p for p in candidates if p["allowed"]]
    ids = [p["id"] for p in kept]
    part = {}
    for agent in agents:
        blocks = []
        for old in m["partitions"][agent]:
            for ev in a["partitions"][agent]:
                b = [p["id"] for p in kept if p["world"] in old and p["event"] in ev]
                if b:
                    blocks.append(b)
        part[agent] = sorted(blocks)
    point = next(
        p for p in candidates if p["world"] == m["focus"] and p["event"] == a["actual"]
    )
    focus = point["id"] if point["allowed"] else None
    valuations = {p["id"]: list(m["valuation"][p["world"]]) for p in kept}
    if ids:
        product = dict(
            worlds=ids,
            atoms=atoms,
            valuation=valuations,
            partitions=part,
            focus=focus or ids[0],
            queries=roots,
            announcements=[],
        )
        after = analyze(product)["snapshots"][0]
    else:
        empty = analyze(dict(m, queries=roots, announcements=[["false"]]))["snapshots"][
            -1
        ]
        after = dict(empty, round=0)
        after["table"] = [
            t
            for t in after["table"]
            if any(t["formula"] == z["formula"] for z in before["table"])
        ]
    if focus is None:
        after["focus_status"] = "not_executable"
        after["queries"] = [dict(formula=f, value=None) for f in roots]
    relations = []
    for agent in agents:
        base = {w: i for i, b in enumerate(m["partitions"][agent]) for w in b}
        event = {e: i for i, b in enumerate(a["partitions"][agent]) for e in b}
        for p in kept:
            for q in kept:
                br, er = (
                    base[p["world"]] == base[q["world"]],
                    event[p["event"]] == event[q["event"]],
                )
                relations.append(
                    dict(
                        agent=agent,
                        source=p["id"],
                        target=q["id"],
                        world_related=br,
                        event_related=er,
                        related=br and er,
                    )
                )
    views = []
    for p in kept:
        for agent in agents:
            possible = next(b for b in part[agent] if p["id"] in b)
            ps = [q for q in kept if q["id"] in possible]
            views.append(
                dict(
                    pair=p["id"],
                    agent=agent,
                    possible=possible,
                    worlds=sorted({q["world"] for q in ps}),
                    events=sorted({q["event"] for q in ps}),
                )
            )
    changes = []
    for t in after["table"]:
        old = next(z["truth"] for z in before["table"] if z["formula"] == t["formula"])
        changes.append(
            dict(
                formula=t["formula"],
                pairs=[
                    dict(
                        pair=p["id"],
                        before=p["world"] in old,
                        after=p["id"] in t["truth"],
                        changed=(p["world"] in old) != (p["id"] in t["truth"]),
                    )
                    for p in kept
                ],
            )
        )
    public = analyze(
        dict(m, queries=roots, announcements=[a["preconditions"][a["actual"]]])
    )
    public_after = public["snapshots"][1]
    comparisons = []
    for i, f in enumerate(m["queries"]):
        comparisons.append(
            dict(
                formula=f,
                before=before["queries"][i]["value"],
                product=after["queries"][i]["value"],
                public=public_after["queries"][i]["value"],
            )
        )
    return dict(
        schema="epistemlab-events-v1",
        request=deepcopy(r),
        before=before,
        preconditions=[
            dict(event=e, formula=a["preconditions"][e], truth=pre[e]) for e in es
        ],
        candidates=candidates,
        point=dict(
            world=m["focus"],
            event=a["actual"],
            pair=focus,
            executable=focus is not None,
        ),
        product=dict(worlds=ids, valuation=valuations, partitions=part),
        relations=relations,
        views=views,
        after=after,
        changes=changes,
        public_counterfactual=dict(snapshot=public_after, update=public["updates"][0]),
        comparisons=comparisons,
    )
