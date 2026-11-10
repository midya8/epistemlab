import { atlas } from "./atlas-engine.js";
import { analyze } from "./engine.js";
const $ = (id) => document.getElementById(id),
  el = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  },
  same = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  set = (ws) => (ws.length ? "{" + ws.join(", ") + "}" : "∅");
const fmt = (f) =>
  f[0] === "atom"
    ? f[1]
    : f[0] === "true"
      ? "⊤"
      : f[0] === "false"
        ? "⊥"
        : f[0] === "not"
          ? "¬(" + fmt(f[1]) + ")"
          : ["and", "or"].includes(f[0])
            ? "(" +
              fmt(f[1]) +
              (f[0] === "and" ? " ∧ " : " ∨ ") +
              fmt(f[2]) +
              ")"
            : f[0] +
              "[" +
              (f[0] === "K" ? f[1] : f[1].join(",")) +
              "](" +
              fmt(f[2]) +
              ")";
const cube = (bits, atoms) =>
    bits.length
      ? bits.map((b, i) => (b ? "" : "¬") + atoms[i]).join(" ∧ ")
      : "⊤",
  route = (p) =>
    p.worlds
      .map((w, i) => (i ? `-[${p.agents[i - 1].join("&")}]-> ${w}` : w))
      .join(" ");
let report = null,
  selected = 0,
  snapshot = null,
  controls = [];
