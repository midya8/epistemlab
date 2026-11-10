import copy, itertools, json, random, unittest
from pathlib import Path
from unittest.mock import patch
from epistemlab.disclosures import atlas
from epistemlab.disclosure_oracle import reconstruct, verify_atlas

CONTROLS=json.loads((Path(__file__).parents[1]/'docs/disclosure-controls.json').read_text())

def partitions(xs):
    if not xs:return [[]]
    out=[]
    for rest in partitions(xs[1:]):
        out.append(sorted([[xs[0]]]+rest))
        for i in range(len(rest)):
            q=copy.deepcopy(rest);q[i]=sorted(q[i]+[xs[0]]);out.append(sorted(q))
    return out

class DisclosureTests(unittest.TestCase):
    def test_controls_and_contrasts(self):
        aa=[atlas(c['request']) for c in CONTROLS]
        self.assertEqual(sum(len(a['records']) for a in aa),324)
        for a in aa:self.assertTrue(verify_atlas(a))
        g=aa[0]['goals'][0];self.assertEqual(g['maximal'],[3,13]);self.assertEqual(g['maximum'],[13]);self.assertEqual(g['maximum_retained'],3)
        g=aa[1]['goals'][0];self.assertEqual(g['successes'],[]);self.assertEqual(g['nonboolean_successes'],[9,11])
        self.assertEqual(aa[1]['records'][9]['obstruction'],dict(kept='w0',removed='w1'))
        self.assertEqual(aa[2]['goals'][0]['loss_witness'],dict(weaker=3,stronger=1))
        self.assertEqual(sum(r['boolean_definable'] for r in aa[6]['records']),2)
        self.assertEqual(aa[7]['goals'][0]['successes'],[])
        for a in aa:
            self.assertTrue(all(v is None for v in a['records'][0]['values']))
            for r in a['records']:
                if not r['boolean_definable']:
                    self.assertEqual(a['request']['valuation'][r['obstruction']['kept']],a['request']['valuation'][r['obstruction']['removed']])
                else:
                    kept=[w for w in a['request']['worlds'] if any(all((p in a['request']['valuation'][w])==bit for p,bit in zip(a['request']['atoms'],cube)) for cube in r['dnf_cubes'])]
                    self.assertEqual(kept,r['retained'])

    def test_all_200_small_atlases_and_boolean_function_completeness(self):
        worlds=['w0','w1','w2'];ps=partitions(worlds);p=['atom','p'];count=0
        for a,b in itertools.product(ps,repeat=2):
            for bits in itertools.product([False,True],repeat=3):
                r=dict(worlds=worlds,atoms=['p'],valuation={w:['p'] if bit else [] for w,bit in zip(worlds,bits)},partitions={'a':a,'b':b},focus='w0',queries=[['K','a',p],['C',['a','b'],p],['D',['a','b'],p],['not',['K','b',p]]],announcements=[])
                report=atlas(r);self.assertEqual(report,reconstruct(r));count+=1
                # All four Boolean functions of one atom, independent truth-table enumeration.
                possible=set()
                for fn in itertools.product([False,True],repeat=2):possible.add(tuple(w for w,bit in zip(worlds,bits) if fn[int(bit)]))
                self.assertEqual(possible,{tuple(x['retained']) for x in report['records'] if x['boolean_definable']})
        self.assertEqual(count,200)

    def test_seeded_nested_models(self):
        rng=random.Random(824613);accepted=0
        for _ in range(45):
            r=copy.deepcopy(rng.choice(CONTROLS)['request']);r['queries']=r['queries'][:2]
            r['queries']=[['not',['K',next(iter(r['partitions'])),f]] for f in r['queries']]
            rng.shuffle(r['queries']);self.assertEqual(atlas(r),reconstruct(r));accepted+=1
        self.assertEqual(accepted,45)

    def test_every_evidence_surface_is_checked(self):
        a=atlas(CONTROLS[0]['request'])
        edits=[lambda x:x.update(extra=True),lambda x:x.update(schema='old'),lambda x:x['valuation_classes'].pop(),lambda x:x['records'].pop(),lambda x:x['records'][1].update(mask=True),lambda x:x['records'][1].update(boolean_definable=False),lambda x:x['records'][1]['dnf_cubes'][0].reverse(),lambda x:x['records'][1]['truth_sets'][0].clear(),lambda x:x['records'][0]['values'].__setitem__(0,False),lambda x:x['goals'][0].update(maximal=[13]),lambda x:x['goals'][0].update(maximum=[3]),lambda x:x['goals'][0].update(maximum_retained=4),lambda x:x['goals'][1].update(loss_witness=None)]
        rejected=0
        for edit in edits:
            b=copy.deepcopy(a);edit(b)
            if b==a:continue
            self.assertFalse(verify_atlas(b));rejected+=1
        self.assertGreaterEqual(rejected,11)
        b=atlas(CONTROLS[1]['request']);b['records'][9]['obstruction']['removed']='w2';self.assertFalse(verify_atlas(b))

    def test_checker_does_not_call_generator(self):
        a=atlas(CONTROLS[1]['request'])
        with patch('epistemlab.disclosures.atlas',side_effect=AssertionError),patch('epistemlab.disclosures.analyze',side_effect=AssertionError),patch('epistemlab.core.analyze',side_effect=AssertionError):self.assertTrue(verify_atlas(a))

    def test_bounds_and_ambiguous_anchor_rejected(self):
        r=copy.deepcopy(CONTROLS[0]['request']);r['announcements']=[['true']]
        for fn in [atlas,reconstruct]:
            with self.assertRaises(ValueError):fn(r)
        r=copy.deepcopy(CONTROLS[0]['request']);r['worlds']=[f'w{i}' for i in range(9)];r['valuation']={w:[] for w in r['worlds']};r['partitions']={'a':[r['worlds']]}
        for fn in [atlas,reconstruct]:
            with self.assertRaises(ValueError):fn(r)
        self.assertFalse(verify_atlas(None));self.assertFalse(verify_atlas({}));self.assertFalse(verify_atlas({'request':r}))

if __name__=='__main__':unittest.main()
