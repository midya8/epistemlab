import { analyze } from "./engine.js";
const $ = (id) => document.getElementById(id),
  el = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  },
  key = (f) => JSON.stringify(f),
  fmt = (f) => {
    const op = f[0];
    if (op === "atom") return f[1];
    if (["true", "false"].includes(op)) return op === "true" ? "⊤" : "⊥";
    if (op === "not") return "¬(" + fmt(f[1]) + ")";
    if (["and", "or"].includes(op))
      return "(" + fmt(f[1]) + (op === "and" ? " ∧ " : " ∨ ") + fmt(f[2]) + ")";
    return (
      op + "[" + (op === "K" ? f[1] : f[1].join(",")) + "](" + fmt(f[2]) + ")"
    );
  },
  set = (ws) => (ws.length ? "{" + ws.join(", ") + "}" : "∅"),
  route = (p) =>
    p.worlds
      .map((w, i) => (i ? `-[${p.agents[i - 1].join("&")}]-> ${w}` : w))
      .join(" ");
let report = null,
  controls = [];
function clear(message) {
  report = null;
  window.epistemReport = null;
  window.epistemSelection = null;
  $("output").hidden = true;
  $("download").disabled = true;
  $("status").textContent = message;
}
function formula() {
  const s = report.snapshots[Number($("round").value)],
    row = s.table[Number($("formula").value)],
    w = $("world").value,
    has = s.worlds.includes(w),
    f = row.formula;
  window.epistemSelection = {
    round: s.round,
    formula: Number($("formula").value),
    world: has ? w : null,
  };
  $("formula-label").textContent = fmt(f);
  $("truth-set").textContent =
    "True at exactly " + set(row.truth) + " in this round.";
  $("formula-verdict").textContent = has
    ? `${w}: ${row.truth.includes(w) ? "true" : "false"} in the current restricted model.`
    : "No remaining world. There is no pointed truth verdict.";
  $("formula-verdict").className =
    "warning" + (has && !row.truth.includes(w) ? " bad" : "");
  $("paths").replaceChildren();
  $("counterexample").replaceChildren();
  const ob = row.obligations.find((o) => o.world === w);
  if (!ob) {
    $("possibility-help").textContent = has
      ? "This is a Boolean or atomic formula. Its complete truth set is shown above; select a knowledge subformula to inspect relational obligations."
      : "The empty truth set is not a world where the formula is false. All modal obligations are empty because no worlds remain.";
    return;
  }
  $("possibility-help").textContent =
    `${f[0] === "C" ? "All worlds reachable by any finite chain" : f[0] === "D" ? "Worlds compatible with every group agent simultaneously" : "Every directly accessible world"}: ${set(ob.possible)}. All must satisfy ${fmt(f[2])}.`;
  const child = s.table.find((r) => key(r.formula) === key(f[2]));
  $("paths").replaceChildren(
    ...ob.paths.map((p) => {
      const d = el("article");
      d.dataset.target = p.worlds.at(-1);
      d.append(
        el(
          "p",
          child.truth.includes(p.worlds.at(-1)) ? "CHILD TRUE" : "CHILD FALSE",
          "pill",
        ),
        el("p", route(p), "path"),
      );
      return d;
    }),
  );
  if (ob.failure) {
    const d = el("article");
    d.append(
      el("h3", "An actual shortest counterexample"),
      el("p", route(ob.failure), "path"),
      el(
        "p",
        `${fmt(f[2])} is false at ${ob.failure.worlds.at(-1)}. The failure is in this supplied model, not a statement about a real person.`,
      ),
    );
    $("counterexample").append(d);
  } else {
    $("counterexample").append(
      el(
        "p",
        "Every required world satisfies the child formula. The complete obligation set above certifies this modal truth.",
      ),
    );
  }
}
function round() {
  const s = report.snapshots[Number($("round").value)];
  $("focus-status").textContent =
    s.focus_status === "present"
      ? `Focus ${report.request.focus} remains. Query values below refer to this world in round ${s.round}.`
      : `Focus ${report.request.focus} was eliminated. Query values are null, not false${s.worlds.length ? "" : "; no worlds remain"}.`;
  $("focus-status").className =
    "warning" + (s.focus_status === "present" ? "" : " bad");
  $("worlds").replaceChildren(
    ...(s.worlds.length
      ? s.worlds.map((w) => {
          const d = el("article");
          d.dataset.world = w;
          d.dataset.focus = String(w === report.request.focus);
          d.append(
            el("h4", w + (w === report.request.focus ? " / focus" : "")),
            el("p", "True atoms: " + set(report.request.valuation[w])),
          );
          return d;
        })
      : [
          el(
            "p",
            "No remaining worlds. This update has no pointed epistemic state.",
          ),
        ]),
  );
  $("partitions").replaceChildren(
    ...Object.entries(s.partitions).map(([a, bs]) => {
      const d = el("article");
      d.dataset.agent = a;
      d.append(
        el("h4", "Agent " + a),
        el("p", bs.map(set).join(" | ") || "No remaining blocks."),
      );
      return d;
    }),
  );
  $("queries").replaceChildren(
    ...s.queries.map((q) => {
      const d = el("article");
      d.append(
        el("p", fmt(q.formula), "formula"),
        el(
          "strong",
          q.value === null ? "ELIMINATED / NULL" : q.value ? "TRUE" : "FALSE",
          q.value === null ? "" : q.value ? "truth" : "false",
        ),
      );
      return d;
    }),
  );
  $("formula").replaceChildren(
    ...s.table.map((r, i) => {
      const o = el("option", fmt(r.formula));
      o.value = String(i);
      return o;
    }),
  );
  const modal = s.table.findIndex((r) => r.obligations.length);
  $("formula").value = String(modal >= 0 ? modal : 0);
  $("world").replaceChildren(
    ...(s.worlds.length ? s.worlds : [null]).map((w) => {
      const o = el("option", w || "No remaining world");
      o.value = w || "";
      return o;
    }),
  );
  $("world").disabled = !s.worlds.length;
  $("world").value = s.worlds.includes(report.request.focus)
    ? report.request.focus
    : s.worlds[0] || "";
  formula();
}
function render(r) {
  report = r;
  window.epistemReport = r;
  $("output").hidden = false;
  $("download").disabled = false;
  $("status").textContent = "";
  const c = controls[Number($("control").value)];
  $("experiment-title").textContent =
    c && key(c.request) === key(r.request) ? c.title : "Custom supplied model";
  $("headline").textContent =
    `${r.snapshots.length} complete model snapshot${r.snapshots.length === 1 ? "" : "s"}. Every subformula checked.`;
  $("stats").replaceChildren(
    ...[
      [r.request.worlds.length, "Supplied worlds"],
      [Object.keys(r.request.partitions).length, "Supplied agents"],
      [r.subformula_count, "Distinct subformulas"],
      [
        r.updates.reduce((n, u) => n + u.lost_truth.length, 0),
        "World-update truth-loss occurrences",
      ],
    ].map(([n, label]) => {
      const d = el("div", undefined, "stat");
      d.append(el("strong", n), el("span", label));
      return d;
    }),
  );
  $("updates").replaceChildren(
    ...r.updates.map((u, i) => {
      const d = el("article");
      d.dataset.round = String(i + 1);
      d.append(
        el("p", "ANNOUNCEMENT " + (i + 1), "pill"),
        el("h3", fmt(u.formula)),
        el(
          "p",
          `${u.before.length} worlds before. Retain ${set(u.retained)}. Remove ${set(u.removed)}.`,
        ),
        el(
          "p",
          "Content still true after update at " + set(u.after_true) + ".",
        ),
        el(
          "p",
          u.lost_truth.length
            ? "Content became false at retained worlds " +
                set(u.lost_truth) +
                "."
            : "No retained world loses content truth in this model.",
        ),
        el(
          "p",
          u.focus_survived
            ? "Focus survives."
            : "Focus is eliminated: this update is not executable as a truthful announcement at that focus.",
        ),
      );
      return d;
    }),
  );
  if (!r.updates.length)
    $("updates").append(
      el(
        "p",
        "No public announcements supplied. This is the original model only.",
      ),
    );
  $("round").replaceChildren(
    ...r.snapshots.map((s) => {
      const o = el(
        "option",
        `Round ${s.round}: ${s.worlds.length} remaining world(s)${s.round ? " after announcement " + s.round : " / original model"}`,
      );
      o.value = String(s.round);
      return o;
    }),
  );
  $("round").value = "0";
  round();
}
function run() {
  try {
    render(analyze(JSON.parse($("request").value)));
  } catch (e) {
    clear(e.message);
  }
}
$("control").addEventListener("change", () => {
  $("request").value = JSON.stringify(
    controls[Number($("control").value)].request,
    null,
    2,
  );
  run();
});
$("build").addEventListener("click", run);
$("request").addEventListener("input", () =>
  clear("Model changed. Rebuild before interpreting or exporting evidence."),
);
$("round").addEventListener("change", round);
$("formula").addEventListener("change", formula);
$("world").addEventListener("change", formula);
$("download").addEventListener("click", () => {
  if (!report) return;
  const b = new Blob([JSON.stringify(report, null, 2) + "\n"], {
      type: "application/json",
    }),
    u = URL.createObjectURL(b),
    a = el("a");
  a.href = u;
  a.download = "epistemlab-evidence.json";
  a.click();
  URL.revokeObjectURL(u);
});
try {
  controls = await (await fetch("controls.json")).json();
  $("control").replaceChildren(
    ...controls.map((c, i) => {
      const o = el("option", c.title);
      o.value = String(i);
      return o;
    }),
  );
  $("request").value = JSON.stringify(controls[0].request, null, 2);
  run();
} catch (e) {
  clear("Could not load controls: " + e.message);
}
