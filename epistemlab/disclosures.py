"""All bounded world restrictions; Boolean definability and exact goal frontiers."""
from .model import parse, key
from .core import analyze


def atlas(request):
    worlds, atoms, agents = parse(request)
    if len(worlds) > 8 or request['announcements']:
        raise ValueError('Disclosure atlas requires at most eight worlds and no prior announcements')
    signatures = {w: tuple(a in request['valuation'][w] for a in atoms) for w in worlds}
    classes = [dict(signature=list(s), worlds=[w for w in worlds if signatures[w] == s]) for s in sorted(set(signatures.values()))]
    records = []
    for mask in range(1 << len(worlds)):
        kept = [w for i, w in enumerate(worlds) if mask & (1 << i)]
        split = [(a,b) for a in kept for b in worlds if b not in kept and signatures[a] == signatures[b]]
        obstruction = dict(kept=min(split)[0], removed=min(split)[1]) if split else None
        dnf = [c['signature'] for c in classes if c['worlds'][0] in kept] if not split else None
        if kept:
            r = dict(request, worlds=kept, valuation={w: request['valuation'][w] for w in kept},
                     partitions={a:sorted([part for old in request['partitions'][a] if (part := [w for w in old if w in kept])]) for a in agents}, focus=kept[0])
            snapshot = analyze(r)['snapshots'][0]
            truth = [next(t['truth'] for t in snapshot['table'] if t['formula'] == q) for q in request['queries']]
        else:
            truth = [[] for q in request['queries']]
        focus = request['focus'] in kept
        records.append(dict(mask=mask, retained=kept, boolean_definable=not split,
                            dnf_cubes=dnf, obstruction=obstruction, focus_survives=focus,
                            truth_sets=truth, values=[request['focus'] in t if focus else None for t in truth]))
    summaries=[]
    for q in range(len(request['queries'])):
        diagnostic = [r['mask'] for r in records if r['values'][q] is True]
        successes = [m for m in diagnostic if records[m]['boolean_definable']]
        maximal = [m for m in successes if not any(m != n and m & n == m for n in successes)]
        count = max((len(records[m]['retained']) for m in successes), default=None)
        maximum = [m for m in successes if len(records[m]['retained']) == count]
        losses = [(m,n) for m in successes for n in range(len(records)) if n != m and m & n == n and records[n]['boolean_definable'] and records[n]['focus_survives'] and records[n]['values'][q] is False]
        summaries.append(dict(formula=request['queries'][q], successes=successes, maximal=maximal, maximum=maximum,
                              maximum_retained=count, nonboolean_successes=[m for m in diagnostic if m not in successes],
                              loss_witness=dict(weaker=losses[0][0],stronger=losses[0][1]) if losses else None))
    return dict(schema='epistemlab-disclosures-v1', request=request, valuation_classes=classes, records=records, goals=summaries)
