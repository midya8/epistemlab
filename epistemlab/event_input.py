"""Strict bounded S5 informational-action schema. No dynamic operators/postconditions."""

import re
from .model import parse


def parse_events(r):
    if not isinstance(r, dict) or set(r) != {"model", "action"}:
        raise ValueError("Expected exactly model and action")
    m, a = r["model"], r["action"]
    worlds, atoms, agents = parse(m)
    if len(worlds) > 4 or len(m["queries"]) > 3 or m["announcements"]:
        raise ValueError(
            "Event update: at most four worlds, three queries, no sequential announcements"
        )
    if not isinstance(a, dict) or set(a) != {
        "events",
        "preconditions",
        "partitions",
        "actual",
    }:
        raise ValueError("Expected events, preconditions, partitions and actual only")
    es, pre, parts = a["events"], a["preconditions"], a["partitions"]
    if (
        not isinstance(es, list)
        or not 1 <= len(es) <= 3
        or any(
            not isinstance(e, str) or not re.fullmatch("[a-z][a-z0-9_]{0,11}", e)
            for e in es
        )
        or es != sorted(set(es))
    ):
        raise ValueError("One to three named events")
    if not isinstance(parts, dict) or set(parts) != set(agents):
        raise ValueError("Event partitions must name exactly the model agents")
    if not isinstance(pre, dict) or set(pre) != set(es):
        raise ValueError("Exactly one precondition for every event")
    parse(
        dict(
            worlds=es,
            atoms=[],
            valuation={e: [] for e in es},
            partitions=parts,
            focus=a["actual"],
            queries=[["true"]],
            announcements=[],
        )
    )
    roots = m["queries"] + [pre[e] for e in es]
    parse(dict(m, queries=roots, announcements=[pre[a["actual"]]]))
    return worlds, atoms, agents, es, roots
