import json
from pathlib import Path
A=lambda p:['atom',p]
K=lambda a,p:['K',a,p]
N=lambda f:['not',f]
O=lambda x,y:['or',x,y]
B=lambda x,y:['and',x,y]
def model(vals,parts,queries,atoms=None,focus='w0'):
 worlds=[f'w{i}' for i in range(len(vals))]
 return dict(worlds=worlds,atoms=sorted(set(sum(vals,[]))) if atoms is None else atoms,valuation=dict(zip(worlds,vals)),partitions=parts,focus=focus,queries=queries,announcements=[])
cs=[]
def add(title,r):cs.append(dict(title=title,request=r))
p,q=A('p'),A('q')
add('Maximal is not maximum retained',model([['p','q'],['p'],['q'],['q','r']],{'a':[['w0','w1','w2','w3']]},[O(K('a',p),K('a',q)),N(K('a',p))]))
add('A successful restriction is not a Boolean announcement',model([['p'],['p'],[],[]],{'a':[['w0','w2'],['w1','w3']],'b':[['w0','w3'],['w1','w2']]},[B(K('a',p),N(K('b',p))),K('a',p),N(K('b',p))]))
add('More disclosure can destroy ignorance',model([['p'],[]],{'a':[['w0','w1']]},[N(K('a',p)),K('a',p),B(p,N(K('a',p)))]))
old=json.loads(Path('docs/controls.json').read_text())
for i in [1,2,7]:
 r=old[i]['request'];r['announcements']=[];add(['Common knowledge needs a chain','Distributed knowledge is a different goal','Three observers: every one-shot restriction'][[1,2,7].index(i)],r)
add('No atoms: only falsehood or tautology',model([[],[]],{'a':[['w0','w1']]},[['true'],['false'],N(K('a',['false']))],atoms=[]))
add('A false fact cannot be made true by truthful restriction',model([[],['p']],{'a':[['w0','w1']]},[p,K('a',p),N(K('a',p))]))
Path('docs/disclosure-controls.json').write_text(json.dumps(cs,indent=2)+'\n')
