"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  { spawn, execFileSync } = require("node:child_process"),
  {
    waitForDebugger,
    stopChrome,
    waitForDownload,
  } = require("./chrome_support.cjs"),
  delay = (ms) => new Promise((r) => setTimeout(r, ms));
test(
  "actual Chrome event product: every pair, relation and modal obligation, trusted downloads",
  { timeout: 180000 },
  async () => {
    const server = require("node:http").createServer((req, res) => {
      try {
        const p = path.join(
          __dirname,
          "../docs",
          req.url === "/" ? "events.html" : req.url.split("?")[0],
        );
        res.setHeader(
          "Content-Type",
          {
            ".html": "text/html",
            ".js": "application/javascript",
            ".json": "application/json",
            ".css": "text/css",
          }[path.extname(p)] || "text/plain",
        );
        res.end(fs.readFileSync(p));
      } catch {
        res.statusCode = 404;
        res.end("not found");
      }
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "epistemlab-event-")),
      browser = spawn(
        process.env.CHROME_BIN || "google-chrome",
        [
          "--headless",
          "--no-sandbox",
          "--disable-gpu",
          "--disable-extensions",
          "--disable-dev-shm-usage",
          "--remote-debugging-port=0",
          `--user-data-dir=${profile}`,
          "about:blank",
        ],
        { detached: true, stdio: ["ignore", "ignore", "pipe"] },
      );
    let ws,
      error,
      diagnostics = "";
    browser.on("error", (e) => (error = e));
    browser.stderr.on(
      "data",
      (d) => (diagnostics = (diagnostics + d).slice(-4000)),
    );
    try {
      for (
        let i = 0;
        i < 1200 &&
        !error &&
        browser.exitCode === null &&
        !fs.existsSync(path.join(profile, "DevToolsActivePort"));
        i++
      )
        await delay(25);
      assert.ok(
        fs.existsSync(path.join(profile, "DevToolsActivePort")),
        error?.message || diagnostics,
      );
      const port = fs
          .readFileSync(path.join(profile, "DevToolsActivePort"), "utf8")
          .split("\n")[0],
        tab = await waitForDebugger(`http://127.0.0.1:${port}/json/list`, {
          alive: () => browser.exitCode === null && !error,
        });
      ws = new WebSocket(tab.webSocketDebuggerUrl);
      await new Promise((r, j) => {
        ws.onopen = r;
        ws.onerror = j;
      });
      let seq = 0;
      const pending = new Map(),
        errors = [];
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.method === "Runtime.exceptionThrown") errors.push(m.params);
        if (pending.has(m.id)) {
          const { r, j } = pending.get(m.id);
          pending.delete(m.id);
          m.error ? j(Error(JSON.stringify(m.error))) : r(m.result);
        }
      };
      const call = (method, params = {}) =>
          new Promise((r, j) => {
            const id = ++seq;
            pending.set(id, { r, j });
            ws.send(JSON.stringify({ id, method, params }));
          }),
        js = async (expression) => {
          const r = await call("Runtime.evaluate", {
            expression,
            returnByValue: true,
            awaitPromise: true,
          });
          if (r.exceptionDetails)
            throw Error(JSON.stringify(r.exceptionDetails));
          return r.result.value;
        };
      await call("Runtime.enable");
      await call("Page.enable");
      await call("Page.navigate", {
        url:
          process.env.EPISTEMLAB_EVENT_URL ||
          `http://127.0.0.1:${server.address().port}/`,
      });
      for (
        let i = 0;
        i < 400 && !(await js("Boolean(window.__eventReady)"));
        i++
      )
        await delay(25);
      assert.ok(
        await js("Boolean(window.__eventReady)"),
        await js("document.body.innerText"),
      );
      const cs = JSON.parse(fs.readFileSync("docs/event-controls.json")),
        expected = JSON.parse(
          execFileSync(
            process.env.PYTHON || "python",
            [
              "-c",
              `import json;from epistemlab.events import update;from epistemlab.event_oracle import verify_events;rs=[update(c['request'])for c in json.load(open('docs/event-controls.json'))];assert all(verify_events(r)for r in rs);print(json.dumps(rs))`,
            ],
            { maxBuffer: 64e6 },
          ),
        );
      const set = (id, value, event = "change") =>
          js(
            `document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(String(value))};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event(${JSON.stringify(event)}))`,
          ),
        rows = (id) =>
          js(
            `Array.from(document.querySelectorAll('#'+${JSON.stringify(id)}+' tbody tr'),r=>Array.from(r.cells,c=>c.textContent))`,
          ),
        cards = (id) =>
          js(
            `Array.from(document.querySelectorAll('#'+${JSON.stringify(id)}+' .card'),c=>[c.querySelector('h3').textContent,c.querySelector('p').textContent])`,
          ),
        word = (v) => (v === null ? "no pointed result" : v ? "true" : "false");
      const fmt = (f) => {
        const op = f[0];
        if (op === "atom") return f[1];
        if (op === "true" || op === "false") return op;
        if (op === "not") return "¬(" + fmt(f[1]) + ")";
        if (op === "and" || op === "or")
          return (
            "(" + fmt(f[1]) + (op === "and" ? " ∧ " : " ∨ ") + fmt(f[2]) + ")"
          );
        return (
          op +
          "[" +
          (Array.isArray(f[1]) ? f[1].join(",") : f[1]) +
          "](" +
          fmt(f[2]) +
          ")"
        );
      };
      async function shot(name) {
        if (!process.env.EVENT_SCREEN_DIR) return;
        await js(
          'document.activeElement.blur();window.scrollTo(0,0);document.querySelectorAll("textarea").forEach(e=>e.scrollTop=0);new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))',
        );
        const m = await call("Page.getLayoutMetrics"),
          im = await call("Page.captureScreenshot", {
            format: "png",
            captureBeyondViewport: true,
            clip: {
              x: 0,
              y: 0,
              width: m.cssContentSize.width,
              height: m.cssContentSize.height,
              scale: 1,
            },
          });
        fs.mkdirSync(process.env.EVENT_SCREEN_DIR, { recursive: true });
        fs.writeFileSync(
          path.join(process.env.EVENT_SCREEN_DIR, name + ".png"),
          Buffer.from(im.data, "base64"),
        );
      }
      let reports = 0,
        pairButtons = 0,
        arrows = 0,
        sourceRows = 0,
        formulas = 0,
        obligations = 0,
        pathRows = 0,
        downloads = 0;
      for (const width of [1280, 390, 320]) {
        await call("Emulation.setDeviceMetricsOverride", {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: width < 600,
        });
        for (let ci = 0; ci < cs.length; ci++) {
          await set("control", ci);
          const r = expected[ci];
          assert.deepEqual(await js("window.__eventReport"), r);
          assert.deepEqual(
            await rows("comparison"),
            r.comparisons.map((q) => [
              fmt(q.formula),
              word(q.before),
              word(q.product),
              word(q.public),
            ]),
          );
          assert.deepEqual(
            await rows("candidates"),
            r.candidates.map((p) => [
              p.id,
              p.world,
              p.event,
              word(p.allowed),
              p.allowed ? "yes" : "no",
            ]),
          );
          assert.deepEqual(
            await rows("preconditions"),
            r.preconditions.map((p) => [
              p.event,
              fmt(p.formula),
              p.truth.join(", ") || "none",
            ]),
          );
          const cells = await js(
            '[...document.querySelectorAll(".pair-cell")].map(e=>({id:e.dataset.pair,disabled:e.disabled,actual:e.classList.contains("actual")}))',
          );
          assert.deepEqual(
            cells,
            r.candidates.map((p) => ({
              id: p.id,
              disabled: !p.allowed,
              actual: r.point.pair === p.id,
            })),
          );
          for (const p of r.candidates.filter((p) => p.allowed)) {
            await js(`document.querySelector('[data-pair="${p.id}"]').click()`);
            assert.equal(
              await js('document.getElementById("source").value'),
              p.id,
            );
            pairButtons++;
          }
          const name = (id) => {
            const p = r.candidates.find((p) => p.id === id);
            return `${id} = ${p.world} × ${p.event}`;
          };
          for (const a of Object.keys(r.request.model.partitions).sort()) {
            await set("agent", a);
            for (const s of r.product.worlds) {
              await set("source", s);
              const rs = r.relations.filter(
                (x) => x.agent === a && x.source === s,
              );
              assert.deepEqual(
                await rows("edges"),
                rs.map((x) => [
                  name(x.target),
                  word(x.world_related),
                  word(x.event_related),
                  word(x.related),
                ]),
              );
              sourceRows++;
              const v = r.views.find((x) => x.agent === a && x.pair === s);
              assert.deepEqual(
                (await cards("view-proof")).map((x) => x[1]),
                [
                  v.possible.join(", "),
                  v.worlds.join(", "),
                  v.events.join(", "),
                ],
              );
              for (const edge of rs) {
                await set("target", edge.target);
                assert.deepEqual(
                  (await cards("edge-proof")).map((x) => x[1]),
                  [
                    word(edge.world_related),
                    word(edge.event_related),
                    word(edge.related),
                  ],
                );
                arrows++;
              }
            }
          }
          for (const key of ["before", "after", "public"]) {
            await set("snapshot", key);
            const sn =
              key === "public" ? r.public_counterfactual.snapshot : r[key];
            for (let fi = 0; fi < sn.table.length; fi++) {
              await set("formula", fi);
              const row = sn.table[fi];
              assert.ok(
                (
                  await js('document.getElementById("truth").textContent')
                ).includes(row.truth.join(", ") || "none"),
              );
              const ch = r.changes.find(
                (c) =>
                  JSON.stringify(c.formula) === JSON.stringify(row.formula),
              );
              assert.deepEqual(
                await rows("changes"),
                (ch?.pairs || []).map((p) => [
                  name(p.pair),
                  word(p.before),
                  word(p.after),
                  p.changed ? "yes" : "no",
                ]),
              );
              formulas++;
              for (const o of row.obligations) {
                await set("world", o.world);
                assert.deepEqual(
                  await rows("paths"),
                  o.paths.map((p) => [
                    p.worlds.at(-1),
                    p.worlds.join(" → "),
                    p.agents
                      .map((a) => (Array.isArray(a) ? a.join("&") : a))
                      .join(" → ") || "zero steps",
                  ]),
                );
                assert.deepEqual(
                  (await cards("modal-proof")).map((c) => c[1]),
                  [
                    o.possible.join(", ") || "none",
                    o.failure
                      ? JSON.stringify(o.failure)
                      : "No failing endpoint for the child formula.",
                  ],
                );
                obligations++;
                pathRows += o.paths.length;
              }
            }
          }
          await set("snapshot", "after");
          let fi = r.after.table.findIndex((t) => t.formula[0] === "K");
          await set("formula", fi < 0 ? 0 : fi);
          if (r.point.pair) await set("source", r.point.pair);
          await set(
            "agent",
            Object.keys(r.request.model.partitions).sort().at(-1),
          );
          assert.ok(
            await js("document.documentElement.scrollWidth<=innerWidth"),
            "page overflow " + ci + "/" + width,
          );
          await shot(`control-${ci}-${width}`);
          if (ci === 0 && width < 600) {
            await js(
              '(()=>{const e=document.getElementById("product-grid");e.scrollLeft=e.scrollWidth-e.clientWidth})()',
            );
            assert.ok(
              await js('document.getElementById("product-grid").scrollLeft>0'),
            );
            await shot(`grid-right-${width}`);
            await js('document.getElementById("product-grid").scrollLeft=0');
          }
          if (width === 1280) {
            await call("Page.setDownloadBehavior", {
              behavior: "allow",
              downloadPath: profile,
            });
            await js(
              'document.getElementById("download").scrollIntoView({block:"center"})',
            );
            const rect = await js(
              '(()=>{const r=document.getElementById("download").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()',
            );
            await call("Input.dispatchMouseEvent", {
              type: "mousePressed",
              ...rect,
              button: "left",
              clickCount: 1,
            });
            await call("Input.dispatchMouseEvent", {
              type: "mouseReleased",
              ...rect,
              button: "left",
              clickCount: 1,
            });
            const dest = path.join(profile, "epistemlab-events.json");
            await waitForDownload(
              dest,
              Buffer.byteLength(JSON.stringify(r, null, 2) + "\n"),
            );
            assert.deepEqual(JSON.parse(fs.readFileSync(dest)), r);
            execFileSync(process.env.PYTHON || "python", [
              "-m",
              "epistemlab.event_cli",
              dest,
              "--verify",
            ]);
            fs.unlinkSync(dest);
            downloads++;
          }
          reports++;
        }
      }
      for (const bad of [
        "{}",
        '{"model":{},"model":{},"action":{}}',
        '{"model":NaN,"action":{}}',
      ]) {
        await set("request", bad, "input");
        assert.equal(await js("window.__eventReport"), null);
        assert.equal(
          await js('document.getElementById("results").hidden'),
          true,
        );
        await js('document.getElementById("run").click()');
        assert.equal(await js("window.__eventReport"), null);
        assert.ok(await js('document.getElementById("error").textContent'));
      }
      await shot("invalid");
      await set("control", 0);
      assert.deepEqual(await js("window.__eventReport"), expected[0]);
      assert.deepEqual(errors, []);
      console.log(
        JSON.stringify({
          reports,
          pair_buttons: pairButtons,
          source_rows: sourceRows,
          relation_obligations: arrows,
          subformula_selections: formulas,
          modal_obligations: obligations,
          path_rows: pathRows,
          trusted_downloads: downloads,
          widths: [1280, 390, 320],
        }),
      );
    } finally {
      ws?.close();
      await stopChrome(browser);
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      fs.rmSync(profile, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
  },
);
