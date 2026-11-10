"""Independent truth-set algebra, block membership, fixed points and Floyd paths."""

import json
from .model import parse


def expected(request):
    worlds, atoms, agents = parse(request)

    def encode(f):
        return json.dumps(f, separators=(",", ":"))

    forms = {}
    stack = list(request["queries"]) + list(request["announcements"])
    while stack:
        f = stack.pop()
        forms[encode(f)] = f
        if f[0] == "not":
            stack.append(f[1])
        elif f[0] in ["and", "or"]:
            stack.extend(f[1:])
        elif f[0] in ["K", "E", "D", "C"]:
            stack.append(f[2])
    fs = [forms[k] for k in sorted(forms, key=lambda x: (len(x), x))]
    active = set(worlds)
    snapshots = []
    updates = []

    def snapshot():
        ws = sorted(active)
        members = {
            a: {
                w: set(b) & active
                for b in request["partitions"][a]
                for w in b
                if w in active
            }
            for a in agents
        }
        values = {}

        def evaluate(f):
            k = encode(f)
            if k in values:
                return values[k]
            op = f[0]
            if op == "true":
                out = set(active)
            elif op == "false":
                out = set()
            elif op == "atom":
                out = {w for w in active if f[1] in request["valuation"][w]}
            elif op == "not":
                out = active - evaluate(f[1])
            elif op == "and":
                out = evaluate(f[1]) & evaluate(f[2])
            elif op == "or":
                out = evaluate(f[1]) | evaluate(f[2])
            else:
                child = evaluate(f[2])
                group = [f[1]] if op == "K" else f[1]
                if op == "C":
                    out = set(child)
                    while True:
                        step = {
                            w for w in out if all(members[a][w] <= out for a in group)
                        }
                        if step == out:
                            break
                        out = step
                else:
                    out = set()
                    for w in active:
                        sets = [members[a][w] for a in group]
                        possible = (
                            set.intersection(*sets) if op == "D" else set.union(*sets)
                        )
                        if possible <= child:
                            out.add(w)
            values[k] = out
            return out

        table = []
        for f in fs:
            truth = evaluate(f)
            obligations = []
            if f[0] in ["K", "E", "D", "C"]:
                op = f[0]
                group = [f[1]] if op == "K" else f[1]
                N = len(ws)
                inf = N + 1
                labels = {}
                dist = [[0 if i == j else inf for j in range(N)] for i in range(N)]
                for i, s in enumerate(ws):
                    for j, t in enumerate(ws):
                        matching = [a for a in group if t in members[a][s]]
                        if len(matching) == len(group) if op == "D" else bool(matching):
                            labels[i, j] = group if op == "D" else [min(matching)]
                            if i != j:
                                dist[i][j] = 1
                if op == "C":
                    for k in range(N):
                        for i in range(N):
                            for j in range(N):
                                dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
                child = evaluate(f[2])
                for i, w in enumerate(ws):
                    ps = []
                    for j, t in enumerate(ws):
                        if dist[i][j] >= inf:
                            continue
                        at = i
                        path = [w]
                        used = []
                        left = dist[i][j]
                        while left:
                            nxt = min(
                                v
                                for u, v in labels
                                if u == at and v != at and dist[v][j] == left - 1
                            )
                            used.append(labels[at, nxt])
                            path.append(ws[nxt])
                            at = nxt
                            left -= 1
                        ps.append(dict(worlds=path, agents=used))
                    bad = [p for p in ps if p["worlds"][-1] not in child]
                    failure = (
                        min(
                            bad,
                            key=lambda p: (len(p["worlds"]), p["worlds"], p["agents"]),
                        )
                        if bad
                        else None
                    )
                    obligations.append(
                        dict(
                            world=w,
                            possible=[p["worlds"][-1] for p in ps],
                            paths=ps,
                            failure=failure,
                        )
                    )
            table.append(dict(formula=f, truth=sorted(truth), obligations=obligations))
        focus = request["focus"]
        return dict(
            round=len(snapshots),
            worlds=ws,
            partitions={
                a: [
                    sorted(set(b) & active)
                    for b in request["partitions"][a]
                    if set(b) & active
                ]
                for a in agents
            },
            focus_status="present" if focus in active else "eliminated",
            queries=[
                dict(formula=f, value=focus in evaluate(f) if focus in active else None)
                for f in request["queries"]
            ],
            table=table,
        )

    snapshots.append(snapshot())
    for f in request["announcements"]:
        before = sorted(active)
        active = set(
            next(r["truth"] for r in snapshots[-1]["table"] if r["formula"] == f)
        )
        snapshots.append(snapshot())
        after = next(r["truth"] for r in snapshots[-1]["table"] if r["formula"] == f)
        updates.append(
            dict(
                formula=f,
                before=before,
                retained=sorted(active),
                removed=sorted(set(before) - active),
                after_true=after,
                lost_truth=sorted(active - set(after)),
                focus_survived=request["focus"] in active,
            )
        )
    return dict(
        schema="epistemlab-v1",
        request=request,
        subformula_count=len(fs),
        snapshots=snapshots,
        updates=updates,
    )


def verify(report):
    try:
        return json.dumps(report, sort_keys=True, separators=(",", ":")) == json.dumps(
            expected(report["request"]), sort_keys=True, separators=(",", ":")
        )
    except (ValueError, KeyError, TypeError, IndexError, OverflowError):
        return False
