"""Strict finite supplied S5 model and bounded JSON formula language."""

import re


def key(f):
    import json

    return json.dumps(f, separators=(",", ":"))


def parse(request):
    if not isinstance(request, dict) or set(request) != {
        "worlds",
        "atoms",
        "valuation",
        "partitions",
        "focus",
        "queries",
        "announcements",
    }:
        raise ValueError(
            "Expected worlds, atoms, valuation, partitions, focus, queries and announcements only"
        )

    def names(xs, cap, empty=False):
        if (
            not isinstance(xs, list)
            or not (0 if empty else 1) <= len(xs) <= cap
            or any(
                not isinstance(x, str) or not re.fullmatch("[a-z][a-z0-9_]{0,11}", x)
                for x in xs
            )
            or xs != sorted(set(xs))
        ):
            raise ValueError(
                "Names must be unique sorted short lowercase identifiers within the bound"
            )

    worlds = request["worlds"]
    atoms = request["atoms"]
    names(worlds, 16)
    names(atoms, 5, True)
    valuation = request["valuation"]
    partitions = request["partitions"]
    if not isinstance(valuation, dict) or set(valuation) != set(worlds):
        raise ValueError("Every supplied world needs exactly one valuation")
    for ps in valuation.values():
        names(ps, 5, True)
        if not set(ps) <= set(atoms):
            raise ValueError("Unknown valuation atom")
    if not isinstance(partitions, dict):
        raise ValueError("Expected information partitions")
    agents = sorted(partitions)
    names(agents, 3)
    for blocks in partitions.values():
        if not isinstance(blocks, list) or not 1 <= len(blocks) <= len(worlds):
            raise ValueError("Partition blocks must cover the supplied worlds")
        for block in blocks:
            names(block, 16)
        flat = [w for block in blocks for w in block]
        if sorted(flat) != worlds or blocks != sorted(blocks):
            raise ValueError(
                "Each agent partition must cover every world exactly once, with sorted blocks"
            )
    if request["focus"] not in worlds or not isinstance(request["focus"], str):
        raise ValueError("Focus must name a supplied world")
    if (
        not isinstance(request["queries"], list)
        or not 1 <= len(request["queries"]) <= 6
        or not isinstance(request["announcements"], list)
        or len(request["announcements"]) > 4
    ):
        raise ValueError("One to six queries and at most four announcements")
    budget = [0]

    def formula(f, depth=0):
        budget[0] += 1
        if depth > 6 or budget[0] > 128:
            raise ValueError("Formula bound: depth six and 128 total syntax nodes")
        if not isinstance(f, list) or not f or not isinstance(f[0], str):
            raise ValueError("Expected a JSON array formula")
        op = f[0]
        if op in ["true", "false"] and len(f) == 1:
            return
        if op == "atom" and len(f) == 2 and isinstance(f[1], str) and f[1] in atoms:
            return
        if op == "not" and len(f) == 2:
            formula(f[1], depth + 1)
            return
        if op in ["and", "or"] and len(f) == 3:
            formula(f[1], depth + 1)
            formula(f[2], depth + 1)
            return
        if op == "K" and len(f) == 3 and isinstance(f[1], str) and f[1] in agents:
            formula(f[2], depth + 1)
            return
        if op in ["E", "D", "C"] and len(f) == 3:
            names(f[1], 3)
            if not set(f[1]) <= set(agents):
                raise ValueError("Unknown group agent")
            formula(f[2], depth + 1)
            return
        raise ValueError("Unknown formula, atom, agent, arity or nonempty group")

    for f in request["queries"] + request["announcements"]:
        formula(f)
    return worlds, atoms, agents


def subformulas(roots):
    found = {}

    def visit(f):
        found[key(f)] = f
        if f[0] == "not":
            visit(f[1])
        elif f[0] in ["and", "or"]:
            visit(f[1])
            visit(f[2])
        elif f[0] in ["K", "E", "D", "C"]:
            visit(f[2])

    for f in roots:
        visit(f)
    return [found[k] for k in sorted(found, key=lambda k: (len(k), k))]
