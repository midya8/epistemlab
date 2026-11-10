# Prior work and boundaries

Checked November 9, 2026. This is a bounded implementation of established
multi-agent epistemic/public-announcement semantics, not a new formalism or
algorithm. Code, text and control models were developed here. The Moore sentence,
group distinctions and muddy-children phenomenon are established examples, not
new discoveries, datasets or studies of real human reasoning.

1. Open Logic Project, _Semantics of Public Announcement Logic_, revision
   9620cc7, July 12, 2026, CC-BY teaching text.
   https://builds.openlogicproject.org/content/applied-modal-logic/epistemic-logic/public-announcement-logic-semantics.pdf
   Directly read: pointwise semantics, restriction to the prior truth set,
   unchanged retained valuations and Moore-style self-refutation. The text
   distinguishes dynamic-box vacuity from an actual truthful update. We do not
   implement nested dynamic box operators or copy its figure.
2. Marek Sergot, _Epistemic Logic and Common Knowledge_, Imperial College,
   Autumn 2008 lecture notes.
   https://www.doc.ic.ac.uk/~mjs/teaching/ModalTemporal499/Epistemic_499_v0809_2up.pdf
   Directly read S5, logical omniscience, union/intersection group relations and
   common accessibility closure. Grounding: K/E/D/C distinctions and the
   idealized model boundary, not actual human computation or psychology.
3. H.P. van Ditmarsch, W. van der Hoek and B.P. Kooi, _Playing cards with
   Hintikka: An introduction to dynamic epistemic logic_, Australasian Journal
   of Logic, October 6, 2005.
   https://ojs.victoria.ac.nz/ajl/article/view/1776
   Publisher metadata and abstract directly read, not the full paper. Used for
   historical introduction and unsuccessful-update attribution only.
4. Sanchit Saraf and Sumit Sourabh, _Characterizing Successful Formulas: the
   Multi-agent Case_, author manuscript, arXiv 1209.0935.
   https://ar5iv.labs.arxiv.org/html/1209.0935
   Directly read introduction, semantics, definition of successful formulas and
   Moore example. Success is validity across models; our lost-truth evidence
   concerns the supplied finite model only. We do not claim that the paper's
   historical open-problem status remains current or implement its classification.
5. Rustam Galimullin and Thomas Agotnes, _Quantified Announcements and Common
   Knowledge_, AAMAS 2021, May 3-7, 2021.
   https://www.ifaamas.org/Proceedings/aamas2021/pdfs/p528.pdf
   Directly read introduction, semantics and sharing-common-knowledge discussion.
   Grounding: arbitrary epistemic announcements need not make their content
   common knowledge. Quantified announcements, group actions and epistemic
   planning are explicitly not implemented.
6. _Knowledge Within a Group_, University of Groningen multi-agent systems,
   Unit 2, 2009 course file.
   https://www.ai.rug.nl/mas/documents/bok2-2009.pdf
   Directly inspected group/common/distributed semantics and muddy-children
   modelling. Grounding: ideal information pooling differs from communication;
   repeated-ignorance example is classic, not an empirical communication claim.

Confidence high in used definitions and source identity. These are academic and
teaching sources, not current software/pricing claims. BFS, Floyd-Warshall,
truth-set algebra and finite fixed points are standard methods. Separate full
reconstruction is an implementation property, not a new theorem. The global
empty-restriction diagnostics and null eliminated-focus values are explicit
interface choices, not pointed truth claims in an empty model.

## Boolean disclosure atlas, checked November 9, 2026

7. Hans van Ditmarsch and Tim French, _Quantifying over Boolean announcements_, Logical Methods in Computer Science 18(1:20), January 21, 2022.
   https://lmcs.episciences.org/8991
   https://lmcs.episciences.org/8991/pdf
   Publisher metadata/abstract and paper introduction/Boolean-language semantics directly read. Grounds the distinction between Boolean and arbitrary epistemic announcements. Our finite truth-set enumeration is not a BAPAL implementation, proof of satisfiability/decidability, or an update on historical open questions. Only the supplied finite atom vocabulary is available; no fresh atoms.
8. _Dynamic Epistemic Logic, Appendix E: Technical details of Public Announcement Logic_, Stanford Encyclopedia of Philosophy.
   https://plato.stanford.edu/entries/dynamic-epistemic/appendix-E-PAL.html
   Directly read the model-restriction semantics, arbitrary-announcement section and distinction between post-update and pre-update knowledge. Grounds the boundary: an arbitrary subset restriction is not automatically a definable announcement, and quantified logic is not this bounded goal search.
9. Francesco Belardinelli, Hans van Ditmarsch and Wiebe van der Hoek, _Second-order Propositional Announcement Logic_, AAMAS 2016, May 9-13, Singapore.
   https://www.doc.ic.ac.uk/~fbelard/Documents/aamas2016.pdf
   Introduction and formal framework directly read. Grounds the distinction from quantifying over arbitrary new propositional valuations. Our canonical cubes use only fixed supplied atoms and cannot split equal observed valuations. SOPAL, APAL, general knowability and strategic games are not implemented.
10. Hans van Ditmarsch, _To Be Announced_, author manuscript metadata/abstract only.
   https://arxiv.org/abs/2004.05802
   Directly read abstract and version metadata. Survey context only; not evidence for a current complexity or open-problem claim. DOI fetches returned no content, so no assertion depends on those inaccessible pages.

The finite Boolean-definability criterion is elementary: Boolean formulas agree on identical atomic valuations, and every union of observed valuation classes is defined by the disjunction of its full valuation cubes. This is a standard propositional truth-table construction, not a new theorem. Inclusion-maximal and maximum-retained subsets are explicit finite enumeration objectives, not minimum formula size, minimum leakage, privacy guarantees, speaker knowledge or user-approved real-world disclosures.
