import json
from pathlib import Path

atom = lambda p: ["atom", p]
K = lambda a, f: ["K", a, f]
C = lambda f: ["C", ["a", "b"], f]
E = lambda f: ["E", ["a", "b"], f]
D = lambda f: ["D", ["a", "b"], f]
p = atom("p")
moore = ["and", p, ["not", K("a", p)]]


def req(worlds, vals, parts, queries, ann=(), focus=None, atoms=["p"]):
    return dict(
        worlds=worlds,
        atoms=atoms,
        valuation=dict(zip(worlds, vals)),
        partitions=parts,
        focus=focus or worlds[0],
        queries=queries,
        announcements=list(ann),
    )


cs = []


def add(id, title, r):
    cs.append(dict(id=id, title=title, request=r))


add(
    "moore",
    "A truthful announcement can refute itself",
    req(
        ["w0", "w1"],
        [["p"], []],
        {"a": [["w0", "w1"]], "b": [["w0"], ["w1"]]},
        [moore, K("a", p), C(p)],
        [moore],
    ),
)
add(
    "everybody",
    "Everybody knows. Common knowledge fails.",
    req(
        ["w0", "w1", "w2"],
        [["p"], ["p"], []],
        {"a": [["w0", "w1"], ["w2"]], "b": [["w0"], ["w1", "w2"]]},
        [E(p), C(p), ["E", ["a", "b"], E(p)]],
    ),
)
add(
    "distributed",
    "Pooled information is not a message",
    req(
        ["w0", "w1", "w2", "w3"],
        [["p"], [], [], []],
        {"a": [["w0", "w1"], ["w2", "w3"]], "b": [["w0", "w2"], ["w1", "w3"]]},
        [D(p), K("a", p), K("b", p), C(p)],
    ),
)
add(
    "atomic",
    "Announcing a fact makes that fact common",
    req(
        ["w0", "w1", "w2"],
        [["p"], [], ["p"]],
        {"a": [["w0", "w1", "w2"]], "b": [["w0", "w1"], ["w2"]]},
        [p, E(p), C(p)],
        [p],
    ),
)
add(
    "repeat",
    "Repeating an unsuccessful formula empties the model",
    req(
        ["w0", "w1"],
        [["p"], []],
        {"a": [["w0", "w1"]], "b": [["w0"], ["w1"]]},
        [moore, p, K("a", p)],
        [moore, moore, p],
    ),
)
add(
    "eliminated",
    "A false-at-focus announcement removes the focus",
    req(
        ["w0", "w1"],
        [[], ["p"]],
        {"a": [["w0", "w1"]], "b": [["w0", "w1"]]},
        [p, K("a", p), C(p)],
        [p],
    ),
)
add(
    "disconnected",
    "Common knowledge is component-local",
    req(
        ["w0", "w1", "w2", "w3"],
        [["p"], ["p"], [], []],
        {"a": [["w0", "w1"], ["w2", "w3"]], "b": [["w0"], ["w1"], ["w2", "w3"]]},
        [C(p), C(["not", p]), D(p)],
    ),
)
worlds = ["w" + format(i, "02d") for i in range(8)]
vals = [[x for j, x in enumerate(["p", "q", "r"]) if i >> j & 1] for i in range(8)]
parts = {
    a: [
        [w for i, w in enumerate(worlds) if i & ~(1 << j) == mask]
        for mask in range(8)
        if mask & 1 << j == 0
    ]
    for j, a in enumerate(["a", "b", "c"])
}
muddy = ["or", p, ["or", atom("q"), atom("r")]]
unknown = [
    "and",
    ["not", K("a", p)],
    ["and", ["not", K("b", atom("q"))], ["not", K("c", atom("r"))]],
]

add(
    "muddy",
    "Three supplied observers, repeated ignorance",
    req(
        worlds,
        vals,
        parts,
        [
            K("a", p),
            K("b", atom("q")),
            K("c", atom("r")),
            ["C", ["a", "b", "c"], muddy],
        ],
        [muddy, unknown, unknown],
        focus="w07",
        atoms=["p", "q", "r"],
    ),
)
Path("docs/controls.json").write_text(json.dumps(cs, indent=2) + "\n")
Path("docs/example.json").write_text(json.dumps(cs[0]["request"], indent=2) + "\n")
