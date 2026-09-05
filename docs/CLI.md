# The command-line tools

Two, sharing the same `src/common` pipeline the WebGME plugin and the
playground run: [`hfsm-gen`](#hfsm-gen-standalone-code-generator-cli)
generates, [`hfsm-diff`](#hfsm-diff-what-changed-between-two-models)
compares.

# hfsm-gen: Standalone Code Generator CLI

`bin/hfsm-gen.js` runs the same model-check -> process -> template
pipeline as the WebGME `SoftwareGenerator` plugin, but takes a plain
JSON model file as input, so code generation works in CI, scripts,
and tests without a WebGME server.

## Usage

```sh
node bin/hfsm-gen.js <model.json> [options]

  -o, --out <dir>        output directory (default: ./generated)
  -n, --namespace <ns>   C++ namespace (default: state_machine)
  -t, --test-bench       also generate the test bench (Makefile + test.cpp)
  -e, --export <fmts>    comma-separated interop exports:
                         mermaid, plantuml, scxml (or 'all')
      --no-code          skip C++ code generation (exports only)
```

Examples:

```sh
# generate C++ + test bench for a model
node bin/hfsm-gen.js test/fixtures/features.json -o out -t

# diagrams / SCXML only
node bin/hfsm-gen.js my_model.json -o out --no-code -e all
```

Every run also writes `hfsm_metadata.json` recording the input file,
its sha256, the namespace, and a timestamp, so generated code can be
traced back to the exact model that produced it.

# hfsm-diff: what changed between two models

`bin/hfsm-diff.js` runs the same comparison the playground draws --
`src/common/diffModel.js` -- in a terminal.

```sh
node bin/hfsm-diff.js <before.json> <after.json> [options]

  -q, --quiet            print nothing; the exit status is the answer
      --json             machine-readable output
      --moved            list objects that only moved
      --exit-zero        always exit 0, even when they differ
```

```
$ node bin/hfsm-diff.js examples/Simple.json edited.json
examples/Simple.json -> edited.json
  1 added, 2 changed, 15 moved
  + Extra  [State]
  ~ Waiting  [State]
      name: State 1 -> Waiting
  ~ External Transition INPUTEVENT  [External Transition]
      Guard: buttonPressed && data.button_id == 12 -> neverEver
```

## Exit status

| status | meaning |
| ------ | ------- |
| 0 | the machines are the same |
| 1 | they differ |
| 2 | something went wrong -- unreadable file, bad JSON |

Three states rather than two on purpose: a CI job that treats "the
file is corrupt" as "the machine changed" reports the wrong thing.

## A layout difference is not a difference

Dragging a state changes nothing about what the machine does, so a
model whose nodes have only moved **exits 0** -- otherwise reopening a
model in the editor and saving it would fail the build. The move is
still counted in the summary, and `--moved` lists what moved.

This is also why `git diff` is close to useless on these files: it
reports every coordinate, the order keys came out in, and one added
state as a dozen unrelated lines.

## In CI

```sh
# fail the build if a PR changes the machine without saying so
node bin/hfsm-diff.js "$(git show origin/main:model.json > /tmp/base.json;
                         echo /tmp/base.json)" model.json
```

or, to report without failing:

```sh
node bin/hfsm-diff.js --exit-zero base.json model.json
```

Transitions are named by their **event**, not by their name: every
transition in a model is called "External Transition" until someone
renames one, so a list of six of those names nothing. The rule lives
in `describe.labelFor`, shared with the playground's change list, so
the two cannot end up calling the same transition different things.

For how objects are matched between the two models -- and why an
ambiguous match is deliberately not made -- see
[PLAYGROUND.md](PLAYGROUND.md#comparing-two-machines).

## Installing

The CLI is on npm, and installing it does **not** drag in the WebGME
editor -- `webgme` and friends are optional peer dependencies, so npm
leaves them alone:

```sh
npm install webgme-hfsm      # ~10 packages
npx hfsm-gen model.json -o generated
```

Or without installing anything permanently:

```sh
npx -p webgme-hfsm hfsm-gen model.json -o generated
```

Only `node` is required -- no MongoDB, no WebGME server, no bower.
That is the intended way to generate code from a build system, a CI
job, or a Makefile, rather than checking generated sources in.

## Dependencies

From a dev checkout of this repo everything needed is already in
`node_modules` / `bower_components`. For a minimal install (e.g. CI),
only these packages are required:

```sh
npm install --no-save --ignore-scripts requirejs requirejs-text handlebars underscore
```

These are the CLI's real dependencies, and they are what `npm install
webgme-hfsm` brings with it.

## Generating only the machine

By default the generator emits the machine *and* the small runtime it
depends on — `state_base.hpp`, `deep_history_state.hpp`,
`shallow_history_state.hpp` and `magic_enum.hpp`. Those four are the
same for every machine.

A project that already vendors that runtime wants the other three
files and not these, because its own copies are the ones the rest of
its code is built against — a second `state_base.hpp` beside the
generated machine lands on the include path and shadows them:

```sh
hfsm-gen my_machine.json -o generated --no-support
```

The machine itself is byte-for-byte the same either way; the flag
decides what gets written, not what gets rendered.

`--test-bench` expects the support headers (its Makefile builds
standalone), so asking for both warns.

[espp's `state_machine` example][espp] uses this from CMake: the model
is checked in, the C++ is generated at build time, and the runtime
comes from the component rather than from the generator.

[espp]: https://github.com/esp-cpp/espp/tree/main/components/state_machine/example

## Model JSON format

The input is the `webgme-to-json` format: a map of objects keyed by
their containment path, plus a `root` path. Hand-authored models can
be terse -- `src/common/resolveModel.js` fills in defaults (empty code
attributes, `Enabled: true` on transitions, `<Type>_list` arrays,
parent paths derived from paths). See `test/fixtures/*.json` and
`sample_code/Simple/Simple_model.json` for complete examples.

```json
{
  "root": "/p",
  "objects": {
    "/p":        { "name": "Project", "type": "Project" },
    "/p/m":      { "name": "Machine", "type": "State Machine",
                   "Includes": "#include <cstdio>",
                   "Declarations": "int count = 0;" },
    "/p/m/i":    { "name": "Initial", "type": "Initial" },
    "/p/m/ti":   { "name": "init", "type": "External Transition",
                   "pointers": { "src": "/p/m/i", "dst": "/p/m/S1" } },
    "/p/m/S1":   { "name": "S1", "type": "State", "Timer Period": 0.1,
                   "position": { "x": 240, "y": 120 } }
  }
}
```

### Layout

`position` (`{ x, y }`, in pixels) is part of the format, not an
editor detail. Arranging a state chart so that it reads well is real
work, and a model that does not carry the arrangement loses it every
time it leaves the editor -- and then draws differently in WebGME and
in the playground.

The `SoftwareGenerator` plugin writes `<Machine>_model.json` alongside
the generated code, carrying the layout as the editor left it. Feed
that file to the CLI or drop it into the playground and the diagram
comes out the same as it looks in WebGME.

Models without positions still load: the playground arranges them
automatically, and the CLI ignores the field entirely (no generated
output depends on it). A malformed `position` is rejected rather than
reaching the diagram as a `NaN` coordinate.

`Library` roots generate code and interop exports exactly like
`State Machine` roots, but no test bench (a library is not an
executable machine by itself). Artifact names derive from sanitized
machine names; two machines whose outputs would collide are rejected.
With several machines in one model, each gets its own
`Makefile.<name>` (build with `make -f Makefile.<name>`); a single
machine keeps the conventional `Makefile`.

Object types: `Project`, `State Machine`, `Library`, `State`,
`Initial`, `End State`, `Choice Pseudostate`,
`Deep History Pseudostate`, `Shallow History Pseudostate`,
`External Transition`, `Local Transition`, `Internal Transition`,
`Event`, `Field`.

### Event payloads

An `Event` object (child of the machine) declares the payload for
every transition whose `Event` attribute matches its name; its
`Field` children have `Type` (C++ type, default `int`), `Default`
(initializer expression), and `Description` attributes:

```json
"/p/m/eBtn":    { "name": "BUTTON_PRESS", "type": "Event" },
"/p/m/eBtn/f1": { "name": "button_id", "type": "Field",
                  "Type": "int", "Default": "3" }
```

Guards and transition actions on that event can then use the `data`
alias, e.g. `"Guard": "data.button_id == 3"`. See
`test/fixtures/payloads.json` for a complete example and
[SEMANTICS.md](SEMANTICS.md) for payload scoping rules.

Code attributes (`Entry`, `Exit`, `Tick`, `Guard`, `Action`,
`Declarations`, ...) are C++ fragments. Inside state-scope code
(entry/exit/tick/guards/actions), machine variables from
`Declarations` can be referenced directly by name (`count > 5`) --
the generator binds reference aliases -- or explicitly through
`_root->` (`_root->count > 5`); both are equivalent. Unparsed
declarations (functions, arrays, ...) require `_root->`. See
[SEMANTICS.md](SEMANTICS.md) for the exact rules.

## Interop exports

| Format   | Extension | Notes |
|----------|-----------|-------|
| Mermaid  | `.mmd`    | `stateDiagram-v2`; history pseudostates render as plain states labeled `H` / `H*` (mermaid has no history notation); embeddable in GitHub markdown |
| PlantUML | `.puml`   | Full notation incl. `[H]` / `[H*]` and `<<choice>>`; local transitions drawn dashed |
| SCXML    | `.scxml`  | W3C SCXML structure; guards/actions/entry/exit carried verbatim as C++ in `cond=` / `<script>`; tick and timer period carried as `hfsm:`-namespaced attributes; choice pseudostates map to states with only eventless conditional transitions; UML *local* transitions map to SCXML `type="internal"` |

The SCXML export is a structural interchange format (states,
hierarchy, events, transition topology are standard SCXML); the
embedded code is C++, not an SCXML datamodel, so it will not execute
in an SCXML interpreter as-is. SCXML *import* is planned work.

## Regenerating the shipped samples

`sample_code/Simple` is fully regenerated from its committed model
(CI enforces zero drift):

```sh
cd sample_code/Simple
node ../../bin/hfsm-gen.js Simple_model.json -o . -t
```
