const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  { spawn, execFileSync } = require("node:child_process"),
  { waitForDebugger } = require("./chrome_support.cjs");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
test(
  "Chrome every disclosure mask, goal frontier, defining cube and post-update obligation",
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
          process.env.EPISTEMLAB_DISCLOSURES_URL ||
          `http://127.0.0.1:${server.address().port}/disclosures.html`,
      });
      for (
        let i = 0;
        i < 400 && !(await js("Boolean(window.disclosureReport)"));
        i++
      )
        await delay(25);
      assert.ok(await js("Boolean(window.disclosureReport)"));
      const controls = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, "../docs/disclosure-controls.json"),
          "utf8",
        ),
      );
      const expected = JSON.parse(
        execFileSync(
          process.env.PYTHON || "python",
          [
            "-c",
            `import json;from epistemlab.disclosure_oracle import reconstruct;from epistemlab.oracle import expected
cs=json.load(open('docs/disclosure-controls.json'));out=[]
for c in cs:
 a=reconstruct(c['request']);details=[]
 for rec in a['records']:
  r=a['request'];ws=rec['retained'];ss=set(ws)
  if not ws:details.append(None);continue
  rr=dict(r,worlds=ws,focus=ws[0],valuation={w:r['valuation'][w] for w in ws},partitions={ag:sorted([sorted(set(b)&ss) for b in bs if set(b)&ss]) for ag,bs in r['partitions'].items()})
  details.append(expected(rr)['snapshots'][0])
 out.append(dict(atlas=a,details=details))
print(json.dumps(out))`,
          ],
          { encoding: "utf8", maxBuffer: 80 * 1024 * 1024 },
        ),
      );
      const set = (id, value, event = "change") =>
        js(
          `document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(String(value))};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event(${JSON.stringify(event)}))`,
        );
      const clickMask = (m) =>
        js(`document.querySelector('#masks button[data-mask="${m}"]').click()`);
      const setname = (ws) => (ws.length ? "{" + ws.join(", ") + "}" : "∅");
      const route = (p) =>
        p.worlds
          .map((w, i) => (i ? `-[${p.agents[i - 1].join("&")}]-> ${w}` : w))
          .join(" ");
      async function shot(name) {
        if (!process.env.EPISTEMLAB_DISCLOSURES_SCREEN_DIR) return;
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
          path.join(
            process.env.EPISTEMLAB_DISCLOSURES_SCREEN_DIR,
            name + ".png",
          ),
          Buffer.from(im.data, "base64"),
        );
      }
      let masks = 0,
        goals = 0,
        frontiers = 0,
        details = 0,
        modal = 0,
        toggles = 0,
        exports = 0;
      const reports = [];
      for (const width of [1280, 390, 320]) {
        await call("Emulation.setDeviceMetricsOverride", {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false,
        });
        for (let i = 0; i < controls.length; i++) {
          await set("control", i);
          const a = await js("window.disclosureReport");
          assert.deepEqual(a, expected[i].atlas);
          reports.push(a);
          assert.equal(
            await js("document.documentElement.scrollWidth>innerWidth"),
            false,
          );
          for (let q = 0; q < a.goals.length; q++) {
            await set("goal", q);
            goals++;
            assert.deepEqual(
              await js(
                '[...document.querySelectorAll("#maximal button")].map(b=>Number(b.dataset.mask))',
              ),
              a.goals[q].maximal,
            );
            assert.deepEqual(
              await js(
                '[...document.querySelectorAll("#maximum button")].map(b=>Number(b.dataset.mask))',
              ),
              a.goals[q].maximum,
            );
            const all = await js(
              '[...document.querySelectorAll("#masks button")].map(b=>({mask:Number(b.dataset.mask),definable:b.dataset.boolean==="true",success:b.dataset.success==="true"}))',
            );
            assert.deepEqual(
              all,
              a.records.map((r) => ({
                mask: r.mask,
                definable: r.boolean_definable,
                success: a.goals[q].successes.includes(r.mask),
              })),
            );
            const buttons = await js(
              '[...document.querySelectorAll("#maximal button,#maximum button,#nonmonotone button,#gap button")].map(b=>({id:b.parentElement.id,mask:Number(b.dataset.mask)}))',
            );
            for (const b of buttons) {
              await js(
                `document.querySelector('#${b.id} button[data-mask="${b.mask}"]').click()`,
              );
              assert.equal(await js("window.disclosureSelection"), b.mask);
              frontiers++;
            }
          }
          await set("goal", 0);
          for (const r of a.records) {
            await clickMask(r.mask);
            masks++;
            const display = await js(
              `({values:[...document.querySelectorAll('#query-values article')].map(e=>e.lastElementChild.textContent),sets:[...document.querySelectorAll('#query-sets article')].map(e=>e.lastElementChild.textContent),definition:document.getElementById('definition').textContent,selected:window.disclosureSelection,parts:[...document.querySelectorAll('#partitions article')].map(e=>e.lastElementChild.textContent)})`,
            );
            assert.equal(display.selected, r.mask);
            assert.deepEqual(
              display.values,
              r.values.map((v) =>
                v === null ? "ELIMINATED / NULL" : v ? "TRUE" : "FALSE",
              ),
            );
            assert.deepEqual(display.sets, r.truth_sets.map(setname));
            if (!r.boolean_definable) {
              assert.ok(display.definition.includes(r.obstruction.kept));
              assert.ok(display.definition.includes(r.obstruction.removed));
              assert.ok(display.definition.includes("No such formula"));
            } else {
              const atoms = a.request.atoms,
                dnf = r.dnf_cubes.length
                  ? r.dnf_cubes
                      .map(
                        (bits) =>
                          "(" +
                          (bits.length
                            ? bits
                                .map((v, j) => (v ? "" : "¬") + atoms[j])
                                .join(" ∧ ")
                            : "⊤") +
                          ")",
                      )
                      .join(" ∨ ")
                  : "⊥";
              assert.ok(display.definition.includes(dnf));
            }
            const ss = expected[i].details[r.mask];
            if (ss) {
              assert.deepEqual(
                display.parts,
                Object.values(ss.partitions).map((bs) =>
                  bs.map(setname).join(" | "),
                ),
              );
              if (width === 1280) {
                const w = r.focus_survives ? a.request.focus : r.retained[0];
                for (let fi = 0; fi < ss.table.length; fi++) {
                  await set("detail-formula", fi);
                  details++;
                  const row = ss.table[fi],
                    ob = row.obligations.find((o) => o.world === w) || null;
                  assert.deepEqual(await js("window.disclosureDetail"), {
                    formula: fi,
                    world: w,
                    truth: row.truth,
                    obligation: ob,
                  });
                  if (ob) {
                    modal++;
                    assert.deepEqual(
                      await js(
                        '[...document.querySelectorAll("#paths article")].map(e=>e.lastElementChild.textContent)',
                      ),
                      ob.paths.map(route),
                    );
                    const failure = await js(
                      'document.getElementById("failure").textContent',
                    );
                    assert.ok(
                      failure.includes(
                        ob.failure ? route(ob.failure) : "Every obligation",
                      ),
                    );
                  }
                }
              }
            } else {
              assert.equal(
                await js('document.getElementById("detail-world").disabled'),
                true,
              );
              assert.equal(
                await js('document.querySelectorAll("#paths article").length'),
                0,
              );
            }
          }
          for (let j = 0; j < a.request.worlds.length; j++) {
            const before = await js("window.disclosureSelection");
            await js(
              `document.querySelector('#toggles button[data-world="${a.request.worlds[j]}"]').click()`,
            );
            assert.equal(
              await js("window.disclosureSelection"),
              before ^ (1 << j),
            );
            toggles++;
          }
          await clickMask(a.records.length - 1);
          await shot(`control-${i}-${width}`);
          if (width === 1280) {
            await js(
              "window.downloadBody=null;URL.createObjectURL=b=>{b.text().then(t=>window.downloadBody=t);return 'blob:local-test'};URL.revokeObjectURL=()=>{};HTMLAnchorElement.prototype.click=function(){};document.getElementById('download').click()",
            );
            for (let t = 0; t < 100 && !(await js("window.downloadBody")); t++)
              await delay(10);
            assert.deepEqual(JSON.parse(await js("window.downloadBody")), a);
            exports++;
          }
        }
      }
      execFileSync(
        process.env.PYTHON || "python",
        [
          "-c",
          "import json,sys;from epistemlab.disclosure_oracle import verify_atlas;assert all(verify_atlas(r) for r in json.load(sys.stdin))",
        ],
        {
          input: JSON.stringify(reports),
          encoding: "utf8",
          maxBuffer: 80 * 1024 * 1024,
        },
      );
      await call("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      for (const [name, i, m, q] of [
        ["maximal-small", 0, 3, 0],
        ["gap", 1, 9, 0],
        ["loss", 2, 1, 0],
        ["empty", 0, 0, 0],
      ]) {
        await set("control", i);
        await set("goal", q);
        await clickMask(m);
        await shot("state-" + name);
      }
      await set("request", "{}", "input");
      assert.equal(await js("window.disclosureReport"), null);
      assert.equal(await js('document.getElementById("output").hidden'), true);
      assert.equal(
        await js('document.getElementById("download").disabled'),
        true,
      );
      await js('document.getElementById("run").click()');
      await shot("state-invalid");
      await set("control", 0);
      const invalid = structuredClone(controls[0].request);
      invalid.announcements = [["true"]];
      await set("request", JSON.stringify(invalid), "input");
      await js('document.getElementById("run").click()');
      assert.equal(await js("window.disclosureReport"), null);
      await shot("state-anchor-error");
      await set("control", 0);
      assert.ok(await js("window.disclosureReport"));
      assert.deepEqual(errors, []);
      console.log(
        JSON.stringify({
          reports: reports.length,
          masks,
          goals,
          frontiers,
          details,
          modal,
          toggles,
          exports,
          stale: true,
          invalid: true,
          anchorError: true,
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
