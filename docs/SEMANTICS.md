# HFSM Execution Semantics

This document defines the execution semantics implemented by both the
in-model simulator and the generated C++ code. Where these semantics
deviate from the UML State Machine specification, the deviation is
deliberate and documented.

## Event processing

- Events are spawned into a thread-safe FIFO queue (the
  `EventFactory`) and processed one at a time, to completion
  (run-to-completion): an event's transition, including all exit
  actions, transition actions, and entry actions, finishes before the
  next event is examined. Events spawned *during* handling are
  appended to the queue and handled before `handle_all_events()`
  returns.
- An event is offered to the innermost active (leaf) state first. A
  state first checks its **internal transitions**, then its **external
  (and local) transitions**, in that order. If the state cannot handle
  the event, it bubbles up to its parent, ending at the top-level
  state. Unconsumed events are discarded (there is no deferral).
- Within one state and event, candidate transitions are checked in a
  fixed order: **guarded transitions first** (ordered by model path,
  deterministically), then the single unguarded transition, if any.
  The first transition whose guard evaluates true is taken. The model
  checker rejects two unguarded transitions on the same event and two
  transitions with an identical event/guard pair.
- The generated dispatcher short-circuits events which no state in the
  active branch (leaf through root) handles ("unhandled events"
  optimization); this is behaviorally invisible.

## Guard evaluation (deliberate deviation from UML)

**Guards are evaluated before any exit or transition action runs** --
including the guards on a choice pseudostate's outgoing transitions
reached through a compound transition. A transition chain that does
not end up firing therefore has *zero* side effects: no state is
exited and no action runs unless the complete path (source guard plus
a viable choice branch) is committed.

UML instead prescribes that the actions of a compound transition
segment execute before a downstream choice's guards are evaluated
("dynamic conditional branch"). We reject that behavior on purpose:
it can exit states and mutate data for a transition that then finds
no enabled branch, leaving the machine in a partially-exited
configuration. The practical contract is:

- **Guards must be side-effect-free.** They may read HFSM state
  (`_root->...`) but must not modify it.
- A choice's guards may not depend on the *actions* of the incoming
  transition segment (those have not run yet); they see the state as
  it was when the event was dispatched.
- Every choice pseudostate must have exactly one unguarded (else)
  outgoing transition (enforced by the model checker), so a committed
  transition always completes.

## Transition execution order

For a transition from source `S` to target `T` with common ancestor
`A` (determined after guard evaluation commits the transition):

1. Exit actions run from the active leaf up to (but not including)
   `A`: leaf first, `S`'s own exit last of its subtree.
2. Transition actions run in segment order (source transition first,
   then each committed choice segment).
3. Entry actions run from below `A` down to `T`.
4. `T` is initialized: its initial transition (and that of each
   descendant) runs, entering the default leaf.

External self-transitions (and external transitions between a state
and its ancestor/descendant) exit and re-enter the common state.
**Local transitions** do not exit/re-enter the source composite
state: only the source's active descendants are exited before the
target child is entered. Local transitions must go from a composite
state to one of its direct children; the model checker converts
anything else (including child-to-parent) to an external transition.

## Variable access in user code

Code attributes that run in state scope (entry, exit, tick, guards,
transition actions) can reference the machine's `Declarations`
variables **directly by name**: the generator binds reference aliases
(`[[maybe_unused]] auto &name = _root->name;`) at the top of every
generated state function. `someNumber < someValue` and
`_root->someNumber < _root->someValue` are equivalent — the aliases
are plain C++ references, so optimized code is identical either way,
and both spellings may be mixed freely.

Limits (best-effort, by design):

- Only declarations the parser understands are aliased (simple
  single-declarator statements; see `docs/VALIDATION.md`). Functions,
  arrays, multi-declarator statements, and other unparsed
  declarations remain reachable via `_root->` only.
- Variables named `event`, `handled`, or `data` collide with
  generated locals and are never aliased (use `_root->`).
- A state's own `Declarations` shadow same-named machine variables in
  that state's code (normal C++ scoping; no alias is generated for
  the shadowed name). If an *unparsed* state declaration mentions a
  machine-variable name, that name is conservatively treated as
  shadowed too -- no alias is generated in that state and a warning
  is raised; use `_root->` there when the machine variable is
  intended.
