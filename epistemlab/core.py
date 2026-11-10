"""Pointwise recursive semantics, relational BFS, truthful model restriction."""

from collections import deque
from .model import parse, key, subformulas


def analyze(request):
    worlds, atoms, agents = parse(request)
    fs = subformulas(request["queries"] + request["announcements"])
    block = {
        a: {w: i for i, b in enumerate(request["partitions"][a]) for w in b}
        for a in agents
    }
    active = list(worlds)
    snapshots = []
    updates = []

    def snapshot():
        memo = {}

        def paths(f, w):
            op = f[0]
            group = [f[1]] if op == "K" else f[1]

            def neighbours(s):
                out = []
                for t in active:
                    labels = [a for a in group if block[a][s] == block[a][t]]
                    if len(labels) == len(group) if op == "D" else bool(labels):
                        out.append((t, group if op == "D" else [min(labels)]))
                return out

            if op != "C":
                return [
                    dict(
                        worlds=[w] if t == w else [w, t],
                        agents=[] if t == w else [label],
                    )
                    for t, label in neighbours(w)
                ]
            found = {w: dict(worlds=[w], agents=[])}
            queue = deque([w])
            while queue:
                s = queue.popleft()
                for t, label in neighbours(s):
                    if t not in found:
                        found[t] = dict(
                            worlds=found[s]["worlds"] + [t],
                            agents=found[s]["agents"] + [label],
                        )
                        queue.append(t)
            return [found[t] for t in sorted(found)]

        def truth(f, w):
            k = (key(f), w)
            if k in memo:
                return memo[k]
            op = f[0]
            if op == "true":
                v = True
            elif op == "false":
                v = False
            elif op == "atom":
                v = f[1] in request["valuation"][w]
            elif op == "not":
                v = not truth(f[1], w)
            elif op == "and":
                v = truth(f[1], w) and truth(f[2], w)
            elif op == "or":
                v = truth(f[1], w) or truth(f[2], w)
            else:
                v = all(truth(f[2], p["worlds"][-1]) for p in paths(f, w))
            memo[k] = v
            return v

        table = []
        for f in fs:
            obligations = []
            if f[0] in ["K", "E", "D", "C"]:
                for w in active:
                    ps = paths(f, w)
                    bad = [p for p in ps if not truth(f[2], p["worlds"][-1])]
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
            table.append(
                dict(
                    formula=f,
                    truth=[w for w in active if truth(f, w)],
                    obligations=obligations,
                )
            )
        focus = request["focus"]
        return dict(
            round=len(snapshots),
            worlds=list(active),
            partitions={
                a: [
                    b
                    for old in request["partitions"][a]
                    if (b := [w for w in old if w in active])
                ]
                for a in agents
            },
            focus_status="present" if focus in active else "eliminated",
            queries=[
                dict(formula=f, value=truth(f, focus) if focus in active else None)
                for f in request["queries"]
            ],
            table=table,
        )

    snapshots.append(snapshot())
    for f in request["announcements"]:
        before = list(active)
        active = next(
            row["truth"] for row in snapshots[-1]["table"] if row["formula"] == f
        )
        snapshots.append(snapshot())
        after_true = next(
            row["truth"] for row in snapshots[-1]["table"] if row["formula"] == f
        )
        updates.append(
            dict(
                formula=f,
                before=before,
                retained=list(active),
                removed=[w for w in before if w not in active],
                after_true=after_true,
                lost_truth=[w for w in active if w not in after_true],
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
