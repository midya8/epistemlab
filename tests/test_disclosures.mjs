import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { atlas } from "../docs/atlas-engine.js";
const controls = JSON.parse(
  fs.readFileSync(new URL("../docs/disclosure-controls.json", import.meta.url)),
);
const py = (code) =>
  JSON.parse(
    execFileSync(process.env.PYTHON || "python", ["-c", code], {
      maxBuffer: 80 * 1024 * 1024,
      encoding: "utf8",
    }),
  );
test("eight complete disclosure atlases match Python and separate verifier", () => {
  const expected = py(
    "import json;from epistemlab.disclosures import atlas;from epistemlab.disclosure_oracle import verify_atlas;cs=json.load(open('docs/disclosure-controls.json'));aa=[atlas(c['request']) for c in cs];assert all(verify_atlas(a) for a in aa);print(json.dumps(aa))",
  );
  controls.forEach((c, i) => assert.deepEqual(atlas(c.request), expected[i]));
  assert.equal(
    expected.reduce((n, a) => n + a.records.length, 0),
    324,
  );
});
test("all 200 three-world partition/valuation atlas reports match independent Python reconstruction", () => {
  const expected = py(
    "import json,itertools;from epistemlab.disclosure_oracle import reconstruct;import runpy;partitions=runpy.run_path('tests/test_disclosures.py')['partitions'];ws=['w0','w1','w2'];p=['atom','p'];rs=[dict(worlds=ws,atoms=['p'],valuation={w:['p'] if bit else [] for w,bit in zip(ws,bits)},partitions={'a':a,'b':b},focus='w0',queries=[['K','a',p],['C',['a','b'],p],['D',['a','b'],p],['not',['K','b',p]]],announcements=[]) for a,b in itertools.product(partitions(ws),repeat=2) for bits in itertools.product([False,True],repeat=3)];print(json.dumps([reconstruct(r) for r in rs]))",
  );
  assert.equal(expected.length, 200);
  for (const a of expected) assert.deepEqual(atlas(a.request), a);
});
test("strict disclosure limits, nonempty prior-update anchors and malformed schemas reject", () => {
  for (const change of [
    (r) => (r.announcements = [["true"]]),
    (r) => (r.extra = true),
    (r) => (r.focus = "absent"),
    (r) => (r.partitions.a = [["w0"]]),
    (r) => (r.queries = [["K", "missing", ["true"]]]),
  ]) {
    const r = structuredClone(controls[0].request);
    change(r);
    assert.throws(() => atlas(r));
  }
  const r = structuredClone(controls[0].request);
  r.worlds = Array.from({ length: 9 }, (_, i) => "w" + i);
  r.valuation = Object.fromEntries(r.worlds.map((w) => [w, []]));
  r.partitions = { a: [r.worlds] };
  assert.throws(() => atlas(r));
});

test("all-proper-superset maximality survives a two-bit nonmonotone gap", () => {
  const p = ["atom", "p"],
    q = ["atom", "q"],
    kp = ["K", "a", p],
    kq = ["K", "a", q],
    f = ["or", ["and", kp, kq], ["and", ["not", kp], ["not", kq]]];
  const r = {
    worlds: ["w0", "w1", "w2"],
    atoms: ["p", "q"],
    valuation: { w0: ["p", "q"], w1: ["p"], w2: ["q"] },
    partitions: { a: [["w0", "w1", "w2"]] },
    focus: "w0",
    queries: [f],
    announcements: [],
  };
  const a = atlas(r);
  assert.deepEqual(a.goals[0].successes, [1, 7]);
  assert.deepEqual(a.goals[0].maximal, [7]);
});