- A payload field with the same name as a machine variable is not
  ambiguous: `data.name` is the field, bare `name` is the variable.

## Event payloads

Events may carry typed payload fields, declared by an `Event`
definition object (with `Field` children) whose name matches the
transitions' `Event` attribute. An event with no definition has an
empty payload. Defined events participate in the machine's event set
even when no transition uses them yet (event-library semantics).

- Fields are value-initialized; a field's `Default` attribute, if
  set, is its initializer expression.
- In generated code, the payload is available as `data` (a const
  reference to the event's `<Event>EventData` struct) **only inside
  guards and transition actions of transitions triggered by that
  event** (internal and external alike). Entry, exit, and tick
  actions cannot see `data`: a state can be entered by many different
  events, so payload access there would be ill-defined. Move
  payload-dependent work into the transition action, or copy the
  needed values into HFSM variables there.
- Guards may read `data`; the side-effect-free guard contract applies
  unchanged.
- A field cannot be named `data` (it would shadow the alias).

In the simulator, an event's payload values are edited in the Events
panel and used for every spawn of that event. Enabling **prompt for
payload on spawn** instead asks for that spawn's values each time a
payload-carrying event button is clicked (pre-filled from the panel,
and written back to it when accepted), which is the quicker way to
walk a guard through several payload values in one session.

## History

- **Shallow history** re-enters the parent's most recent direct child
  and then runs that child's *initial* behavior for anything deeper.
- **Deep history** re-enters the entire most-recent active path down
  to the leaf.
- If the region has never been active, both fall back to the
  parent's initial transition.
- Entry actions are run for every state re-entered through history,
  in outer-to-inner order.

## End states

Entering the top-level End State stops the machine: the End State
consumes every event without effect, and `has_stopped()` returns
true. `terminate()` runs the exit actions of the active configuration
(leaf upward); `restart()` terminates and re-initializes.

## Tick

`tick()` runs from the top-level state *down* to the active leaf
(parent tick actions before child tick actions). Ticks are not
events: they are not queued and do not participate in transition
dispatch, but tick actions may spawn events.

## Timers

Each leaf state has a `Timer Period`: the seconds between ticks while
that state is active, or **0 for no timer**.

`sleep_until_event()` sleeps until an event arrives or the *active
leaf's* period elapses, whichever is first. With a period of 0 there
is nothing to wait for, so it blocks until an event arrives rather
than spinning on a zero timeout — which is also what the End State
does, and always did.

The typical event loop is:

```cpp
root.initialize();
while (running) {
  root.handle_all_events();
  root.tick();
  root.handle_all_events();
  root.sleep_until_event();
}
```

Note what zero does and does not do. `tick()` is called every time
round this loop, before the wait — so a period of 0 does **not** stop
the active state's `Tick` code running. What it stops is anything
*waking* the loop on a schedule: with no period the only thing that
ends `sleep_until_event()` is an event arriving, so the loop turns
over at whatever rate events happen to arrive, and the tick with it.
Zero means *this state has no clock of its own*, not *this state does
nothing*.

Zero is also the metamodel default, so a state you have just created
has no timer until you give it one. The checker used to reject that,
which made every freshly created state invalid; it now accepts it and
**warns instead when a state has `Tick` code but no timer**, since
that code then runs only as often as events arrive.

Every state's period is validated -- not just leaves -- because
`getTimerPeriod()` is emitted for all of them and a value C++ cannot
return breaks the build. Non-numeric and negative periods are
rejected; the zero-means-no-timer *meaning*, and the `Tick` warning,
apply to leaves, since `sleep_until_event()` asks the active leaf.

## Threading contract

- `spawn_*_event()` (and the underlying `EventFactory`) is
  thread-safe and may be called from any thread (or ISR-equivalent
  context that can take a mutex).
- **Everything else is single-threaded by contract**: exactly one
  thread may call `initialize()`, `handleEvent()`,
  `handle_all_events()`, `tick()`, `terminate()`, and `restart()`.
  The state tree itself is unsynchronized.

## Memory model

Each spawned event is heap-allocated and freed after it is handled
(`consume_event`). Queue, mutex, and condition variable come from the
C++ standard library. This is appropriate for hosted platforms
(Linux/macOS/ESP32-class); a static-allocation profile for small MCUs
is planned work.
