import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { analyze } from "../docs/engine.js";
const cs = JSON.parse(
  fs.readFileSync(new URL("../docs/controls.json", import.meta.url)),
);
function check(rs) {
  const py = JSON.parse(
    execFileSync(
      process.env.PYTHON || "python",
      [
        "-c",
        `import json,sys;from epistemlab import analyze,verify;rs=json.load(sys.stdin);assert all(verify(r) for r in rs);print(json.dumps([analyze(r['request']) for r in rs]))`,
      ],
      {
        input: JSON.stringify(rs),
        encoding: "utf8",
        maxBuffer: 40 * 1024 * 1024,
      },
    ),
  );
  assert.deepEqual(rs, py);
}
test("all eight complete control reports exactly match Python and independent checker", () =>
  check(cs.map((c) => analyze(c.request))));
test("all 200 three-world two-agent partition/valuation models, nested and self-refuting formulas", () => {
  const ps = [
      [["w0", "w1", "w2"]],
      [["w0"], ["w1", "w2"]],
      [["w0", "w1"], ["w2"]],
      [["w0", "w2"], ["w1"]],
      [["w0"], ["w1"], ["w2"]],
    ],
    p = ["atom", "p"],
    rs = [];
  for (const a of ps)
    for (const b of ps)
      for (let vals = 0; vals < 8; vals++)
        rs.push(
          analyze({
            worlds: ["w0", "w1", "w2"],
            atoms: ["p"],
            valuation: Object.fromEntries(
              ["w0", "w1", "w2"].map((w, i) => [
                w,
                vals & (1 << i) ? ["p"] : [],
              ]),
            ),
            partitions: { a, b },
            focus: "w0",
            queries: [
              ["E", ["a", "b"], p],
              ["D", ["a", "b"], p],
              ["C", ["a", "b"], p],
              ["E", ["a", "b"], ["E", ["a", "b"], p]],
            ],
            announcements: [["and", p, ["not", ["K", "a", p]]]],
          }),
        );
  check(rs);
  assert.equal(rs.length, 200);
});
test("strict partitions, formula groups and stale schema rejected", () => {
  for (const edit of [
    (r) => (r.partitions.a = [["w0"], ["w0", "w1"]]),
    (r) => (r.queries = [["C", [], ["atom", "p"]]]),
    (r) => (r.announcements = Array(5).fill(["atom", "p"])),
    (r) => (r.extra = 1),
  ]) {
    const r = structuredClone(cs[0].request);
    edit(r);
    assert.throws(() => analyze(r));
  }
});
