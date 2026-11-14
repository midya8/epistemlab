# EpistemLab

A dependency-free finite multi-agent knowledge workbench. Inspect every supplied
world, every information partition, every subformula truth set and every public
announcement restriction. A separate checker reconstructs the complete report.
The browser computes these experiments locally after the static assets load. No model, backend, or paid API is called.
No training, private data or inferred human knowledge.

## Choose an update

| Question | Entry point | Scope |
| --- | --- | --- |
| What changes after a supplied public announcement? | `analyze`, `verify`, `docs/index.html` | Sequential restrictions and every subformula truth set |
| Which Boolean announcements meet a goal? | `disclosures`, `verify-disclosures`, `docs/disclosures.html` | Bounded complete restriction atlas, definability and retained-world frontiers |
| Who can distinguish which informational event occurred? | `epistemlab.event_cli`, `docs/events.html` | S5 product updates, event/world candidates and modal relations |

Each tool works on the supplied model. It does not infer what real people know.
Public restriction and uncertain-event product update are different operations;
a truthful announcement need not remain true after its own update.

## Boolean disclosure atlas

The separate [live disclosure atlas](https://midya8.github.io/epistemlab/disclosures.html) enumerates every world restriction for up to eight worlds, but counts only focus-truthful Boolean-definable announcements as solutions. Equal-valuation worlds cannot be separated by any Boolean formula over the supplied atoms. Actual obstruction pairs and canonical defining DNF cubes expose the distinction.

The default control has two inclusion-maximal solutions retaining two and three worlds; only the latter is maximum-retained. Another has two diagnostic successes but no Boolean solution. More disclosure can destroy an ignorance goal. These are exact supplied-model results, not minimum formula size, information leakage, general planning or APAL/BAPAL logic. See [DISCLOSURES.md](DISCLOSURES.md) for the separate schema and contract.

For a runnable example, save one control request first:

```sh
python -c "import json;json.dump(json.load(open('docs/disclosure-controls.json'))[0]['request'],open('disclosure-request.json','w'))"
epistemlab disclosures disclosure-request.json > atlas.json
epistemlab verify-disclosures atlas.json
```

## Public-announcement controls

- `p AND NOT K[a]p` is true at the focus before it is publicly announced. The
  announcement leaves one world. Agent a then knows p, so the content just
  announced is false. Truthfulness does not imply post-announcement persistence.
- Everybody knows p at w0, but p is not common knowledge. The actual failure is
  the two-agent path `w0 -[a]-> w1 -[b]-> w2`, where p is false.
- Distributed knowledge of p can hold while neither agent individually knows p.
  Intersection of information relations is hypothetical pooling, not an actual
  communication event or common knowledge.
- A true atomic announcement makes that fact common in the retained model.
  Repeating the self-refuting announcement instead yields an empty restriction.
  A removed focus has null query values, never false or vacuously known.
- A classic three-observer repeated-ignorance model shrinks through 8, 7, 4 and
  1 supplied worlds. At the all-positive focus, none initially knows their own
  bit, and all three do after the final supplied announcement.

Eight controls also include disconnected common-knowledge components and a
false-at-focus announcement. Controls are developed synthetic models of
established phenomena, not empirical tests of real agents or people.

## Run

Python 3.10+, with no runtime dependencies. Node 22+ and Chrome for browser tests.

```sh
python -m pip install .
python -m epistemlab analyze docs/example.json > evidence.json
python -m epistemlab verify evidence.json
epistemlab verify evidence.json
python -m unittest discover -s tests -v
node --test tests/test_*.mjs tests/test_*.cjs
bash tools/check_wheel.sh
python -m http.server --directory docs 8000
```

Open the local server in a browser. Edit the complete supplied model, choose any
announcement round and inspect every formula/world pair. Exported browser JSON
is independently checked only when Python accepts the complete report.

## Independent report checks

The analyzer uses pointwise recursive semantics, explicit relation membership
and breadth-first paths. The independent checker uses truth-set algebra,
partition-block membership, a descending greatest fixed point for common
knowledge and Floyd-Warshall distances with greedy shortest-path reconstruction.
It imports neither analyzer nor subformula-discovery/path helpers. Shared strict
input validation is disclosed. It verifies every subformula and every modal
obligation at every retained world, not merely the displayed focus answers.

Local reproduction covers all 200 three-world/two-agent partition/valuation
models, brute simple-path checks, S5 introspection/group laws, 120 seeded nested
formula/update models, malformed input, evidence forgeries, and a disabled
analyzer. Eight full controls and all 200 small models agree exactly between
Python and JavaScript and pass the separate checker. Actual Chrome checks 24
control reports and 51 round snapshots at three widths, 383 formula/world
selections and 142 modal obligation selections, all eight exports, stale input,
invalid partitions, empty-model and eliminated-focus behavior and recovery.
Installed-wheel checks run all eight controls outside the checkout through both
module and console commands and reject forged evidence. Local success alone
is not proof that a deployed page works.

## Explicit scope

One to sixteen worlds, one to three supplied S5 agents, up to five atoms, six
queries and four sequential updates. Formula depth at most six, at most 128 total
supplied syntax nodes. No probability, private announcements, nested dynamic
announcement operators, event models, knowledge planning, strategic reasoning,
belief revision or automatic announcement search. A global empty restriction
is a diagnostic, not an epistemic state pointed at a real remaining world.

These semantics assume idealized logical knowledge. They do not describe what
real people or language models know, believe or can calculate. Model-specific
lost-truth witnesses do not classify a formula across every possible model.
Established epistemic/public-announcement logic and standard graph/fixed-point
methods, not a new algorithm. See [CONTRACT.md](CONTRACT.md) and
[SOURCES.md](SOURCES.md).

At v0.2, disclosure reproduction added seven Python tests (14 total), four Node semantic tests and actual-Chrome atlas checks (nine Node/Chrome tests total). All 200 small models are complete atlases (1,600 restriction records), with all Boolean truth functions of one atom checked independently; 45 seeded nested-goal atlases; eight developed controls/324 masks; every defining cube, obstruction, frontier and non-monotone witness; and installed 0.2.0 wheel execution through both command entry points for both control families. Actual atlas Chrome checks 24 responsive reports, 972 mask selections, 75 goal selections, 204 frontier/witness buttons, 2,596 subformula selections, 1,170 modal obligations, 87 world toggles and eight exports. Existing sequential-update checks remain included.

## S5 event-model product updates

The limits above describe the original sequential/public-disclosure inspectors. A separate [event update inspector](https://midya8.github.io/epistemlab/events.html) now distinguishes uncertainty about a world from uncertainty about which informational event occurred. In the original read/may-idle control, the receiver learns p while the observer does not know whether the receiver learned. Treating the event as public would incorrectly make that nested knowledge and common knowledge of p true.

Inspect every world/event candidate, precondition result, inherited valuation, product partition, both component conditions for every arrow, projected event/world possibilities, complete static modal atlas and separately labeled public-announcement counterfactual. Equal preconditions do not merge event copies. A nonempty global product need not contain the designated point; its post-event focus values are null rather than false or vacuous.

```sh
python -m epistemlab.event_cli event-request.json --output event.json
python -m epistemlab.event_cli event.json --verify
# Installed: epistemlab-events
```

[EVENTS.md](EVENTS.md) gives a runnable request, exact schema, product/S5 derivation, eight-source ledger, shared-infrastructure disclosure and reproducible checks. The new module/console CLI adds stdin, strict duplicate-key rejection, an input byte cap and atomic output. Older entrypoints and browser pages remain intact.

All 30 native tests (14 prior plus 16 new) and thirteen Node/Chrome tests pass locally. The complete native, independent relation-row checker and browser engines agree on 648 reports/2,552 candidates/5,984 relation obligations/9,208 before-after subformula sets; 1,072 altered noninput primitive leaves are rejected. An actual optional pyModelChecking 1.3.4 ordinary-CTL translation independently reconstructs products and checks 1,944 snapshots/13,812 sets/8,961 library calls. Chrome exercises all twelve controls at three widths, every candidate/relation/modal selection and twelve trusted completed downloads replayed natively. Fresh installed wheels retain both prior eight-control families and add twelve event controls through two entrypoints, eleven installed module origins and 24 forged atomic CLI checks plus 24 direct forgeries.

One to four worlds, one to three informational events, one to three S5 agents and at most twelve pairs. Facts do not change. This scope does not represent a fully unnoticed secret where outsiders falsely exclude the actual event: that needs a different directed event relation. No factual postconditions, probabilities, belief revision, action composition, dynamic operators, planning, human/LLM knowledge inference, novelty or scalability claim. Local success is not a substitute for checking the exact public source and deployment.
