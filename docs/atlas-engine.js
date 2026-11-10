import { analyze } from "./engine.js";
export function atlas(request) {
  analyze(request);
  const { worlds, atoms, partitions, focus, queries } = request;
  if (worlds.length > 8 || request.announcements.length)
    throw Error(
      "Disclosure atlas requires at most eight worlds and no prior announcements",
    );
  const sig = (w) => atoms.map((a) => request.valuation[w].includes(a)),
    keys = [...new Set(worlds.map((w) => JSON.stringify(sig(w))))].sort();
  const valuation_classes = keys.map((k) => ({
    signature: JSON.parse(k),
    worlds: worlds.filter((w) => JSON.stringify(sig(w)) === k),
  }));
  const records = [];
  for (let mask = 0; mask < 2 ** worlds.length; mask++) {
    const retained = worlds.filter((w, i) => mask & (1 << i)),
      pairs = retained.flatMap((a) =>
        worlds
          .filter(
            (b) =>
              !retained.includes(b) &&
              JSON.stringify(sig(a)) === JSON.stringify(sig(b)),
          )
          .map((b) => [a, b]),
      );
    const obstruction = pairs.length
      ? { kept: pairs[0][0], removed: pairs[0][1] }
      : null;
    const dnf_cubes = pairs.length
      ? null
      : valuation_classes
          .filter((c) => retained.includes(c.worlds[0]))
          .map((c) => c.signature);
    let truth_sets = queries.map(() => []);
    if (retained.length) {
      const r = {
        ...request,
        worlds: retained,
        valuation: Object.fromEntries(
          retained.map((w) => [w, request.valuation[w]]),
        ),
        focus: retained[0],
        partitions: Object.fromEntries(
          Object.keys(partitions).map((a) => [
            a,
            partitions[a]
              .map((b) => b.filter((w) => retained.includes(w)))
              .filter((b) => b.length)
              .sort((x, y) => (JSON.stringify(x) < JSON.stringify(y) ? -1 : 1)),
          ]),
        ),
      };
      const s = analyze(r).snapshots[0];
      truth_sets = queries.map(
        (q) =>
          s.table.find((t) => JSON.stringify(t.formula) === JSON.stringify(q))
            .truth,
      );
    }
    const focus_survives = retained.includes(focus);
    records.push({
      mask,
      retained,
      boolean_definable: !pairs.length,
      dnf_cubes,
      obstruction,
      focus_survives,
      truth_sets,
      values: truth_sets.map((t) =>
        focus_survives ? t.includes(focus) : null,
      ),
    });
  }
  const goals = queries.map((formula, q) => {
    const diagnostic = records
        .filter((r) => r.values[q] === true)
        .map((r) => r.mask),
      successes = diagnostic.filter((m) => records[m].boolean_definable);
    const maximal = successes.filter(
      (m) => !successes.some((n) => m !== n && (m & n) === m),
    );
    const maximum_retained = successes.length
      ? Math.max(...successes.map((m) => records[m].retained.length))
      : null;
    const maximum = successes.filter(
      (m) => records[m].retained.length === maximum_retained,
    );
    let loss_witness = null;
    for (const m of successes) {
      for (const r of records) {
        if (
          r.mask !== m &&
          (m & r.mask) === r.mask &&
          r.boolean_definable &&
          r.focus_survives &&
          r.values[q] === false
        ) {
          loss_witness = { weaker: m, stronger: r.mask };
          break;
        }
      }
      if (loss_witness) break;
    }
    return {
      formula,
      successes,
      maximal,
      maximum,
      maximum_retained,
      nonboolean_successes: diagnostic.filter((m) => !successes.includes(m)),
      loss_witness,
    };
  });
  return {
    schema: "epistemlab-disclosures-v1",
    request,
    valuation_classes,
    records,
    goals,
  };
}
