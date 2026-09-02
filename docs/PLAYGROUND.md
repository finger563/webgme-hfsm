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
- **Draw** it: the **Diagram** tab renders the machine as a UML state
  chart and runs the simulator against it — fire events, watch the
  active state move, step through guards and choice pseudostates.
- **Edit** it: drag a part from the palette into a state, draw a
  transition between two states with the handle on the source, move
  things around, delete a node and the transitions that hung off it.
  Selecting anything shows its attributes in the panel beside the
  diagram, where they can be changed: a state's name, its Entry / Exit
  / Tick, its timer period; a transition's Event, Guard and Action.
  Every committed change is written back into the model text beside
  the diagram, so the two never disagree; press **Generate** when you
  want the code to catch up.
- **Take it away**: view any file, copy it, download one, or download
  all of them.

### Editing attributes

The panel under the diagram shows whatever is selected — a state, a
transition, a pseudostate — and lets its attributes be edited in
place. It is deliberately not a property grid:

- fields are ordered by what the machine **does** (name, Event, Guard,
  Action, Entry/Exit/Tick) with the rarely-touched declarations last,
  rather than alphabetically;
- C++ attributes are edited in CodeMirror, with highlighting, and the
  ⤡ button opens the same text full-size in a modal — with line
  numbers, and Ctrl/Cmd+Enter to save — because a 250px column is not
  where anyone wants to write a state's Entry block. Documentation
  gets the same button: it is prose rather than C++, so it is wrapped
  and unhighlighted instead of numbered, but the need for room is the
  same;
- a `name` or an `Event` that is not a C++ identifier is refused as it
  is typed, with the reason, instead of failing later in the generator
  — or, for an event name, reaching the simulator, which reports it
  with a modal;
- each committed field is one transaction, so it is one undo in a host
  that has undo.

What may be edited comes from the metamodel through
`ModelBackend.getNodeSchema`, so the form cannot drift from what the
model actually allows.

CodeMirror is fetched the first time a code field is shown, not when
the visualizer loads: it is the editor WebGME already bundles and
webgme-codeeditor is built on, so both hosts map the id `codemirror`
onto the same copy and neither pays for it until it is used.

### The same visualizer, not a second one

The diagram is the *same* widget and simulator the WebGME editor runs,
copied into the build verbatim. It reaches its model through
`ModelBackend` and the surrounding application through
`HostServices`, which is what lets it run with no WebGME at all:

| | WebGME | playground |
|---|---|---|
| model | `WebGMEBackend` (client, territories, transactions) | `LocalBackend` (plain JSON, in memory) |
| host UI | `WebGMEHost` (its context menu, part browser, document editor) | `web/host.js` (a menu, a mouse drag, a textarea) |
| what changed | territory events | the difference after each committed transaction |

The palette is derived from `src/common/meta.json`, the same
generated metamodel that decides what `LocalBackend` will let you
create — so a type added to the metamodel appears in the palette
without anyone remembering to add it, and nothing is offered that
would be refused on drop.

Editing is in memory. Nothing is saved anywhere: the model text is
the artifact, and it is yours to copy or download.

Both panes are [CodeMirror](https://codemirror.net/5/) editors, so the
model is edited with JSON highlighting and line numbers, and generated
files are shown highlighted by type: C++ (`.hpp` / `.cpp`), XML
(`.scxml`), and shell (`Makefile`, an approximation — CodeMirror has
no Makefile mode). Mermaid and PlantUML have no mode and render as
plain text. Highlighting is strictly optional: if the editor library
fails to load, the page falls back to a plain textarea and `<pre>` and
generation still works.

## What it does not do

- **No persistence or collaboration.** Nothing leaves the browser;
  there is nowhere to save to. That is the trade for needing no
  infrastructure. Download the model (or copy it out of the editor)
  to keep it.

  A refresh does not cost you your work, though: the model text, the
  namespace and the test-bench setting are kept in `sessionStorage`
  and restored when the page comes back. That is scoped to the TAB, so
  two tabs hold two different drafts rather than overwriting each
  other, and it goes away when the tab does — it is crash protection,
  not storage.
- **No undo.** WebGME's undo is a property of its commit history,
  which is exactly the infrastructure this does without. Reload to
  get back to the model you loaded.
- **The code editor does not yet show its surroundings.** A snippet is
  edited on its own, not inside the function the generator will put it
  in. The `//::::<path>::::<attribute>::::` markers in the generated
  files make that locatable, so it is the next thing.

## Why it cannot drift from the CLI

The playground does not reimplement anything. `scripts/build-web.sh`
copies `src/common/*` and the SoftwareGenerator templates into the
build **verbatim**, and the page loads them with the same AMD module
ids WebGME uses — so the browser runs the same
`resolveModel → checkModel → processor → templates` pipeline as
`hfsm-gen` and the WebGME plugin.

`scripts/verify-web-build.js` enforces that in CI:

1. every expected file is present in the build,
2. every copied source is byte-identical to the original — the whole
   visualizer tree, markup and stylesheets included, with only the two
   WebGME adapters allowed to be absent,
3. `index.html` loads no remote assets (so it works offline),
4. loading the generator **out of the build output** and regenerating
   every bundled example reproduces the committed goldens byte for
   byte — the same goldens `test/generator.spec.js` checks.

If someone changes a template, the goldens move, and this check moves
with them; if the playground ever started producing different output
from the CLI, step 4 fails.

## Namespace

The **Namespace** box is an override and starts empty. Resolution
matches the CLI exactly: an explicit value wins, otherwise the
model's own top-level `namespace`, otherwise `state_machine`. After
generating, the box's placeholder shows the namespace that was
actually used, so an empty box is never ambiguous.

## Model format

Same format the CLI takes — see [CLI.md](CLI.md).

The bundled examples are the project's own machines
(`examples/Simple.json`, `Medium`, `Complex` — hand-laid-out and
exported from WebGME, so they draw the way they do in the editor) plus
the test fixtures themselves (`test/fixtures/*.json`, each built to
show off one feature). Every one of them is generated from and
compared against committed goldens by the test suite, and
`verify-web-build.js` refuses to publish an example that has none — so
the playground can only demo models that CI already covers.
