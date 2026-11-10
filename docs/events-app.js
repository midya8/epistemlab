import { updateEvents } from "./event-engine.js";
import { parseJSON } from "./event-json.js";
const $ = (id) => document.getElementById(id),
  esc = (x) =>
    String(x).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
  j = JSON.stringify;
let controls = [],
  report = null;
const fmt = (f) => {
  const op = f[0];
  if (op === "atom") return f[1];
  if (op === "true" || op === "false") return op;
  if (op === "not") return "¬(" + fmt(f[1]) + ")";
  if (op === "and" || op === "or")
    return "(" + fmt(f[1]) + (op === "and" ? " ∧ " : " ∨ ") + fmt(f[2]) + ")";
  return (
    op +
    "[" +
    (Array.isArray(f[1]) ? f[1].join(",") : f[1]) +
    "](" +
    fmt(f[2]) +
    ")"
  );
};
const word = (x) => (x === null ? "no pointed result" : x ? "true" : "false");
function table(id, heads, rows) {
  $(id).innerHTML =
    "<thead><tr>" +
    heads.map((h) => "<th>" + esc(h) + "</th>").join("") +
    "</tr></thead><tbody>" +
    rows
      .map(
        (row) =>
          "<tr>" + row.map((v) => "<td>" + esc(v) + "</td>").join("") + "</tr>",
      )
      .join("") +
    "</tbody>";
}
function options(id, rows) {
  $(id).replaceChildren(
    ...rows.map(([value, text]) => {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = text;
      return o;
    }),
  );
}
function cards(id, rows) {
  $(id).innerHTML = rows
    .map(
      ([title, text, warn]) =>
        '<article class="card' +
        (warn ? " warn" : "") +
        '"><h3>' +
        esc(title) +
        "</h3><p>" +
        esc(text) +
        "</p></article>",
    )
    .join("");
}
function partitions(id, parts) {
  $(id).innerHTML = Object.entries(parts)
    .map(
      ([a, bs]) =>
        '<p class="partition"><strong>' +
        esc(a) +
        "</strong> " +
        esc(
          bs.length
            ? bs.map((b) => "{" + b.join(", ") + "}").join(" | ")
            : "empty",
        ) +
        "</p>",
    )
    .join("");
}
function run() {
  try {
    const raw = parseJSON($("request").value);
    report = updateEvents(raw);
    window.__eventReport = report;
    $("error").textContent = "";
    $("results").hidden = false;
    $("status").textContent =
      report.product.worlds.length +
      " retained product pairs. " +
      (report.point.executable
        ? "The designated pair is executable."
        : "The designated event is not executable at the focus.");
    paint();
  } catch (e) {
    report = null;
    window.__eventReport = null;
    $("results").hidden = true;
    $("certificate").textContent = "";
    $("status").textContent = "";
    $("error").textContent = e.message;
  }
}
function paint() {
  const r = report,
    m = r.request.model,
    a = r.request.action;
  cards("summary", [
    ["Designated input", m.focus + " × " + a.actual],
    ["Pointed product", r.point.pair ?? "Not executable", !r.point.executable],
    ["Facts inherited", m.atoms.length + " supplied atoms. No postconditions."],
  ]);
  table(
    "comparison",
    ["Query at focus", "Before", "Product update", "Public counterfactual"],
    r.comparisons.map((q) => [
      fmt(q.formula),
      word(q.before),
      word(q.product),
      word(q.public),
    ]),
  );
  partitions("world-parts", m.partitions);
  partitions("event-parts", a.partitions);
  partitions("product-parts", r.product.partitions);
  table(
    "candidates",
    ["Pair ID", "World", "Event", "Precondition in original world", "Retained"],
    r.candidates.map((p) => [
      p.id,
      p.world,
      p.event,
      word(p.allowed),
      p.allowed ? "yes" : "no",
    ]),
  );
  table(
    "preconditions",
    ["Event", "Precondition", "True before at"],
    r.preconditions.map((p) => [
      p.event,
      fmt(p.formula),
      p.truth.join(", ") || "none",
    ]),
  );
  options(
    "agent",
    Object.keys(m.partitions)
      .sort()
      .map((a) => [a, a]),
  );
  options(
    "source",
    r.product.worlds.map((s) => [s, pairName(s)]),
  );
  options(
    "target",
    r.product.worlds.map((s) => [s, pairName(s)]),
  );
  $("source").value = r.point.pair || r.product.worlds[0] || "";
  $("target").value =
    r.product.worlds.find((s) => s !== $("source").value) ||
    r.product.worlds[0] ||
    "";
  $("source").disabled = $("target").disabled = !r.product.worlds.length;
  $("snapshot").value = "after";
  renderEdge();
  renderFormulaOptions();
  $("certificate").textContent = JSON.stringify(r, null, 2);
}
function pairName(id) {
  const p = report.candidates.find((p) => p.id === id);
  return p ? id + " = " + p.world + " × " + p.event : id;
}
function grid() {
  const r = report,
    m = r.request.model,
    a = r.request.action,
    wrap = document.createElement("div");
  wrap.className = "grid-wrap";
  wrap.style.gridTemplateColumns =
    "60px repeat(" + a.events.length + ", minmax(120px,1fr))";
  const cell = (text, cl = "grid-head") => {
    const e = document.createElement("div");
    e.className = cl;
    e.textContent = text;
    wrap.append(e);
  };
  cell("world × event");
  a.events.forEach((e) => cell(e));
  for (const w of m.worlds) {
    cell(w);
    for (const e of a.events) {
      const p = r.candidates.find((p) => p.world === w && p.event === e),
        b = document.createElement("button");
      b.className =
        "pair-cell" +
        (!p.allowed ? " dead" : "") +
        (r.point.pair === p.id ? " actual" : "") +
        ($("source").value === p.id ? " source" : "") +
        ($("target").value === p.id ? " target" : "");
      b.dataset.pair = p.id;
      b.disabled = !p.allowed;
      b.innerHTML =
        "<strong>" +
        esc(p.id) +
        "</strong><span>" +
        esc(
          p.allowed
            ? r.product.valuation[p.id].join(", ") || "no true atoms"
            : "precondition false",
        ) +
        "</span><small>" +
        esc(
          r.point.pair === p.id
            ? "actual pair"
            : p.allowed
              ? "retained"
              : "excluded",
        ) +
        "</small>";
      b.addEventListener("click", () => {
        $("source").value = p.id;
        renderEdge();
      });
      wrap.append(b);
    }
  }
  $("product-grid").replaceChildren(wrap);
}
function renderEdge() {
  if (!report) return;
  const r = report,
    agent = $("agent").value,
    s = $("source").value,
    t = $("target").value,
    edge = r.relations.find(
      (x) => x.agent === agent && x.source === s && x.target === t,
    );
  grid();
  if (!edge) {
    cards("edge-proof", [
      [
        "No product pairs",
        "There is no relation obligation without a retained pair.",
        true,
      ],
    ]);
    $("view-proof").replaceChildren();
    table(
      "edges",
      ["Target", "World related", "Event related", "Product related"],
      [],
    );
    return;
  }
  cards("edge-proof", [
    ["World relation", word(edge.world_related), !edge.world_related],
    ["Event relation", word(edge.event_related), !edge.event_related],
    ["Product arrow " + s + " → " + t, word(edge.related), !edge.related],
  ]);
  const v = r.views.find((x) => x.agent === agent && x.pair === s);
  cards("view-proof", [
    ["Possible pairs for " + agent, v.possible.join(", ")],
    ["Possible original worlds", v.worlds.join(", ")],
    ["Possible events", v.events.join(", ")],
  ]);
  table(
    "edges",
    ["Target pair", "World related", "Event related", "Both / product arrow"],
    r.relations
      .filter((x) => x.agent === agent && x.source === s)
      .map((x) => [
        pairName(x.target),
        word(x.world_related),
        word(x.event_related),
        word(x.related),
      ]),
  );
}
function snapshot() {
  return $("snapshot").value === "public"
    ? report.public_counterfactual.snapshot
    : report[$("snapshot").value];
}
function renderFormulaOptions() {
  if (!report) return;
  const old = $("formula").value,
    s = snapshot();
  options(
    "formula",
    s.table.map((t, i) => [String(i), fmt(t.formula)]),
  );
  $("formula").value = Number(old) < s.table.length ? old : "0";
  if (!$("formula").value) $("formula").value = "0";
  renderFormula();
}
function renderFormula() {
  if (!report) return;
  const s = snapshot(),
    row = s.table[Number($("formula").value)];
  if (!row) return;
  $("truth").textContent =
    fmt(row.formula) +
    " is true at: " +
    (row.truth.join(", ") || "none") +
    ". " +
    (s.focus_status === "not_executable"
      ? "No executable pointed product."
      : s.focus_status === "eliminated"
        ? "The original focus was removed."
        : "");
  const change = report.changes.find((t) => j(t.formula) === j(row.formula));
  table(
    "changes",
    ["Product pair", "Before at original world", "After at pair", "Changed"],
    (change?.pairs || []).map((p) => [
      pairName(p.pair),
      word(p.before),
      word(p.after),
      p.changed ? "yes" : "no",
    ]),
  );
  options(
    "world",
    row.obligations.map((o) => [o.world, o.world]),
  );
  $("world").disabled = !row.obligations.length;
  renderModal();
}
function renderModal() {
  if (!report) return;
  const row = snapshot().table[Number($("formula").value)],
    o = row?.obligations.find((o) => o.world === $("world").value);
  if (!o) {
    $("modal-proof").innerHTML =
      '<p class="hint">No modal obligation for this subformula' +
      (snapshot().worlds.length ? "" : "; this model has no remaining world") +
      ".</p>";
    table("paths", ["Possible endpoint", "World path", "Agent path"], []);
    return;
  }
  cards("modal-proof", [
    ["Possible endpoints", o.possible.join(", ") || "none"],
    [
      "Failure witness",
      o.failure
        ? JSON.stringify(o.failure)
        : "No failing endpoint for the child formula.",
    ],
  ]);
  table(
    "paths",
    ["Possible endpoint", "World path", "Agent path"],
    o.paths.map((p) => [
      p.worlds.at(-1),
      p.worlds.join(" → "),
      p.agents.map((a) => (Array.isArray(a) ? a.join("&") : a)).join(" → ") ||
        "zero steps",
    ]),
  );
}
$("run").addEventListener("click", run);
$("request").addEventListener("input", () => {
  report = null;
  window.__eventReport = null;
  $("results").hidden = true;
  $("status").textContent =
    "Input changed. Recompute before using any evidence.";
  $("certificate").textContent = "";
});
$("control").addEventListener("change", () => {
  const c = controls[Number($("control").value)];
  $("request").value = JSON.stringify(c.request, null, 2);
  $("note").textContent = c.note;
  run();
});
for (const id of ["agent", "source", "target"])
  $(id).addEventListener("change", renderEdge);
$("snapshot").addEventListener("change", renderFormulaOptions);
$("formula").addEventListener("change", renderFormula);
$("world").addEventListener("change", renderModal);
$("download").addEventListener("click", () => {
  if (!report) return;
  const b = new Blob([JSON.stringify(report, null, 2) + "\n"], {
      type: "application/json",
    }),
    u = URL.createObjectURL(b),
    a = document.createElement("a");
  a.href = u;
  a.download = "epistemlab-events.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
});
try {
  const response = await fetch("./event-controls.json");
  if (!response.ok) throw Error("Controls failed to load");
  controls = await response.json();
  window.__eventControls = controls;
  options(
    "control",
    controls.map((c, i) => [String(i), c.title]),
  );
  $("control").dispatchEvent(new Event("change"));
  window.__eventReady = true;
} catch (e) {
  $("error").textContent = e.message;
}
