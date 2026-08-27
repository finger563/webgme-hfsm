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

## Dependencies

From a dev checkout of this repo everything needed is already in
`node_modules` / `bower_components`. For a minimal install (e.g. CI),
only these packages are required:

```sh
npm install --no-save --ignore-scripts requirejs requirejs-text handlebars underscore
```

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
    "/p/m/S1":   { "name": "S1", "type": "State", "Timer Period": 0.1 }
  }
}
```

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
