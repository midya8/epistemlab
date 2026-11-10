"""Original bounded informational-action controls and deterministic finite cases."""

from copy import deepcopy
from itertools import product
import random

P = ["atom", "p"]
NP = ["not", P]


def K(a, f):
    return ["K", a, f]


def model(n=2, agents=("a", "b")):
    ws = [f"w{i}" for i in range(n)]
    return dict(
        worlds=ws,
        atoms=["p"],
        valuation={w: (["p"] if i == 0 else []) for i, w in enumerate(ws)},
        partitions={a: [ws[:]] for a in agents},
        focus=ws[0],
        queries=[
            K("a", P),
            K(agents[-1], ["or", K("a", P), K("a", NP)]),
            ["C", list(agents), P],
        ],
        announcements=[],
    )


def request():
    m = model()
    es = ["false_read", "idle", "true_read"]
    return dict(
        model=m,
        action=dict(
            events=es,
            preconditions={es[0]: NP, es[1]: ["true"], es[2]: P},
            partitions={"a": [[e] for e in es], "b": [es[:]]},
            actual="true_read",
        ),
    )


def controls():
    out = []

    def add(title, note, r):
        out.append(dict(title=title, note=note, request=r))

    r = request()
    add(
        "A read may have been skipped",
        "The receiver learns p; the observer still considers an idle event possible, so does not know the receiver learned whether p.",
        r,
    )
    r = deepcopy(r)
    r["action"]["events"].remove("idle")
    r["action"]["preconditions"].pop("idle")
    r["action"]["partitions"] = {
        "a": [["false_read"], ["true_read"]],
        "b": [["false_read", "true_read"]],
    }
    add(
        "An observed read",
        "Without idle, the observer knows the receiver learned whether p, but still does not know p.",
        r,
    )
    r = request()
    r["action"] = dict(
        events=["say"],
        preconditions={"say": P},
        partitions={"a": [["say"]], "b": [["say"]]},
        actual="say",
    )
    add(
        "A public announcement as one event",
        "One event with every agent self-related reproduces truthful public restriction, up to pair names.",
        r,
    )
    r = request()
    r["action"]["actual"] = "false_read"
    add(
        "The designated event cannot occur",
        "Other product pairs exist, but the focus/actual-event pair is absent. Post-event focus queries are null, not false or vacuous.",
        r,
    )
    r = request()
    r["action"]["preconditions"] = {e: ["false"] for e in r["action"]["events"]}
    add(
        "No product pair survives",
        "The global product is empty. There is no pointed post-state.",
        r,
    )
    r = request()
    r["action"]["preconditions"] = {e: ["true"] for e in r["action"]["events"]}
    add(
        "Event uncertainty without new facts",
        "All events are always enabled. Event distinctions alone do not reveal the initially unknown atom.",
        r,
    )
    r = request()
    r["action"] = dict(
        events=["tell"],
        preconditions={"tell": ["and", P, ["not", K("a", P)]]},
        partitions={"a": [["tell"]], "b": [["tell"]]},
        actual="tell",
    )
    add(
        "True before, false after this event",
        "Preconditions are evaluated in the original model. The truthful epistemic content need not remain true in the product.",
        r,
    )
    r = request()
    r["action"] = dict(
        events=["left", "right"],
        preconditions={"left": P, "right": P},
        partitions={"a": [["left"], ["right"]], "b": [["left", "right"]]},
        actual="left",
    )
    add(
        "Equal preconditions do not merge events",
        "Two enabled event copies remain distinct even with the same factual valuation and precondition.",
        r,
    )
    r = deepcopy(out[1]["request"])
    r["model"]["partitions"]["b"] = [["w0"], ["w1"]]
    add(
        "World knowledge rules out an event",
        "The observer's event partition alone permits both reads, but world knowledge and preconditions leave just the actual one.",
        r,
    )
    r = request()
    m = model(4)
    m["partitions"] = {
        "a": [["w0", "w1"], ["w2", "w3"]],
        "b": [["w0", "w2"], ["w1", "w3"]],
    }
    m["queries"] = [["D", ["a", "b"], P], ["E", ["a", "b"], P], ["C", ["a", "b"], P]]
    r["model"] = m
    add(
        "Pooling is not a message",
        "Distributed knowledge uses relation intersection; it does not turn the event into public communication.",
        r,
    )
    r = request()
    r["model"] = model(4)
    r["action"]["preconditions"] = {e: ["true"] for e in r["action"]["events"]}
    add(
        "Twelve product worlds",
        "Four worlds times three always-enabled events attain the product bound; every relation obligation is still explicit.",
        r,
    )
    r = dict(
        model=dict(
            worlds=["w0"],
            atoms=[],
            valuation={"w0": []},
            partitions={"a": [["w0"]]},
            focus="w0",
            queries=[["K", "a", ["true"]], ["C", ["a"], ["false"]]],
            announcements=[],
        ),
        action=dict(
            events=["tick"],
            preconditions={"tick": ["true"]},
            partitions={"a": [["tick"]]},
            actual="tick",
        ),
    )
    add(
        "No supplied atoms",
        "A valid one-world informational event needs no propositional atom.",
        r,
    )
    return out


