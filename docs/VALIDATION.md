# Model Validation and CI

## Model checks

`src/common/checkModel.js` validates every model before generation
(the same checks run in the WebGME plugin and the CLI). Violations
abort generation with an error naming the offending object.

Names and events:

- State and machine names must be valid C++ identifiers after
  sanitization (spaces/hyphens become underscores) and must not be
  C++ keywords or identifiers reserved by the generated code
  (`Root`, `StateBase`, `EventType`, ...).
- Sibling states cannot share a name.
- Two events whose names differ only by case are rejected.
- Local and internal transitions must have events.

Structure:

- Transitions must have valid `src`/`dst` pointers.
- A composite state (one with child states) must contain exactly one
  `Initial` state, whose single outgoing transition has no event and
  no guard and stays within the parent (including through chains of
  choice pseudostates).
- A local transition's `src`/`dst` must be in a direct parent-child
  relationship; otherwise it is converted to an external transition
  (with a console warning).
- Leaf states must have a non-zero `Timer Period`.
- States cannot set `Includes` (only the machine can).

Event payload definitions:

- `Event` definition names must be valid identifiers, unique, and not
  case-collide with any used event name.
- `Field` names must be valid identifiers, unique within their event,
  and not `data` (reserved for the generated payload alias); field
  types must be non-empty.

Non-fatal warnings (generation proceeds; the CLI prints them to
stderr, the WebGME plugin raises them as notifications, and the
simulator's Variables panel marks the offending rows with ⚠):

- A state `Declarations` variable with the same name as a machine
  variable shadows it in that state's code -- bare references there
  resolve to the state's variable, not the machine's.

Determinism:

- At most one unguarded transition per (state, event); duplicate
  event/guard pairs are rejected.
- Choice pseudostates must have exactly one unguarded outgoing
  transition (the "else" branch) and their outgoing transitions
  cannot have events.
- A state with an end transition (no event) must contain an End
  State, and vice versa; end transitions cannot have guards.

## Test suite

`npm test` runs the mocha suites (no WebGME server needed) --
`test/generator.spec.js` and `test/declParser.spec.js` (the
best-effort `Declarations` parser shared by the simulator's variable
panel and the generator; its contract -- simple single-declarator
statements are reflected, everything else is reported opaque -- is
pinned by its spec):

- **checkModel regression tests** -- one test per validation rule,
  including every rule that previously never fired due to generator
  bugs (composite-without-Initial, events on choice exits,
  local-transition conversion, keyword names, ...).
- **processor tests** -- event collection, deterministic transition
  ordering, per-branch unhandled-event computation.
- **Golden generation tests** -- the full pipeline runs over
  `test/fixtures/*.json` and the output (C++, test bench, Mermaid,
  PlantUML, SCXML) is byte-compared against `test/goldens/<fixture>/`.
  After an intentional template change, refresh with
  `UPDATE_GOLDENS=1 npm test` and review the golden diff in the PR.

`scripts/run_generated_tests.sh` then validates the *behavior* of the
committed golden code:

1. compiles it with `-Wall -Wextra -Werror` (generated code must be
   warning-clean),
2. compiles it again with Address + UndefinedBehavior sanitizers,
3. runs the test bench with the scripted event sequence from
   `test/traces/<fixture>.input`,
4. normalizes the output and diffs it against
   `test/traces/<fixture>.expected`.

The trace fixtures exercise: entry/exit/action ordering, guarded and
chained choice transitions, internal transitions, local transitions,
deep vs. shallow history, end states, restart, and tick. After an
intentional behavior change, refresh with
`UPDATE_TRACES=1 scripts/run_generated_tests.sh` and review the diff.

Because the simulator (JS) and the generated code (C++) implement the
same semantics independently, `docs/SEMANTICS.md` is the contract for
both; the trace fixtures are the executable form of that contract for
the C++ side.

## CI (GitHub Actions)

`.github/workflows/ci.yml`:

- **generator** -- unit + golden tests, generated-code compile +
  sanitizers + trace diff, CLI smoke test, SCXML well-formedness
  check (`xmllint`).
- **samples** (Linux + macOS) -- builds every `sample_code/` project
  with its own Makefile and runs it with scripted input, verifying
  clean exit on end-of-input.
- **regen-simple** -- regenerates `sample_code/Simple` from its
  committed model and fails on any drift between the templates and
  the committed sample.
