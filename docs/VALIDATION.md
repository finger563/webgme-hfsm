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
  no guard and targets a direct child of the parent (including every
  destination reachable through chains of choice pseudostates).
- A local transition's destination must be a direct child of its
  source (composite parent -> child); anything else -- including the
  reverse direction -- is converted to an external transition (with a
  console warning).
- Every attribute must hold what the metamodel says it holds: text
  where text is declared, `true`/`false` where a boolean is. JSON
  carries anything, and a hand-written `"Default": 12` -- or a
  `null`, which is a value somebody wrote rather than an absent
  attribute -- used to reach
  `.trim()` and come back as a TypeError with a stack trace instead
  of a model error. Booleans are strict rather than lenient: the
  generator asks `Enabled === false`, so the string `"false"` would
  read as enabled and silently generate a transition its author had
  disabled. Quoted booleans are refused rather than rewritten --
  WebGME stores real booleans, so a quoted one is a mistake worth
  naming rather than guessing at.
- **Every** state's `Timer Period` must be a finite number and not
  negative — composites included, because `getTimerPeriod()` is
  emitted for every state and a value C++ cannot return breaks the
  build. The value must *be* a number (or a string spelling one):
  `[]` coerces to `0` through `Number()` and would render as
  `return (double)();`.
- **0 means no timer**, and that meaning is leaf-specific, since
  `sleep_until_event()` asks the active leaf. It is the metamodel
  default, so every freshly created state has one. A leaf with `Tick`
  code and no timer is a *warning*, not an error: the code is legal
  and still runs, just at whatever rate the event loop turns over
  rather than on a schedule.
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
- An *unparsed* state declaration mentioning a machine-variable name
  is conservatively treated as shadowing: no bare-name alias is
  generated for it in that state.

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

Every golden has a trace, INCLUDING the three example machines the
playground ships (`Simple`, `Medium`, `Complex`) -- they are the
models a new user actually opens, so they are also run, not merely
compiled. A golden with no `.input` is a failure rather than a skip:
skipping quietly is how those three came to be generated and compiled
for a while without anything ever executing them.

Two of them earn their place by pinning behaviour that is easy to
break silently. `Medium` leaves `State1::Child2::Grand`, wanders
through `State2`/`State3`/`State4`, and returns through a deep history
pseudostate -- the trace asserts it lands back in `Grand`, not in the
default child. `Simple` is the odd one: its guards
(`buttonPressed && ...`, and a `Test` payload whose vector is empty)
cannot pass from the C++ test bench, which has no way to set a
variable, so nothing ever transitions. That makes it the cleanest
possible check of the rule in `docs/SEMANTICS.md` that a guard is
evaluated BEFORE any exit or transition action: the trace shows
`HANDLED ...: false` with no `EXIT` line anywhere near it. The
machine is not broken -- in the simulator you set `buttonPressed`
yourself and it moves.

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
