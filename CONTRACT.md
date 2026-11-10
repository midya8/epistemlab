# Finite supplied S5 knowledge contract

## Input

Exactly `worlds`, `atoms`, `valuation`, `partitions`, `focus`, `queries` and
`announcements`. World, atom and agent identifiers are unique sorted lowercase
ASCII names, at most twelve characters. Worlds: one to sixteen. Atoms: zero to
five. Agents: one to three. Every world has exactly one sorted subset of the
supplied atoms as its valuation. Every agent supplies sorted nonempty disjoint
blocks covering every world exactly once. Two worlds are related for that agent
iff they belong to the same block. Thus every supplied relation is an S5
reflexive, symmetric and transitive equivalence relation, not arbitrary belief.
The focus must name an original world. Queries: one to six. Announcements: zero
to four, evaluated sequentially in the current restricted model.

## JSON formulas

- `["true"]`, `["false"]`, `["atom", "p"]`.
- `["not", formula]`, `["and", formula, formula]`, `["or", formula, formula]`.
- `["K", "a", formula]`: agent a knows formula.
- `["E", ["a", "b"], formula]`: everybody in the nonempty named group knows.
- `["D", ["a", "b"], formula]`: distributed knowledge, relation intersection.
- `["C", ["a", "b"], formula]`: common knowledge, reflexive transitive closure
  of the relation union.

Groups must be sorted nonempty subsets of supplied agents. Unknown operators,
extra arguments and unknown names are errors. Max depth six with root depth
zero, and 128 total syntax nodes across all supplied query/announcement trees.
No dynamic box formula or quantified/group announcement operator is in this
language. Separate sequential model restriction is the only update operation.

## Truth and obligation evidence

At a remaining world, K requires truth at every same-block world for its agent.
E requires truth at every world related by any member's relation. D requires
truth at every world related by all members simultaneously. C requires truth at
every world reachable by any finite chain in the group's relation union.
Reflexivity includes the current world in every obligation set.

Every distinct supplied subformula has its full truth set in every snapshot.
Every modal subformula has one obligation per remaining world, listing all
required worlds, one canonical shortest path to each, and a shortest path to a
false-child world if the modal formula fails. Paths use a list of worlds and a
list of agent-label groups for the links. K/E/C use one agent per link, choosing
the first matching sorted agent. D uses the full group on each direct link:
that edge must satisfy all of the group's relations. A self path has zero links.
C uses shortest BFS order with worlds lexicographic; other modal paths are
direct. Among failing targets, choose shortest path then lexicographic world
sequence and agent-label sequence. These are actual counterexamples or complete
finite obligations, not informal claims about real people.

Every snapshot lists the exact remaining world set, restricted partition blocks,
focus presence, full query values, and the complete subformula/obligation table.
The original request is retained unchanged. Snapshot zero is the original model.

## Public restriction and unsuccessful content

For each supplied announcement f, retain exactly the worlds where f was true in
the previous snapshot. Restrict every relation and valuation to those worlds.
Re-evaluate every supplied subformula in the new model, including f. Record the
prior, retained, removed, after-true and lost-truth worlds. Lost truth means f
was true at a retained world before, but false there after this specific update.
This is a model-specific witness, not a general validity or syntactic
classification of successful formulas.

Truthful public announcement at a pointed focus requires that focus to survive.
A false-at-focus restriction is displayed for diagnostic purposes, explicitly
marked not executable as a truthful announcement at that focus. If the focus is
removed, all focus query values are null, not false and not vacuously true.
An empty model has no remaining pointed worlds and all truth/obligation sets
are empty. Later empty restrictions remain empty. This diagnostic is not an
assertion that an impossible announcement actually took place.

The logical dynamic box `[f]g` is not implemented: its vacuity when f is false
must not be confused with an actual announcement or with the null focus status.
Valuations of retained atoms never change. Removing worlds can change modal
truth and ignorance. Announcing an atomic fact can make it common; announcing
an arbitrary epistemic formula need not make its content persist.

## Certificate and independent reconstruction

Schema: `epistemlab-v1`. All structure, types, truth sets, paths, query values,
round indices, original request and update witnesses must match the complete
separate reconstruction. Boolean/integer substitutions, missing/extra fields,
changed orderings, removed subformulas and forged lost-truth witnesses fail.
The checker shares only strict model validation with the generator. It uses its
own subformula discovery, set semantics, block operations, descending greatest
fixed point for C, distance reconstruction and model updates. It imports no
analyzer/path helper. JavaScript is a matching engine, not that checker.

The finite bounds are part of the contract, not a performance claim. There is
no learned reasoning, implicit-model discovery, model checking over arbitrary
infinite structures, private communication, action models, belief revision or
knowledge planning. All semantics and graph methods are established prior work.

## Separate Boolean disclosure atlas

This contract still describes the sequential-update workbench and `epistemlab-v1`. The optional bounded disclosure surface, `epistemlab-disclosures-v1`, has its own [DISCLOSURES.md](DISCLOSURES.md). It adds a complete finite Boolean-disclosure search without changing the original schema or claiming general epistemic planning.
