# Boolean disclosure atlas contract

Version 0.2.0. Separate schema `epistemlab-disclosures-v1`; existing sequential evidence remains `epistemlab-v1`.

## Question and exact bound

Given one explicitly supplied original S5 model and up to six epistemic goal queries, which single truthful Boolean public announcements over the fixed supplied atom vocabulary make each goal true at the original focus after restriction?

This is bounded finite-model goal search, not an implementation of APAL, BAPAL, SOPAL, arbitrary announcement quantifiers, general epistemic planning, private actions, belief revision, speaker knowledge, natural-language knowledge inference or a new algorithm. Speakers and real disclosures are not represented. No actual person's knowledge, privacy or permission is inferred.

Input is the unchanged strict model request described in CONTRACT.md, with two additional restrictions: at most eight worlds and an empty `announcements` list. The starting round is always the supplied original model, never an ambiguous intermediate update. At most five atoms, three agents, six queries, formula depth six and 128 supplied syntax nodes. All K/E/D/C and Boolean goal semantics remain unchanged. Every query is a separate goal; use `and` explicitly for a joint goal.

## Enumerated objects and definability

Worlds are sorted. Bit i in mask m retains world i. All masks from zero through `2**len(worlds)-1` occur exactly once in numeric order, at most 256.

Each observed valuation class contains all supplied worlds agreeing on every supplied atom. Class signatures are Boolean lists in atom order, sorted lexicographically with false before true. Class worlds are sorted. A restriction is Boolean-definable precisely when it is a union of whole observed valuation classes:

- Necessity: any Boolean formula over these atoms agrees on equal valuations.
- Sufficiency: disjoin a full positive/negative literal cube for every retained observed valuation class.

This elementary truth-table construction is established propositional logic. With k observed classes there are exactly `2**k` definable restrictions and `2**(k-1)` focus-truthful Boolean disclosures. The fixed vocabulary matters. Fresh atoms or a larger vocabulary could change definability; an epistemic formula may distinguish worlds sharing their atomic valuation, but this atlas neither searches epistemic announcements nor asserts that every diagnostic restriction is epistemically definable.

## Evidence schema

The top-level exact keys are `schema`, `request`, `valuation_classes`, `records`, and `goals`. The complete original request is retained.

Each valuation class has `signature` and `worlds` as above.

Every record has exactly:

- `mask`: numeric subset identifier.
- `retained`: sorted retained worlds.
- `boolean_definable`: exact whole-class criterion, independent of focus survival or goal success.
- `dnf_cubes`: null when not definable; otherwise the sorted signature lists of retained classes. Each signature denotes the conjunction of all supplied atoms with the indicated polarity. The whole list denotes their disjunction. Empty cube list is falsehood; a zero-atom empty signature is an empty conjunction, true. This representation is not the bounded request formula AST, a minimized formula, or a statement about unobserved valuations. It defines exactly this retained set in this supplied model.
- `obstruction`: null when definable; otherwise `{kept, removed}`, the lexicographically first retained/removed world pair with identical atomic valuation. This is an actual impossibility witness for Boolean definability over the fixed atoms.
- `focus_survives`: whether the original focus is retained.
- `truth_sets`: complete sorted post-restriction truth sets for every supplied query, in query order. Each is empty in the empty restriction.
- `values`: post-restriction query values at the original focus. All are null if the focus was removed. They are never false or vacuously true just because the focus was removed.

Nonempty restrictions preserve valuations and restrict each agent's equivalence relation. Restricted partition blocks are re-sorted before validation because removing the first member can change their order. Empty restrictions are diagnostic objects without a pointed epistemic state, not truthful actions at the focus.

Every goal summary has exactly:

- `formula`: original query.
- `successes`: every mask that is Boolean-definable, retains the original focus, and makes this goal true afterwards. Sorted numeric order. No probability, speaker-knowledge or undisclosed execution condition is assumed.
- `maximal`: every inclusion-maximal retained success. No strict superset among `successes` may exist. All proper supersets are checked, not only one-bit neighbours: epistemic goals can be non-monotone.
- `maximum`: every successful mask retaining the largest number of worlds.
- `maximum_retained`: that count, or null when there is no success.
- `nonboolean_successes`: every mask retaining the focus and making the goal true but not Boolean-definable. They are diagnostic what-if successes, not available Boolean announcements and not APAL solutions.
- `loss_witness`: null unless a successful Boolean mask has a strict retained subset that is Boolean-definable, retains the focus and makes the goal false. Otherwise `{weaker, stronger}`, the first numeric-mask pair. Stronger means fewer retained worlds here, not more effective at meeting a goal.

