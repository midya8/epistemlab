const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  { spawn, execFileSync } = require("node:child_process"),
  { waitForDebugger } = require("./chrome_support.cjs");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
test(
  "Chrome every knowledge obligation and announcement snapshot, exports and recovery",
  { timeout: 180000 },
  async () => {
    const server = require("node:http").createServer((req, res) => {
      try {
        const file = path.join(
          __dirname,
          "../docs",
          req.url === "/" ? "index.html" : req.url,
        );
        res.setHeader(
          "Content-Type",
          {
            ".html": "text/html",
            ".js": "application/javascript",
            ".css": "text/css",
            ".json": "application/json",
          }[path.extname(file)] || "text/plain",
        );
        res.end(fs.readFileSync(file));
      } catch {
        res.statusCode = 404;
        res.end("Not found");
      }
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "epistemlab-")),
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
        { stdio: ["ignore", "ignore", "pipe"] },
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
          process.env.EPISTEMLAB_URL ||
          `http://127.0.0.1:${server.address().port}/`,
      });
      for (
        let i = 0;
        i < 400 && !(await js("Boolean(window.epistemReport)"));
        i++
      )
        await delay(25);
      assert.ok(await js("Boolean(window.epistemReport)"));
      const cs = JSON.parse(
          fs.readFileSync(
            path.join(__dirname, "../docs/controls.json"),
            "utf8",
          ),
        ),
        reports = [];
      const set = (id, value, event = "change") =>
          js(
            `document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(String(value))};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event(${JSON.stringify(event)}))`,
          ),
        fmt = (f) => {
          const op = f[0];
          if (op === "atom") return f[1];
          if (["true", "false"].includes(op)) return op === "true" ? "⊤" : "⊥";
          if (op === "not") return "¬(" + fmt(f[1]) + ")";
          if (["and", "or"].includes(op))
            return (
              "(" + fmt(f[1]) + (op === "and" ? " ∧ " : " ∨ ") + fmt(f[2]) + ")"
            );
          return (
            op +
            "[" +
            (op === "K" ? f[1] : f[1].join(",")) +
            "](" +
            fmt(f[2]) +
            ")"
          );
        },
        route = (p) =>
          p.worlds
            .map((w, i) => (i ? `-[${p.agents[i - 1].join("&")}]-> ${w}` : w))
            .join(" "),
        setname = (ws) => (ws.length ? "{" + ws.join(", ") + "}" : "∅");
      async function shot(name) {
        if (!process.env.EPISTEMLAB_SCREEN_DIR) return;
        await delay(100);
        await js(
          "document.activeElement.blur();window.scrollTo(0,0);new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))",
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
        fs.writeFileSync(
          path.join(process.env.EPISTEMLAB_SCREEN_DIR, name + ".png"),
          Buffer.from(im.data, "base64"),
        );
      }
      let selections = 0,
        snapshots = 0,
        obligations = 0;
      for (const width of [1280, 390, 320]) {
        await call("Emulation.setDeviceMetricsOverride", {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false,
        });
        for (let i = 0; i < cs.length; i++) {
          await set("control", i);
          const a = await js("window.epistemReport");
          assert.deepEqual(a.request, cs[i].request);
          reports.push(a);
          assert.equal(
            await js('document.getElementById("experiment-title").textContent'),
            cs[i].title,
          );
          assert.equal(
            await js("document.documentElement.scrollWidth>innerWidth"),
            false,
          );
          assert.equal(
            await js('document.querySelectorAll("#round option").length'),
            a.snapshots.length,
          );
          assert.equal(
            await js('document.querySelectorAll("#updates article").length'),
            a.updates.length,
          );
          const updates = await js(
            'Array.from(document.querySelectorAll("#updates article")).map(e=>e.textContent)',
          );
          a.updates.forEach((u, j) => {
            assert.ok(updates[j].includes("Retain " + setname(u.retained)));
            assert.ok(updates[j].includes("Remove " + setname(u.removed)));
            assert.ok(updates[j].includes(setname(u.after_true)));
            if (u.lost_truth.length)
              assert.ok(
                updates[j].includes(
                  "Content became false at retained worlds " +
                    setname(u.lost_truth),
                ),
              );
          });
          await shot(`control-${i}-${width}`);
          for (const snap of a.snapshots) {
            await set("round", snap.round);
            snapshots++;
            assert.deepEqual(
              await js(
                'Array.from(document.querySelectorAll("#worlds article")).map(e=>e.dataset.world)',
              ),
              snap.worlds,
            );
            assert.deepEqual(
              await js(
                'Array.from(document.querySelectorAll("#queries strong")).map(e=>e.textContent)',
              ),
              snap.queries.map((q) =>
                q.value === null
                  ? "ELIMINATED / NULL"
                  : q.value
                    ? "TRUE"
                    : "FALSE",
              ),
            );
            assert.deepEqual(
              await js(
                'Array.from(document.querySelectorAll("#partitions article p")).map(e=>e.textContent)',
              ),
              Object.values(snap.partitions).map(
                (bs) => bs.map(setname).join(" | ") || "No remaining blocks.",
              ),
            );
            assert.equal(
              await js('document.getElementById("world").disabled'),
              snap.worlds.length === 0,
            );
            if (width === 1280) {
              for (let fi = 0; fi < snap.table.length; fi++) {
                await set("formula", fi);
                const row = snap.table[fi];
                assert.equal(
                  await js(
                    'document.getElementById("formula-label").textContent',
                  ),
                  fmt(row.formula),
                );
                assert.equal(
                  await js('document.getElementById("truth-set").textContent'),
                  "True at exactly " + setname(row.truth) + " in this round.",
                );
                for (const w of snap.worlds) {
                  await set("world", w);
                  selections++;
                  assert.equal(
                    await js(
                      'document.getElementById("formula-verdict").textContent',
                    ),
                    `${w}: ${row.truth.includes(w) ? "true" : "false"} in the current restricted model.`,
                  );
                  const ob = row.obligations.find((o) => o.world === w);
                  assert.equal(
                    await js(
                      'document.querySelectorAll("#paths article").length',
                    ),
                    ob ? ob.paths.length : 0,
                  );
                  if (ob) {
                    obligations++;
                    assert.deepEqual(
                      await js(
                        'Array.from(document.querySelectorAll("#paths .path")).map(e=>e.textContent)',
                      ),
                      ob.paths.map(route),
                    );
                    assert.deepEqual(
                      await js(
                        'Array.from(document.querySelectorAll("#paths .pill")).map(e=>e.textContent)',
                      ),
                      ob.paths.map((p) =>
                        snap.table
                          .find(
                            (r) =>
                              JSON.stringify(r.formula) ===
                              JSON.stringify(row.formula[2]),
                          )
                          .truth.includes(p.worlds.at(-1))
                          ? "CHILD TRUE"
                          : "CHILD FALSE",
                      ),
                    );
                    assert.equal(
                      await js(
                        'document.querySelector("#counterexample .path")?.textContent||null',
                      ),
                      ob.failure ? route(ob.failure) : null,
                    );
                  }
                }
              }
            }
            if (!snap.worlds.length) {
              assert.ok(
                (
                  await js(
                    'document.getElementById("formula-verdict").textContent',
                  )
                ).includes("No remaining world"),
              );
              assert.equal(await js("window.epistemSelection.world"), null);
            }
          }
          if (width === 1280) {
            await js(
              'window.downloadBody=null;window.downloadName=null;URL.createObjectURL=b=>{window.downloadBody=b.text();return"blob:test"};URL.revokeObjectURL=()=>{};HTMLAnchorElement.prototype.click=function(){window.downloadName=this.download};document.getElementById("download").click()',
            );
            assert.equal(
              await js("window.downloadName"),
              "epistemlab-evidence.json",
            );
            assert.deepEqual(JSON.parse(await js("window.downloadBody")), a);
          }
        }
      }
      execFileSync(
        process.env.PYTHON || "python",
        [
          "-c",
          `import json,sys;from epistemlab import verify;assert all(verify(r) for r in json.load(sys.stdin))`,
        ],
        {
          input: JSON.stringify(reports),
          encoding: "utf8",
          maxBuffer: 40 * 1024 * 1024,
        },
      );
      await call("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await set("control", 0);
      await set("round", 1);
      const moore = await js("window.epistemReport.request.queries[0]");
      const fi = await js(
        `window.epistemReport.snapshots[1].table.findIndex(r=>JSON.stringify(r.formula)===${JSON.stringify(JSON.stringify(moore))})`,
      );
      await set("formula", fi);
      await shot("state-refuted");
      await set("control", 1);
      const ci = await js(
        'window.epistemReport.snapshots[0].table.findIndex(r=>r.formula[0]==="C")',
      );
      await set("formula", ci);
      assert.ok(
        (
          await js(
            'document.querySelector("#counterexample .path").textContent',
          )
        ).includes("w0 -[a]-> w1 -[b]-> w2"),
      );
      await shot("state-common-chain");
      await set("control", 4);
      await set("round", 2);
      await shot("state-empty");
      await set("control", 7);
      await set("round", 3);
      await shot("state-muddy-final");
      await set("request", "{}", "input");
      assert.equal(await js("window.epistemReport"), null);
      assert.equal(await js('document.getElementById("output").hidden'), true);
      assert.equal(
        await js('document.getElementById("download").disabled'),
        true,
      );
      await js('document.getElementById("build").click()');
      assert.ok(await js('document.getElementById("status").textContent'));
      await shot("state-invalid");
      const invalid = structuredClone(cs[0].request);
      invalid.partitions.a = [["w0"], ["w0", "w1"]];
      await set("request", JSON.stringify(invalid), "input");
      await js('document.getElementById("build").click()');
      assert.ok(
        (await js('document.getElementById("status").textContent')).includes(
          "exactly once",
        ),
      );
      await shot("state-partition-error");
      await set("control", 0);
      assert.ok(await js("window.epistemReport"));
      assert.deepEqual(errors, []);
      console.log(
        JSON.stringify({
          reports: reports.length,
          snapshots,
          selections,
          obligations,
          exportControls: 8,
          stale: true,
          invalid: true,
          partitionError: true,
          empty: true,
          recovery: true,
        }),
      );
    } finally {
      ws?.close();
      // Await process exit before removing its profile. Chrome subprocesses can
      // briefly finish writes after termination; only local cleanup retries.
      const exited = new Promise((r) => browser.once("close", r));
      browser.kill("SIGKILL");
      if (browser.exitCode === null) await exited;
      await new Promise((r) => server.close(r));
      fs.rmSync(profile, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
    }
  },
);