function clear(message) {
  report = null;
  snapshot = null;
  window.disclosureReport = null;
  window.disclosureSelection = null;
  $("output").hidden = true;
  $("download").disabled = true;
  $("status").textContent = message;
}
function card(label, value) {
  const d = el("article");
  d.append(el("p", label, "pill"), el("p", value));
  return d;
}
function button(mask) {
  const b = el(
    "button",
    `Mask ${mask} · ${report.records[mask].retained.length} worlds`,
  );
  b.dataset.mask = mask;
  b.onclick = () => select(mask);
  return b;
}
function detail() {
  if (!snapshot) {
    window.disclosureDetail = null;
    $("detail-truth").textContent =
      "No remaining world: no pointed truth verdict.";
    $("detail-possible").textContent =
      "The empty restriction is a diagnostic, not an epistemic state with an actual focus.";
    $("paths").replaceChildren();
    $("failure").replaceChildren();
    return;
  }
  const row = snapshot.table[Number($("detail-formula").value)],
    w = $("detail-world").value;
  $("detail-truth").textContent =
    fmt(row.formula) +
    " at " +
    w +
    ": " +
    (row.truth.includes(w) ? "TRUE" : "FALSE") +
    ". Complete truth set " +
    set(row.truth) +
    ".";
  const ob = row.obligations.find((o) => o.world === w);
  $("paths").replaceChildren();
  $("failure").replaceChildren();
  window.disclosureDetail = {
    formula: Number($("detail-formula").value),
    world: w,
    truth: row.truth,
    obligation: ob || null,
  };

  if (!ob) {
    $("detail-possible").textContent =
      "Atomic or Boolean subformula. Select a modal subformula to inspect all obligations.";
    return;
  }
  $("detail-possible").textContent =
    "Every required reachable world: " +
    set(ob.possible) +
    ". All must satisfy " +
    fmt(row.formula[2]) +
    ".";
  const child = snapshot.table.find((r) => same(r.formula, row.formula[2]));
  $("paths").replaceChildren(
    ...ob.paths.map((p) =>
      card(
        child.truth.includes(p.worlds.at(-1)) ? "CHILD TRUE" : "CHILD FALSE",
        route(p),
      ),
    ),
  );
  $("failure").append(
    el(
      "strong",
      ob.failure
        ? "Actual shortest counterexample"
        : "Every obligation satisfies the child",
    ),
  );
  if (ob.failure) $("failure").append(el("p", route(ob.failure)));
}
function select(mask) {
  selected = mask;
  window.disclosureSelection = mask;
  const r = report.records[mask],
    q = Number($("goal").value),
    request = report.request;
  for (const b of $("masks").children)
    b.setAttribute("aria-pressed", String(Number(b.dataset.mask) === mask));
  $("selected-title").textContent = `Mask ${mask}: retain ${set(r.retained)}`;
  $("toggles").replaceChildren(
    ...request.worlds.map((w, i) => {
      const b = el(
        "button",
        (r.retained.includes(w) ? "Retained: " : "Removed: ") + w,
      );
      b.dataset.world = w;
      b.setAttribute("aria-pressed", String(r.retained.includes(w)));
      b.onclick = () => select(mask ^ (1 << i));
      return b;
    }),
  );
  $("selected-verdict").textContent = !r.focus_survives
    ? "Original focus eliminated. Pointed goal values are null, not false."
    : !r.boolean_definable
      ? "Focus remains, but this is not a Boolean-definable announcement over the supplied atoms."
      : `Truthful Boolean disclosure. Selected goal after update: ${r.values[q] ? "TRUE" : "FALSE"}.`;
  $("selected-verdict").className =
    "warning" + (!r.focus_survives || !r.boolean_definable ? " bad" : "");
  $("definition").replaceChildren();
  if (r.boolean_definable) {
    $("definition").append(
      el("strong", "Canonical defining DNF over supplied atoms"),
      el(
        "code",
        r.dnf_cubes.length
          ? r.dnf_cubes
              .map((bits) => "(" + cube(bits, request.atoms) + ")")
              .join(" ∨ ")
          : "⊥",
      ),
      el(
        "p",
        "One complete cube per retained observed valuation class. This defines exactly the retained set in the supplied model; it is not a shortest formula or a claim about unobserved worlds.",
      ),
    );
  } else {
    $("definition").append(
      el("strong", "Actual Boolean-definability obstruction"),
      el(
        "p",
        `Retained ${r.obstruction.kept} and removed ${r.obstruction.removed} have the same atomic valuation ${set(request.valuation[r.obstruction.kept])}. Every Boolean formula over the supplied atoms agrees on them. No such formula defines this restriction.`,
      ),
    );
  }
  $("query-values").replaceChildren(
    ...request.queries.map((f, i) =>
      card(
        fmt(f),
        r.values[i] === null
          ? "ELIMINATED / NULL"
          : r.values[i]
            ? "TRUE"
            : "FALSE",
      ),
    ),
  );
  $("query-sets").replaceChildren(
    ...request.queries.map((f, i) => card(fmt(f), set(r.truth_sets[i]))),
  );
  if (r.retained.length) {
    const parts = Object.fromEntries(
      Object.entries(request.partitions).map(([a, bs]) => [
        a,
        bs
          .map((b) => b.filter((w) => r.retained.includes(w)))
          .filter((b) => b.length)
          .sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1)),
      ]),
    );
    const rr = {
      ...request,
      worlds: r.retained,
      valuation: Object.fromEntries(
        r.retained.map((w) => [w, request.valuation[w]]),
      ),
      partitions: parts,
      focus: r.retained[0],
    };
    snapshot = analyze(rr).snapshots[0];
    $("partitions").replaceChildren(
      ...Object.entries(parts).map(([a, bs]) =>
        card("Agent " + a, bs.map(set).join(" | ")),
      ),
    );
    $("detail-formula").replaceChildren(
      ...snapshot.table.map((t, i) => {
        const o = el("option", fmt(t.formula));
        o.value = i;
        return o;
      }),
    );
    $("detail-world").replaceChildren(
      ...r.retained.map((w) => {
        const o = el("option", w);
        o.value = w;
        return o;
      }),
    );
    $("detail-world").value = r.focus_survives ? request.focus : r.retained[0];
    $("detail-world").disabled = false;
    $("detail-formula").disabled = false;
    $("detail-note").textContent = r.focus_survives
      ? "Original focus remains. The inspector can also select any other retained world."
      : "The original focus was removed. The inspector below is explicitly at another retained world, not a pointed answer about the eliminated focus.";
  } else {
    snapshot = null;
    $("partitions").replaceChildren();
    $("detail-formula").replaceChildren(el("option", "No remaining model"));
    $("detail-world").replaceChildren(el("option", "No remaining world"));
    $("detail-world").disabled = true;
    $("detail-formula").disabled = true;
    $("detail-note").textContent = "No remaining model to inspect.";
  }
  detail();
}
function goal() {
  const q = Number($("goal").value),
    g = report.goals[q];
  $("goal-summary").textContent =
    `${g.successes.length} truthful successful Boolean disclosures. ${g.maximal.length} inclusion-maximal; ${g.maximum.length} maximum-retained. Largest retained count: ${g.maximum_retained === null ? "no solution" : g.maximum_retained}.`;
  $("maximal").replaceChildren(...g.maximal.map(button));
  $("maximum").replaceChildren(...g.maximum.map(button));
  if (!g.maximal.length)
    $("maximal").append(
      el("p", "No successful Boolean disclosure over these atoms."),
    );
  if (!g.maximum.length)
    $("maximum").append(
      el("p", "No successful Boolean disclosure over these atoms."),
    );
  $("nonmonotone").replaceChildren();
  if (g.loss_witness) {
    $("nonmonotone").append(
      el("strong", "Saying more destroys this goal"),
      el(
        "p",
        `Goal is true after mask ${g.loss_witness.weaker}, but false after its strict retained subset mask ${g.loss_witness.stronger}. Both are focus-truthful Boolean disclosures.`,
      ),
      button(g.loss_witness.weaker),
      button(g.loss_witness.stronger),
    );
  }
  $("gap").replaceChildren();
  if (g.nonboolean_successes.length) {
    $("gap").append(
      el(
        "strong",
        `${g.nonboolean_successes.length} diagnostic successes are not Boolean-definable`,
      ),
      el(
        "p",
        "Do not count them as available Boolean announcements. Inspect the equal-valuation witness.",
      ),
      button(g.nonboolean_successes[0]),
    );
  }
  $("masks").replaceChildren(
    ...report.records.map((r) => {
      const b = el(
        "button",
        `${r.mask} · ${r.retained.length}${r.focus_survives ? "" : " / no focus"}`,
      );
      b.dataset.mask = r.mask;
      b.dataset.boolean = r.boolean_definable;
      b.dataset.success = g.successes.includes(r.mask);
      b.setAttribute(
        "aria-label",
        `Mask ${r.mask}, retain ${r.retained.length}, ${r.boolean_definable ? "Boolean" : "not Boolean"}, ${r.focus_survives ? "focus present" : "focus eliminated"}, selected goal ${r.values[q] === null ? "null" : r.values[q]}`,
      );
      b.onclick = () => select(r.mask);
      return b;
    }),
  );
  select(selected);
}
function run() {
  try {
    const r = atlas(JSON.parse($("request").value));
    report = r;
    window.disclosureReport = r;
    $("status").textContent = "";
    $("output").hidden = false;
    $("download").disabled = false;
    $("headline").textContent =
      `${r.records.length} complete restrictions. Every supplied goal re-evaluated.`;
    const boolean = r.records.filter((x) => x.boolean_definable);
    $("stats").replaceChildren(
      ...[
        [r.request.worlds.length, "Supplied worlds"],
        [r.valuation_classes.length, "Observed valuation classes"],
        [boolean.length, "Boolean-definable restrictions"],
        [
          boolean.filter((x) => x.focus_survives).length,
          "Focus-truthful Boolean disclosures",
        ],
      ].map(([n, t]) => card(t, String(n))),
    );
    $("classes").replaceChildren(
      ...r.valuation_classes.map((c) =>
        card(cube(c.signature, r.request.atoms), set(c.worlds)),
      ),
    );
    $("goal").replaceChildren(
      ...r.request.queries.map((f, i) => {
        const o = el("option", fmt(f));
        o.value = i;
        return o;
      }),
    );
    selected = r.records.length - 1;
    goal();
  } catch (e) {
    clear(e.message);
  }
}
$("run").onclick = run;
$("request").oninput = () =>
  clear("Input changed. Old atlas hidden; enumerate again.");
$("goal").onchange = goal;
$("detail-formula").onchange = detail;
$("detail-world").onchange = detail;
$("control").onchange = () => {
  const c = controls[Number($("control").value)];
  $("request").value = JSON.stringify(c.request, null, 2);
  $("experiment-title").textContent = c.title;
  run();
};
$("download").onclick = () => {
  if (!report) return;
  const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = el("a");
  a.href = url;
  a.download = "epistemlab-disclosures.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
fetch("./disclosure-controls.json")
  .then((r) => {
    if (!r.ok) throw Error("Control load failed");
    return r.json();
  })
  .then((cs) => {
    controls = cs;
    $("control").replaceChildren(
      ...cs.map((c, i) => {
        const o = el("option", c.title);
        o.value = i;
        return o;
      }),
    );
    $("control").onchange();
  })
  .catch((e) => clear(e.message));