def partitions(xs):
    if len(xs) == 1:
        return [[xs[:]]]
    return [[xs[:]], [[x] for x in xs]]


def exhaustive():
    for n in [1, 2]:
        ws = [f"w{i}" for i in range(n)]
        es = ["e0", "e1"]
        for bp, ep, valuation, pre in product(
            partitions(ws),
            partitions(es),
            range(1 << n),
            product([P, NP, ["true"], ["false"]], repeat=2),
        ):
            m = model(n, ("a",))
            m["partitions"] = {"a": bp}
            m["valuation"] = {
                w: (["p"] if valuation >> i & 1 else []) for i, w in enumerate(ws)
            }
            m["queries"] = [K("a", P), ["C", ["a"], NP], ["not", K("a", P)]]
            yield dict(
                model=m,
                action=dict(
                    events=es,
                    preconditions=dict(zip(es, pre)),
                    partitions={"a": ep},
                    actual="e0",
                ),
            )
    ws = ["w0", "w1"]
    es = ["e0", "e1"]
    for b0, b1, e0, e1, valuation, pre in product(
        partitions(ws),
        partitions(ws),
        partitions(es),
        partitions(es),
        range(4),
        product([P, NP], repeat=2),
    ):
        m = model()
        m["partitions"] = {"a": b0, "b": b1}
        m["valuation"] = {
            w: (["p"] if valuation >> i & 1 else []) for i, w in enumerate(ws)
        }
        yield dict(
            model=m,
            action=dict(
                events=es,
                preconditions=dict(zip(es, pre)),
                partitions={"a": e0, "b": e1},
                actual="e0",
            ),
        )


def seeded():
    rng = random.Random(62813)

    def partition(xs):
        tags = [rng.randrange(len(xs)) for _ in xs]
        return sorted(
            [[x for x, t in zip(xs, tags) if t == k] for k in sorted(set(tags))]
        )

    for _ in range(60):
        n = rng.randrange(1, 5)
        agents = ["a", "b", "c"][: rng.randrange(1, 4)]
        m = model(n, tuple(agents))
        m["partitions"] = {a: partition(m["worlds"]) for a in agents}
        m["valuation"] = {w: (["p"] if rng.randrange(2) else []) for w in m["worlds"]}
        m["focus"] = rng.choice(m["worlds"])

        def f(d):
            if d == 0:
                return deepcopy(rng.choice([P, ["true"], ["false"]]))
            op = rng.choice(["not", "and", "or", "K", "E", "D", "C"])
            if op == "not":
                return [op, f(d - 1)]
            if op in ["and", "or"]:
                return [op, f(d - 1), f(d - 1)]
            return [
                op,
                (
                    rng.choice(agents)
                    if op == "K"
                    else sorted(rng.sample(agents, rng.randrange(1, len(agents) + 1)))
                ),
                f(d - 1),
            ]

        m["queries"] = [f(2) for _ in range(3)]
        es = [f"e{i}" for i in range(rng.randrange(1, 4))]
        yield dict(
            model=m,
            action=dict(
                events=es,
                preconditions={e: f(2) for e in es},
                partitions={a: partition(es) for a in agents},
                actual=rng.choice(es),
            ),
        )


def all_cases():
    return list(exhaustive()) + list(seeded()) + [c["request"] for c in controls()]


if __name__ == "__main__":
    import json

    print(json.dumps(controls(), indent=2))
