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
./scripts/serve-web.py dist/web 8080
```

`serve-web.py` is `http.server` with caching turned off. Plain
`python3 -m http.server` sends no cache headers, so a browser keeps
serving the module it fetched before your last build and the page
stops changing when the code does — which looks like a bug in the
page, not in the server.

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

### A snippet, inside the function it ends up in

Popping a code attribute out to the big editor shows it **framed by
the generated code around it**: the function signature, the
`[[maybe_unused]] auto &x = _root->x;` aliases that say exactly which
of the machine's variables are in scope, and the brace that closes it
— greyed out, above and below the part you are editing.

That question — *what can I write here?* — previously had no answer
inside the tool. People generated the code and read it, which meant
leaving the editor.

It costs no new machinery. The generator already marks every snippet
it emits:

    //::::<path>::::<attribute>::::

so `src/common/viz/codeContext.js` finds the marker and takes the
lines around it. No C++ is parsed and nothing knows about the
templates; a test asserts the marker it looks for is the one
`StateTempl.cpp` still emits, so the two cannot drift apart quietly.

A snippet can land in **several** places — a transition's Action is
compiled into every site that can take that transition, six of them
for one transition in the Complex example — so the header says
`1 of 6 places this is generated into` and ‹ › step between them.
Being told that is worth more than any one of the six.

Two rules keep the frame honest.

**It never contains another snippet.** Someone else's Guard greyed out
inside your Action frame would read as scaffolding that cannot be
changed, when it is editable somewhere else. Stopping at the
neighbouring *marker* is not enough — the marker is followed by the
neighbour's code — so the neighbour is located the same way, and the
frame starts after it.

**It is measured against the model the code was generated from**, not
against what is being typed. Measuring with the editor's text slid the
frame the moment anyone edited a snippet: shorten a four-line action
to one and three orphaned lines appeared below it; lengthen it and the
frame skipped the brace that closed the function.

A snippet is also not always a run of whole lines. A Guard is emitted
*inside* a line — `else if ( <guard> ) {` — so the value is **located**
in the text rather than counted in lines, and a guard is framed
exactly as it is compiled, with `else if (` above it and `) {` below.
If the value is not where the marker says it should be, the file was
generated from a different model, and there is no frame at all rather
than one drawn in the wrong place.

The frame comes from the host, through the optional `generated()`
service, which returns the files **and the model they came from** —
both together, because files paired with the wrong model produce a
frame that is fiction. Where generated code comes from is genuinely
host-specific: the playground generates in the page and has both to
hand, while in WebGME the plugin runs on the server and the visualizer
has never seen its output. A host that cannot
answer loses the frame and nothing else — including a host whose
generation just failed, which is caught rather than allowed to stop
the editor opening.

## Comparing two machines

**Compare…** on the Diagram tab puts a second model beside the one in
the editor and shows what changed: added in green, removed in red and
dashed, changed in amber, with a list beside the diagram saying what
each change actually was.

You can compare against **the version you loaded** — the most useful
one, because it answers *what have I changed?* — against any built-in
example, or against a file.

### Why not a text diff

The models are JSON, so `diff` works and is close to useless on
them: it reports the order keys came out in, the coordinates of every
node you dragged, and one added state as a dozen unrelated lines.
`src/common/diffModel.js` compares the **portable form** of each
model — the same canonicalisation the CLI writes to a file — so it
inherits the exporter's answers about which keys are real attributes,
which values are defaults not worth writing down, and what a pointer
is, instead of deciding any of that a second time.

Three rules do most of the work:

- **Position is not a change.** Dragging a state does not change what
  the machine does. Layout differences are counted separately, as
  *moved*, and never as changes — otherwise the one guard that really
  changed is buried under forty moved nodes.
- **Objects are matched by identity, then by structure.** By path
  first, so two versions of the same project match exactly and a
  rename is a rename rather than an add and a remove. Then by
  (type, name) under a parent that already matched, so two models
  built separately from the same design — sharing no ids at all —
  still compare sensibly. A transition is matched by **what it
  connects**, not by its name: they are all called "External
  Transition" until someone renames one, and nobody does.
- **An ambiguous match is not made.** Two states with the same name
  under the same parent are left as an add and a remove rather than
  paired by a coin toss, because a wrong pairing reads as a change
  that never happened.

### What is drawn

A **union** of the two: the newer machine, with whatever the older one
had and it does not put back where it used to be. "Where it used to
be" has to be said in the new model's terms — containment in this
format *is* the path — so a removed object is re-homed under whatever
its nearest surviving ancestor became, and its pointers are rewritten
to match. A test resolves the union for every pair of examples, both
ways round, because a union that does not resolve is not a diagram, it
is an exception.

The comparison is **read-only**: what is on screen belongs to neither
model, so an edit could not be saved back to either without silently
picking one. The palette goes away and Save layout is hidden while it
is on.

A removed transition whose endpoint is in neither model cannot be
drawn at all. It is dropped — and said, in the panel, rather than
quietly left out.

## What it does not do

- **No persistence or collaboration.** Nothing leaves the browser;
  there is nowhere to save to. That is the trade for needing no
  infrastructure. Download the model (or copy it out of the editor)
  to keep it.

  A refresh does not cost you your work, though: the model text, the
  namespace, the test-bench setting and which tab you were on are kept
  in `sessionStorage` and restored when the page comes back. That is
  scoped to the TAB, so two tabs hold two different drafts rather than
  overwriting each other, and it goes away when the tab does — it is
  crash protection, not storage.

  Where the panes are split — the model/output separator and whether
  the model text is collapsed, plus the two separators inside the
  diagram — is kept in `localStorage` instead. The two are stored
  differently on purpose: a draft is WORK, and one tab must never
  overwrite what another is editing, whereas a layout is a
  PREFERENCE, and someone who likes a narrow editor and a wide diagram
  wants that in the next tab and tomorrow. So: model per tab, layout
  across the browser. Both fail quietly — with storage unavailable the
  page simply opens with its defaults.
- **No undo.** WebGME's undo is a property of its commit history,
  which is exactly the infrastructure this does without. Reload to
  get back to the model you loaded.
- **No undo in the code editor beyond CodeMirror's own.** Ctrl-Z
  inside a snippet works; there is no undo for the edit once it is
  saved. See the note about undo above.

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
