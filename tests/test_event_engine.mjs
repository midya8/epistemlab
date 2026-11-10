import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { updateEvents } from "../docs/event-engine.js";
import { parseJSON } from "../docs/event-json.js";
const controls = JSON.parse(fs.readFileSync("docs/event-controls.json"));
test("648 complete product-update reports agree with both native reconstructions", () => {
  const rows = JSON.parse(
    execFileSync(
      process.env.PYTHON || "python",
      [
        "-c",
        `import json;from tools.event_cases import all_cases;from epistemlab.events import update;from epistemlab.event_oracle import verify_events;rs=[update(r)for r in all_cases()];assert all(verify_events(r)for r in rs);print(json.dumps(rs))`,
      ],
      { maxBuffer: 64e6 },
    ),
  );
  assert.equal(rows.length, 648);
  for (const r of rows) assert.deepEqual(updateEvents(r.request), r);
  console.log("complete event reports", rows.length);
});
test("product distinctions, null focus, all-enabled and exact twelve-pair boundary", () => {
  const cs = controls.map((c) => updateEvents(c.request));
  assert.deepEqual(
    cs[0].comparisons.map((q) => q.product),
    [true, false, false],
  );
  assert.deepEqual(
    cs[1].comparisons.map((q) => q.product),
    [true, true, false],
  );
  assert.ok(cs[3].product.worlds.length > 0 && !cs[3].point.executable);
  assert.equal(cs[4].product.worlds.length, 0);
  assert.equal(cs[10].product.worlds.length, 12);
  for (const c of controls) {
    const s = JSON.stringify(c.request);
    updateEvents(c.request);
    assert.equal(s, JSON.stringify(c.request));
  }
});
test("strict JSON and S5 event schema reject malformed or duplicate input", () => {
  for (const raw of [
    "{}",
    '{"model":{},"model":{},"action":{}}',
    '{"x":NaN}',
    '{"x":1.5}',
    '{"x":0} trailing',
  ])
    assert.throws(() => updateEvents(parseJSON(raw)));
  for (const mutate of [
    (r) => (r.extra = 1),
    (r) => (r.action.partitions.a = [["idle"]]),
    (r) => (r.action.actual = "missing"),
    (r) => (r.model.announcements = [["true"]]),
    (r) => (r.action.preconditions.idle = ["K", "z", ["true"]]),
  ]) {
    const r = structuredClone(controls[0].request);
    mutate(r);
    assert.throws(() => updateEvents(r));
  }
});