Maximal is not maximum. Neither objective minimizes syntax size, total literals, number of eliminated worlds on a probability scale, semantic information, privacy loss or real disclosure risk. Counting supplied worlds is an explicit finite combinatorial objective only.

## Developed controls

Eight controls cover 324 restriction records and 25 separate goals.

1. Default four-world model: `K[a]p OR K[a]q`. Successful masks are 1, 3, 5, 9, 13. Inclusion-maximal masks 3 and 13 retain two and three worlds; only 13 is maximum-retained. Full mask 15 fails.
2. Equal-valuation obstruction: focus goal `K[a]p AND NOT K[b]p`. Diagnostic masks 9 and 11 succeed; no Boolean-definable truthful disclosure succeeds. For mask 9, retained w0 and removed w1 both satisfy p, so the restriction cannot be defined by a Boolean formula over p. The false-valued class is split too; only the canonical first pair is reported.
3. Two-world ignorance: mask 3 preserves `NOT K[a]p`, while its stronger truthful Boolean mask 1 destroys it. No monotonic pruning is valid in general.
4. Common-knowledge chain from the original controls, now with all eight restrictions.
5. Distributed-knowledge contrast from the original controls, all sixteen restrictions.
6. Three-observer model with all 256 one-shot restrictions, not sequential or adaptive planning.
7. No atoms: only falsehood or tautology can define a restriction; the two equal-valuation worlds cannot be separated.
8. False-at-focus atomic goal: truthful restriction cannot change the retained world's fixed valuation to make p true.

These are developed synthetic controls of established concepts, not empirical studies. Their complete reports are recreated in Python, JavaScript and the separate checker.

## Independent reconstruction and browser evidence

Generator: enumerate bit masks, detect same-valuation split pairs, use pointwise recursive knowledge semantics per restriction, and compare successful masks directly for full strict-superset maximality.

Checker: enumerate world combinations and independently construct every union of valuation classes; use truth-set algebra, common-knowledge fixed points and Floyd-Warshall path semantics per restricted model; compare retained sets for all strict supersets. It imports neither atlas generator nor pointwise analyzer. Shared strict input parsing and the established independent sequential checker are disclosed. Verification compares exact canonical serialized evidence, including schema, ordering, Boolean versus numeric JSON types, all cubes, obstructions, nulls, truth sets, frontiers and witnesses. It fails closed on malformed evidence.

The UI may inspect the complete restricted epistemic model even for a diagnostic non-Boolean mask. It labels that case explicitly. If the original focus was removed, the inspector may select another surviving world, but never attributes that world's truth to the eliminated focus. Every modal subformula shows all required worlds, canonical shortest paths and a shortest actual failure when one exists. This detail is reconstructed by the existing analyzer; actual browser tests compare it against the independent checker for all masks.

Exporting JSON does not itself independently verify it. Run `epistemlab verify-disclosures atlas.json` or `python -m epistemlab verify-disclosures atlas.json`.

## Reproduction

The full suite contains 13 Python tests, including six atlas tests. All 200 three-world/two-agent partition-and-valuation models are checked as complete atlases, 1,600 restriction records, with independent enumeration of all four one-atom Boolean truth functions. Forty-five seeded nested-goal atlases, strict forgeries, disabled-generator verification, malformed models and ambiguous prior-update anchors are checked. Eight Node/actual-Chrome tests include the original four checks and the new complete-atlas parity, independent small-model parity, strict limits and real UI tests.

Actual atlas Chrome checks 24 reports at 1280, 390 and 320 pixels, all 972 responsive mask selections, 75 goal selections, 204 frontier/witness buttons, 2,596 subformula selections including 1,170 modal obligations, all 87 responsive world toggles, eight exports, stale/invalid/prior-anchor/empty recovery. Existing sequential controls remain fully tested. Installed 0.2.0 wheel reproduction runs outside the checkout through both module/console entry points for both eight-control families, with forged evidence rejection.

Standard references and their directly read scope are in SOURCES.md. These are implementation checks, not a new theorem or scalable-solver claim.
