const key = (f) => JSON.stringify(f),
  cmp = (a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
function parse(r) {
  const obj = (x) => x && typeof x === "object" && !Array.isArray(x),
    keys = (x, ks) =>
      obj(x) && Object.keys(x).sort().join("|") === [...ks].sort().join("|");
  const names = (xs, cap, empty = false) => {
    if (
      !Array.isArray(xs) ||
      xs.length < (empty ? 0 : 1) ||
      xs.length > cap ||
      xs.some(
        (x) => typeof x !== "string" || !/^[a-z][a-z0-9_]{0,11}$/.test(x),
      ) ||
      key(xs) !== key([...new Set(xs)].sort())
    )
      throw Error(
        "Names must be unique sorted short lowercase identifiers within the bound",
      );
  };
  if (
    !keys(r, [
      "worlds",
      "atoms",
      "valuation",
      "partitions",
      "focus",
      "queries",
      "announcements",
    ])
  )
    throw Error(
      "Expected worlds, atoms, valuation, partitions, focus, queries and announcements only",
    );
  names(r.worlds, 16);
  names(r.atoms, 5, true);
  if (!keys(r.valuation, r.worlds))
    throw Error("Every supplied world needs exactly one valuation");
  for (const ps of Object.values(r.valuation)) {
    names(ps, 5, true);
    if (ps.some((p) => !r.atoms.includes(p)))
      throw Error("Unknown valuation atom");
  }
  if (!obj(r.partitions)) throw Error("Expected information partitions");
  const agents = Object.keys(r.partitions).sort();
  names(agents, 3);
  for (const blocks of Object.values(r.partitions)) {
    if (
      !Array.isArray(blocks) ||
      blocks.length < 1 ||
      blocks.length > r.worlds.length
    )
      throw Error("Partition blocks must cover the supplied worlds");
    for (const b of blocks) names(b, 16);
    if (
      key(blocks.flat().sort()) !== key(r.worlds) ||
      key(blocks) !== key([...blocks].sort(cmp))
    )
      throw Error(
        "Each agent partition must cover every world exactly once, with sorted blocks",
      );
  }
  if (typeof r.focus !== "string" || !r.worlds.includes(r.focus))
    throw Error("Focus must name a supplied world");
  if (
    !Array.isArray(r.queries) ||
    r.queries.length < 1 ||
    r.queries.length > 6 ||
    !Array.isArray(r.announcements) ||
    r.announcements.length > 4
  )
    throw Error("One to six queries and at most four announcements");
  let budget = 0;
  const formula = (f, d = 0) => {
    if (d > 6 || ++budget > 128)
      throw Error("Formula bound: depth six and 128 total syntax nodes");
    if (!Array.isArray(f) || !f.length || typeof f[0] !== "string")
      throw Error("Expected a JSON array formula");
    const op = f[0];
    if (["true", "false"].includes(op) && f.length === 1) return;
    if (op === "atom" && f.length === 2 && r.atoms.includes(f[1])) return;
    if (op === "not" && f.length === 2) {
      formula(f[1], d + 1);
      return;
    }
    if (["and", "or"].includes(op) && f.length === 3) {
      formula(f[1], d + 1);
      formula(f[2], d + 1);
      return;
    }
    if (op === "K" && f.length === 3 && agents.includes(f[1])) {
      formula(f[2], d + 1);
      return;
    }
    if (["E", "D", "C"].includes(op) && f.length === 3) {
      names(f[1], 3);
      if (f[1].some((a) => !agents.includes(a)))
        throw Error("Unknown group agent");
      formula(f[2], d + 1);
      return;
    }
    throw Error("Unknown formula, atom, agent, arity or nonempty group");
  };
  for (const f of [...r.queries, ...r.announcements]) formula(f);
  return agents;
}
export function analyze(request) {
  const agents = parse(request),
    forms = new Map();
  const visit = (f) => {
    forms.set(key(f), f);
    if (f[0] === "not") visit(f[1]);
    else if (["and", "or"].includes(f[0])) {
      visit(f[1]);
      visit(f[2]);
    } else if (["K", "E", "D", "C"].includes(f[0])) visit(f[2]);
  };
  [...request.queries, ...request.announcements].forEach(visit);
  const fs = [...forms]
      .sort(
        (a, b) =>
          a[0].length - b[0].length || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
      )
      .map((x) => x[1]),
    blocks = Object.fromEntries(
      agents.map((a) => [
        a,
        Object.fromEntries(
          request.partitions[a].flatMap((b, i) => b.map((w) => [w, i])),
        ),
      ]),
    );
  let active = [...request.worlds];
  const snapshots = [],
    updates = [];
  function snapshot() {
    const memo = new Map();
    function paths(f, w) {
      const op = f[0],
        group = op === "K" ? [f[1]] : f[1],
        neighbours = (s) =>
          active.flatMap((t) => {
            const labels = group.filter((a) => blocks[a][s] === blocks[a][t]);
            return (op === "D" ? labels.length === group.length : labels.length)
              ? [[t, op === "D" ? group : [labels[0]]]]
              : [];
          });
      if (op !== "C")
        return neighbours(w).map(([t, label]) => ({
          worlds: t === w ? [w] : [w, t],
          agents: t === w ? [] : [label],
        }));
      const found = new Map([[w, { worlds: [w], agents: [] }]]),
        queue = [w];
      for (let h = 0; h < queue.length; h++)
        for (const [t, label] of neighbours(queue[h]))
          if (!found.has(t)) {
            const p = found.get(queue[h]);
            found.set(t, {
              worlds: [...p.worlds, t],
              agents: [...p.agents, label],
            });
            queue.push(t);
          }
      return [...found].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map((x) => x[1]);
    }
    function truth(f, w) {
      const k = key([f, w]);
      if (memo.has(k)) return memo.get(k);
      const op = f[0];
      let v;
      if (op === "true") v = true;
      else if (op === "false") v = false;
      else if (op === "atom") v = request.valuation[w].includes(f[1]);
      else if (op === "not") v = !truth(f[1], w);
      else if (op === "and") v = truth(f[1], w) && truth(f[2], w);
      else if (op === "or") v = truth(f[1], w) || truth(f[2], w);
      else v = paths(f, w).every((p) => truth(f[2], p.worlds.at(-1)));
      memo.set(k, v);
      return v;
    }
    const table = fs.map((f) => ({
      formula: f,
      truth: active.filter((w) => truth(f, w)),
      obligations: ["K", "E", "D", "C"].includes(f[0])
        ? active.map((w) => {
            const ps = paths(f, w),
              bad = ps
                .filter((p) => !truth(f[2], p.worlds.at(-1)))
                .sort(
                  (a, b) =>
                    a.worlds.length - b.worlds.length ||
                    cmp(a.worlds, b.worlds) ||
                    cmp(a.agents, b.agents),
                );
            return {
              world: w,
              possible: ps.map((p) => p.worlds.at(-1)),
              paths: ps,
              failure: bad[0] || null,
            };
          })
        : [],
    }));
    return {
      round: snapshots.length,
      worlds: [...active],
      partitions: Object.fromEntries(
        agents.map((a) => [
          a,
          request.partitions[a]
            .map((b) => b.filter((w) => active.includes(w)))
            .filter((b) => b.length),
        ]),
      ),
      focus_status: active.includes(request.focus) ? "present" : "eliminated",
      queries: request.queries.map((f) => ({
        formula: f,
        value: active.includes(request.focus) ? truth(f, request.focus) : null,
      })),
      table,
    };
  }
  snapshots.push(snapshot());
  for (const f of request.announcements) {
    const before = [...active];
    active = snapshots
      .at(-1)
      .table.find((r) => key(r.formula) === key(f)).truth;
    snapshots.push(snapshot());
    const after_true = snapshots
      .at(-1)
      .table.find((r) => key(r.formula) === key(f)).truth;
    updates.push({
      formula: f,
      before,
      retained: [...active],
      removed: before.filter((w) => !active.includes(w)),
      after_true,
      lost_truth: active.filter((w) => !after_true.includes(w)),
      focus_survived: active.includes(request.focus),
    });
  }
  return {
    schema: "epistemlab-v1",
    request,
    subformula_count: fs.length,
    snapshots,
    updates,
  };
}
