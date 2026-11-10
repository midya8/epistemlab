import { analyze } from "./engine.js";
const encode = JSON.stringify,
  same = (a, b) => encode(a) === encode(b);
export function updateEvents(raw) {
  const r = structuredClone(raw),
    obj = (x) => x && typeof x === "object" && !Array.isArray(x),
    keys = (x, k) => obj(x) && same(Object.keys(x).sort(), [...k].sort());
  if (!keys(r, ["model", "action"]))
    throw Error("Expected model and action only");
  const m = r.model,
    a = r.action;
  analyze(m);
  if (m.worlds.length > 4 || m.queries.length > 3 || m.announcements.length)
    throw Error(
      "At most four worlds, three queries and no sequential announcements",
    );
  if (
    !keys(a, ["events", "preconditions", "partitions", "actual"]) ||
    !Array.isArray(a.events) ||
    a.events.length < 1 ||
    a.events.length > 3
  )
    throw Error(
      "One to three events with preconditions, partitions and actual",
    );
  const agents = Object.keys(m.partitions).sort(),
    es = a.events;
  if (!keys(a.preconditions, es) || !keys(a.partitions, agents))
    throw Error("Event keys/agents must match exactly");
  analyze({
    worlds: es,
    atoms: [],
    valuation: Object.fromEntries(es.map((e) => [e, []])),
    partitions: a.partitions,
    focus: a.actual,
    queries: [["true"]],
    announcements: [],
  });
  const roots = [...m.queries, ...es.map((e) => a.preconditions[e])];
  analyze({ ...m, queries: roots, announcements: [a.preconditions[a.actual]] });
  const before = analyze({ ...m, queries: roots }).snapshots[0],
    pre = Object.fromEntries(
      es.map((e) => [
        e,
        before.table.find((t) => same(t.formula, a.preconditions[e])).truth,
      ]),
    ),
    candidates = [];
  m.worlds.forEach((w, i) =>
    es.forEach((e, j) =>
      candidates.push({
        id: "x" + String(i * es.length + j).padStart(2, "0"),
        world: w,
        event: e,
        allowed: pre[e].includes(w),
      }),
    ),
  );
  const kept = candidates.filter((p) => p.allowed),
    ids = kept.map((p) => p.id),
    relations = [],
    parts = {};
  const br = (agent, p, q) =>
      m.partitions[agent].some(
        (b) => b.includes(p.world) && b.includes(q.world),
      ),
    er = (agent, p, q) =>
      a.partitions[agent].some(
        (b) => b.includes(p.event) && b.includes(q.event),
      );
  for (const agent of agents) {
    const parent = ids.map((_, i) => i),
      find = (i) => {
        while (parent[i] !== i) i = parent[i];
        return i;
      };
    for (let i = 0; i < ids.length; i++)
      for (let j = 0; j < ids.length; j++) {
        const w = br(agent, kept[i], kept[j]),
          e = er(agent, kept[i], kept[j]);
        relations.push({
          agent,
          source: ids[i],
          target: ids[j],
          world_related: w,
          event_related: e,
          related: w && e,
        });
        if (w && e) parent[find(j)] = find(i);
      }
    const groups = new Map();
    ids.forEach((id, i) => {
      const k = find(i);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(id);
    });
    parts[agent] = [...groups.values()].sort((a, b) =>
      encode(a) < encode(b) ? -1 : 1,
    );
  }
  const p = candidates.find((p) => p.world === m.focus && p.event === a.actual),
    focus = p.allowed ? p.id : null,
    valuation = Object.fromEntries(
      kept.map((p) => [p.id, [...m.valuation[p.world]]]),
    );
  let after;
  if (ids.length)
    after = analyze({
      worlds: ids,
      atoms: m.atoms,
      valuation,
      partitions: parts,
      focus: focus || ids[0],
      queries: roots,
      announcements: [],
    }).snapshots[0];
  else {
    after = analyze({ ...m, queries: roots, announcements: [["false"]] })
      .snapshots[1];
    after.round = 0;
    after.table = after.table.filter((t) =>
      before.table.some((z) => same(z.formula, t.formula)),
    );
  }
  if (focus === null) {
    after.focus_status = "not_executable";
    after.queries = roots.map((formula) => ({ formula, value: null }));
  }
  const views = [];
  for (const p of kept)
    for (const agent of agents) {
      const possible = parts[agent].find((b) => b.includes(p.id)),
        qs = kept.filter((q) => possible.includes(q.id));
      views.push({
        pair: p.id,
        agent,
        possible,
        worlds: [...new Set(qs.map((q) => q.world))].sort(),
        events: [...new Set(qs.map((q) => q.event))].sort(),
      });
    }
  const changes = after.table.map((t) => {
    const old = before.table.find((z) => same(z.formula, t.formula)).truth;
    return {
      formula: t.formula,
      pairs: kept.map((p) => ({
        pair: p.id,
        before: old.includes(p.world),
        after: t.truth.includes(p.id),
        changed: old.includes(p.world) !== t.truth.includes(p.id),
      })),
    };
  });
  const pub = analyze({
    ...m,
    queries: roots,
    announcements: [a.preconditions[a.actual]],
  });
  return {
    schema: "epistemlab-events-v1",
    request: r,
    before,
    preconditions: es.map((event) => ({
      event,
      formula: a.preconditions[event],
      truth: pre[event],
    })),
    candidates,
    point: {
      world: m.focus,
      event: a.actual,
      pair: focus,
      executable: focus !== null,
    },
    product: { worlds: ids, valuation, partitions: parts },
    relations,
    views,
    after,
    changes,
    public_counterfactual: {
      snapshot: pub.snapshots[1],
      update: pub.updates[0],
    },
    comparisons: m.queries.map((formula, i) => ({
      formula,
      before: before.queries[i].value,
      product: after.queries[i].value,
      public: pub.snapshots[1].queries[i].value,
    })),
  };
}
