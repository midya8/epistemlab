# EpistemLab

True when said. False after heard.

A dependency-free finite multi-agent knowledge workbench. Inspect every supplied
world, every information partition, every subformula truth set and every public
announcement restriction. A separate checker reconstructs the complete report.
The browser computes these experiments locally after the static assets load. No model, backend, or paid API is called.
No model API, training, private data or inferred human knowledge.

## Boolean disclosure atlas

The separate [live disclosure atlas](https://midya8.github.io/epistemlab/disclosures.html) enumerates every world restriction for up to eight worlds, but counts only focus-truthful Boolean-definable announcements as solutions. Equal-valuation worlds cannot be separated by any Boolean formula over the supplied atoms. Actual obstruction pairs and canonical defining DNF cubes expose the distinction.

The default control has two inclusion-maximal solutions retaining two and three worlds; only the latter is maximum-retained. Another has two diagnostic successes but no Boolean solution. More disclosure can destroy an ignorance goal. These are exact supplied-model results, not minimum formula size, information leakage, general planning or APAL/BAPAL logic. See [DISCLOSURES.md](DISCLOSURES.md) for the separate schema and contract.

For a runnable example, save one control request first:

```sh
python -c "import json;json.dump(json.load(open('docs/disclosure-controls.json'))[0]['request'],open('disclosure-request.json','w'))"
epistemlab disclosures disclosure-request.json > atlas.json
epistemlab verify-disclosures atlas.json
```

## Contrasts that separate the claims

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

## Two reconstructions

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

Disclosure reproduction adds seven Python tests (14 total), four Node semantic tests and actual-Chrome atlas checks (nine Node/Chrome tests total). All 200 small models are complete atlases (1,600 restriction records), with all Boolean truth functions of one atom checked independently; 45 seeded nested-goal atlases; eight developed controls/324 masks; every defining cube, obstruction, frontier and non-monotone witness; and installed 0.2.0 wheel execution through both command entry points for both control families. Actual atlas Chrome checks 24 responsive reports, 972 mask selections, 75 goal selections, 204 frontier/witness buttons, 2,596 subformula selections, 1,170 modal obligations, 87 world toggles and eight exports. Existing sequential-update checks remain included.
