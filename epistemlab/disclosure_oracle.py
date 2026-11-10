"""Separate partition-of-valuations enumeration and full oracle replay per restriction."""
import itertools, json
from .model import parse
from .oracle import expected


def reconstruct(request):
    worlds, atoms, agents = parse(request)
    if len(worlds)>8 or request['announcements']:
        raise ValueError('Disclosure atlas requires at most eight worlds and no prior announcements')
    grouped={}
    for w in worlds:
        signature=tuple(p in request['valuation'][w] for p in atoms)
        grouped.setdefault(signature,[]).append(w)
    classes=[{'signature':list(k),'worlds':v} for k,v in sorted(grouped.items())]
    valid={}
    for bits in itertools.product([False,True],repeat=len(classes)):
        ws=sorted(w for c,b in zip(classes,bits) if b for w in c['worlds'])
        valid[tuple(ws)]=[c['signature'] for c,b in zip(classes,bits) if b]
    records={}
    for size in range(len(worlds)+1):
        for combination in itertools.combinations(worlds,size):
            kept=list(combination); remaining=set(kept)
            mask=sum(2**worlds.index(w) for w in kept)
            if kept:
                rr={k:v for k,v in request.items()}
                rr.update(worlds=kept,valuation={w:request['valuation'][w] for w in kept},focus=kept[-1],partitions={a:sorted([sorted(set(b)&remaining) for b in request['partitions'][a] if set(b)&remaining]) for a in agents})
                table=expected(rr)['snapshots'][0]['table']
                truth=[next(row['truth'] for row in table if row['formula']==f) for f in request['queries']]
            else:truth=[[] for _ in request['queries']]
            obstruct=None
            for a in kept:
                for b in worlds:
                    if b not in remaining and request['valuation'][a]==request['valuation'][b]:
                        obstruct={'kept':a,'removed':b};break
                if obstruct:break
            definable=tuple(kept) in valid
            survives=request['focus'] in remaining
            records[mask]=dict(mask=mask,retained=kept,boolean_definable=definable,dnf_cubes=valid.get(tuple(kept)),obstruction=obstruct,focus_survives=survives,truth_sets=truth,values=[request['focus'] in t if survives else None for t in truth])
    records=[records[i] for i in range(2**len(worlds))]
    summaries=[]
    for i,f in enumerate(request['queries']):
        good=[r for r in records if r['values'][i] is True and r['boolean_definable']]
        sets={r['mask']:set(r['retained']) for r in good}
        maximal=[m for m,s in sets.items() if not any(s<t for t in sets.values())]
        maximum_count=max(map(len,sets.values()),default=None)
        maximum=[m for m,s in sets.items() if len(s)==maximum_count]
        losses=[]
        for m,s in sets.items():
            for r in records:
                if r['boolean_definable'] and r['focus_survives'] and r['values'][i] is False and set(r['retained'])<s:losses.append((m,r['mask']))
        summaries.append(dict(formula=f,successes=list(sets),maximal=maximal,maximum=maximum,maximum_retained=maximum_count,nonboolean_successes=[r['mask'] for r in records if not r['boolean_definable'] and r['values'][i] is True],loss_witness=dict(weaker=min(losses)[0],stronger=min(losses)[1]) if losses else None))
    return dict(schema='epistemlab-disclosures-v1',request=request,valuation_classes=classes,records=records,goals=summaries)


def verify_atlas(report):
    try:return json.dumps(report,sort_keys=True,separators=(',',':'))==json.dumps(reconstruct(report['request']),sort_keys=True,separators=(',',':'))
    except (ValueError,KeyError,TypeError,IndexError,OverflowError):return False
