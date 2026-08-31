# HFSM Playground (static web app)

A single-page app that runs the model checker, the C++ code
generator, and the interop exporters **entirely in the browser** — no
server, no database, no authentication, no accounts, no CDN.

It exists because the full WebGME editor needs infrastructure
(Node + MongoDB, see [DEPLOYMENT.md](DEPLOYMENT.md)) that is overkill
when all you want is to turn a model into code, or to let someone try
the generator without installing anything.

## Running it

```bash
npm run web          # build + serve on http://localhost:8080
```

or, to build and serve separately:

```bash
npm run build:web                          # -> dist/web
python3 -m http.server -d dist/web 8080
```

It must be served over http(s): the template loader uses XHR, so
opening `index.html` from the filesystem will not work.

The build output is self-contained (about half a megabyte) and can be
dropped on any static host. `.github/workflows/pages.yml` publishes it
to GitHub Pages on every push to `main` that touches the generator,
the templates, or the page itself.

## What it does

- **Load** a model: pick a bundled example, open a `.json` file, drop
  one anywhere on the page, or paste JSON directly.
- **Validate**: model errors stop generation and are shown verbatim;
  non-fatal warnings (shadowed variables, converted local
  transitions, ...) are shown the way the CLI prints them.
- **Generate**: the full C++ HFSM, optionally with the test bench,
  plus Mermaid / PlantUML / SCXML exports.
- **Take it away**: view any file, copy it, download one, or download
  all of them.

Both panes are [CodeMirror](https://codemirror.net/5/) editors, so the
model is edited with JSON highlighting and line numbers, and generated
files are shown highlighted by type: C++ (`.hpp` / `.cpp`), XML
(`.scxml`), and shell (`Makefile`, an approximation — CodeMirror has
no Makefile mode). Mermaid and PlantUML have no mode and render as
plain text. Highlighting is strictly optional: if the editor library
fails to load, the page falls back to a plain textarea and `<pre>` and
generation still works.

## What it does not do (yet)

- **No editing or simulation.** Those live in the WebGME visualizer,
  which is built on WebGME's client APIs (territories, transactions,
  GME nodes). Bringing them across means decoupling the simulator
  from those APIs — tracked with the Rust/WASM work.
- **No persistence or collaboration.** Nothing leaves the browser;
  there is nowhere to save to. That is the trade for needing no
  infrastructure.

## Why it cannot drift from the CLI

The playground does not reimplement anything. `scripts/build-web.sh`
copies `src/common/*` and the SoftwareGenerator templates into the
build **verbatim**, and the page loads them with the same AMD module
ids WebGME uses — so the browser runs the same
`resolveModel → checkModel → processor → templates` pipeline as
`hfsm-gen` and the WebGME plugin.

`scripts/verify-web-build.js` enforces that in CI:

1. every expected file is present in the build,
2. the copied `src/common` modules are byte-identical to the sources,
3. `index.html` loads no remote assets (so it works offline),
4. loading the generator **out of the build output** and regenerating
   every bundled example reproduces the committed goldens byte for
   byte — the same goldens `test/generator.spec.js` checks.

If someone changes a template, the goldens move, and this check moves
with them; if the playground ever started producing different output
from the CLI, step 4 fails.

## Model format

Same format the CLI takes — see [CLI.md](CLI.md). The bundled
examples are the test fixtures themselves (`test/fixtures/*.json`),
so the playground can only demo models that CI already covers.
