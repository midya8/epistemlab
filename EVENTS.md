# S5 informational event updates

A fact can stay fixed while knowledge about an observation changes. This is a separate bounded action-model product inspector. The original sequential public-announcement inspector and Boolean disclosure atlas retain their schemas and semantics.

[Interactive event inspector](https://midya8.github.io/epistemlab/events.html)

## Exact contract

The request has exactly `model` and `action`. `model` uses the original seven-field schema (`worlds`, `atoms`, `valuation`, `partitions`, `focus`, `queries`, `announcements`), with one to four worlds, one to three queries and an empty `announcements` list. Original bounds remain: one to three agents, zero to five atoms, sorted unique short lowercase identifiers, complete sorted S5 partitions, depth at most six. The combined original queries, all event preconditions and one extra occurrence of the actual event's precondition must fit the original 128-syntax-node budget and six-root query bound. The extra occurrence budgets the explicitly computed public counterfactual.

`action` has exactly:

- `events`: one to three sorted unique event names;
- `preconditions`: exactly one original static epistemic formula per event;
- `partitions`: one complete sorted equivalence partition of the events for exactly every model agent;
- `actual`: one supplied event, independently of whether it is executable at the supplied focus.

No factual postconditions, assignments, action composition, sequential actions or dynamic operators are accepted. The existing formula language is `true`, `false`, `atom`, `not`, `and`, `or`, individual `K` and nonempty-group `E`, `D`, `C`. Common knowledge includes the zero-length path; distributed knowledge uses the intersection of the group's relations. Partitions mean idealized factual knowledge, not uncertain or mistaken beliefs.

## Product, not designated-event filtering

For original model M=(W,R,V) and action A=(E,Q,pre), define:

```
W' = {(w,e) in W x E : M,w satisfies pre(e)}
(w,e) R'_a (v,f) iff w R_a v AND e Q_a f
V'((w,e)) = V(w)
```

Every precondition is evaluated in the original model, including epistemic preconditions. It need not remain true after the update. The complete Cartesian candidate matrix is retained as evidence, including the excluded pairs. Stable pair IDs are `x00`, `x01`, ... in original-world-major/event-minor order, including gaps for rejected candidates. Equal facts or preconditions never merge event copies.

The actual event marks a point; it does not remove alternative events. A pointed execution exists exactly when `(focus,actual)` is retained. The global product can be nonempty while this designated pair does not exist. In that case the whole product and every unpointed modal truth set remain inspectable, but post-event focus values are null and `focus_status` is `not_executable`. An empty global product likewise has no point. Null is not false and is not a claim that a dynamic box formula holds vacuously. No dynamic box or diamond syntax is implemented.

The `after` snapshot normalizes its round to zero. Its query values refer only to the designated pair when executable. For a nonempty unpointed product, a temporary valid point is used only to call the existing static engine, then all focus values are cleared; the world-wide truth table never depends on that temporary point. For an empty product, the old engine's empty restriction computes the empty-domain truth table; the internal `false` restriction formula is filtered unless it is already a supplied subformula. Neither implementation invents a replacement actual world in its report.

## Why S5 survives

The product of two equivalence relations is an equivalence relation on W x E. Restricting that relation to the precondition-satisfying pairs preserves reflexivity, symmetry and transitivity. Each nonempty crossed pair of a world block and an event block is therefore one product information block. This justifies the native crossed-block construction, but does not justify replacing AND by OR or using just one component. The independent checker reconstructs the pair relation first and extracts its distinct rows as equivalence classes. The browser connects related pairs with disjoint-set union.

Atomic truth is inherited by definition. Preconditions can remove possibilities but cannot assign new atom values. One single event with precondition phi and each agent self-related gives an isomorphic copy of the ordinary truthful public restriction by phi: w maps to (w,event). The proof is direct for atoms and Boolean operators, preserves every individual/group relation, and hence preserves all supplied static formulas including common knowledge.

## The original controls

The default has original worlds w0:p and w1:not-p. Both agents a and b initially consider both worlds possible. The events are read-not-p, idle and read-p, with preconditions not-p, true and p. Agent a distinguishes all events. Agent b considers all three events indistinguishable. The designated event is read-p at w0. Four product pairs survive.

At the actual pair a knows p. But b still considers idle at either original world possible, so b does not know that a learned whether p. Common knowledge of p also fails. Publicly announcing p instead would make all three supplied queries true. This public column is an explicitly different action, not an approximation substituted for the product.

Removing idle gives the observed-read contrast: b now knows that a knows whether p, while b still does not know p and p is not common knowledge. Other controls show one-event public equivalence, a non-executable designated event with a nonempty global product, an empty product, all-enabled events, a self-refuting epistemic precondition, duplicate preconditions, event elimination from prior world knowledge, distributed-vs-everybody knowledge, the twelve-pair bound and a model with no atoms. Names and valuations are original synthetic fixtures, not private information or empirical observations.

This S5 scope does not model a fully unnoticed secret where an outsider falsely rules out the actual event. In the general directed action models in the BMS and Stanford sources, that situation uses nonreflexive/asymmetric event possibilities. Importing its qualitative claims into equivalence partitions would change the logic. Here an outsider can be uncertain whether something happened, but cannot falsely exclude the actual event.

## Complete evidence and independent checking

A report includes the original request, before truth table, every event precondition set, all world/event candidates, point executability, inherited valuation, complete product partitions, both Boolean component conditions for every ordered pair/agent obligation, every pair's projected world/event possibilities, the full after table, every before/after subformula change at every retained pair, and a separate actual-precondition public-restriction snapshot and comparison.

Native `events.update` crosses partition blocks and reuses the original pointwise-recursive/BFS modal analyzer. `event_oracle.expected_events` imports neither that generator nor the old analyzer: it tests component relation membership, reconstructs product classes from relation rows and calls the separately implemented old truth-set/greatest-fixed-point/Floyd oracle. The old engines and strict schema are explicitly shared infrastructure, not newly independent copies. JavaScript uses a separately written pair-relation union-find construction and the existing separate browser knowledge engine. The full report is compared, not only selected point values.

The optional genuinely invoked pyModelChecking 1.3.4 reference first evaluates base/precondition formulas bottom-up using ordinary CTL, independently reconstructs product pairs and component relations, then checks every before/product/public subformula set. Individual K, group E and group D use AX on the individual, union or intersection relation. Common knowledge uses AG on the group's union relation. These S5 relations are reflexive, so the graphs are total, and AG includes the zero-length path. Boolean child sets are separately labeled before each library call. This is a documented translation to ordinary CTL, not a claim that the package implements the event parser, proves the product theorem or checks real agents. No fairness API is used. No package source is vendored.

## Reproduce

```
python -m unittest discover -s tests -v
node --test --test-concurrency=1 tests/test_*.mjs tests/test_*.cjs
bash tools/check_wheel.sh
python -m pip install -r requirements-reference.txt
python tools/check_event_reference.py
python -c "import json;json.dump(json.load(open('docs/event-controls.json'))[0]['request'],open('event-request.json','w'))"
python -m epistemlab.event_cli event-request.json --output event.json
python -m epistemlab.event_cli event.json --verify
# Installed console entrypoint: epistemlab-events
```

The separate CLI accepts `-` for stdin, rejects duplicate keys and nonfinite JSON, caps input at 8,000,000 bytes, verifies generated evidence independently, and writes output atomically only after success. Verification failures leave existing output unchanged. Existing `epistemlab analyze|verify|disclosures|verify-disclosures` commands retain their behavior.

Local tests: 30 Python functions, including 14 prior and 16 new; thirteen Node/Chrome tests, including nine prior and four new. Complete agreement covers 648 reports: 576 explicitly enumerated tiny cases, 60 seed-62813 nested cases and twelve controls. Those reports contain 2,552 Cartesian candidates, 5,984 complete product-arrow obligations and 9,208 before/after subformula sets. All 1,072 separately altered noninput primitive leaves of the default report are rejected. The optional installed reference checks 648 requests, 1,944 snapshots, 13,812 subformula sets, 8,961 actual ordinary CTL calls and 1,278 retained pairs.

Actual Chrome checks 36 control/width reports at 1280/390/320, 129 retained-cell interactions, 255 source rows, 1,743 selected relation obligations, 783 subformula selections, 963 modal obligations and 3,219 path rows. Twelve trusted completed downloads are byte-compared and independently replayed through the native CLI. Stale/invalid input clears results. Fresh installed-wheel checks outside checkout cover twelve event controls through both entrypoints, eleven installed module origins, 24 forged CLI rejections with atomic output preservation and 24 direct checker forgeries, retaining both older eight-control families.

These are bounded coverage counts, not a proof or scalability benchmark. Complete published-source reproduction, CI, deployment assets and pixels must be checked separately from local success.

## Inspected sources

1. Baltag, Moss and Solecki, *The Logic of Public Announcements, Common Knowledge, and Private Suspicions*, CWI SEN-R9922, November30,1999, sections2.2/2.3: [primary paper](https://ir.cwi.nl/pub/4497/04497D.pdf). Product definitions, pointed executability and explicitly narrower S5 actions. Established theory is theirs, not a novelty claim here.
2. [Stanford Encyclopedia of Philosophy: Dynamic Epistemic Logic](https://plato.stanford.edu/entries/dynamic-epistemic/), first published June24,2016, section3. General directed private-action examples and product construction. The fully private directed example is outside our S5 scope.
3. [Freiburg DEL chapter4a, WS2016/17](https://gki.informatik.uni-freiburg.de/teaching/ws1617/del/chapter4a.pdf), definitions2/5 and observed-read/public-single-event examples. Used for equations and scope, not copied fixture diagrams or dynamic syntax.
4. [Freiburg DEL lecture4, SS2019](https://gki.informatik.uni-freiburg.de/teaching/ss19/del/del04.pdf), action models, observed/may-read distinction and product update.
5. Jan van Eijck, [Dynamic Epistemic Logics](https://staff.fnwi.uva.nl/d.j.n.vaneijck2/papers/13/pdfs/del.pdf), section5. Formal product equations and S5 closure under product/restriction. Narrative examples are not test oracles.
6. van Ditmarsch, van der Hoek and Kooi, [Dynamic Epistemic Logic overview](https://iep.utm.edu/wp-content/media/DynamicEpistemicLogic.pdf), event/world uncertainty and product construction. Secondary encyclopedia overview, not a package invoked.
7. Nebel, Bergdoll and Engesser, [Multi-Agent Systems lecture08, WS2019/20](https://gki.informatik.uni-freiburg.de/teaching/ws1920/multiagent-systems/lecture08-handout4.pdf), S5 informational-action context.
8. pyModelChecking official [logic API](https://pymodelchecking.readthedocs.io/en/latest/logics_API.html) and [model API](https://pymodelchecking.readthedocs.io/en/latest/models_API.html), ordinary CTL AX/AG/modelcheck and Kripke graph interface. Actual pinned version1.3.4 execution described above.

## Limits

One supplied informational S5 action on a tiny finite model. No probabilities, factual change, belief revision, deception, directed secret actions, dynamic formula operators, action composition, automatic event selection, epistemic planning, new logical theory or symbolic scalability. The models assume idealized knowledge and supplied uncertainty; they do not infer what humans or LLMs know, believe or can compute. A source agreement or accepted report is not a guarantee about a deployed agent or communication channel.
