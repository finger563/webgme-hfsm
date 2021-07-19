# Software Generator

The software generator converts the HFSM model into executable C++
code. It also optionally provides a generated test main which allows
for spawning events and viewing the response of the HFSM in a
terminal.

The Software Generator also checks the HFSM for consistency.

## Runtime Code Design

* Events are generated as enum classes
* The HFSM is designed to be integrated with other code which will
  generate events, run the HFSM execution loop (handle events) and
  pass any data to the HFSM / retrieve any data from the HFSM
  required.

## Consistency Checks

* No two transitions out of a state should have the same Event / Guard combination
* All complete states containing children must have an initial state
  configured and properly wired up to transition to one of their
  children (this is a `WARNING` log in the log panel instead of an
  alert)
* Any substate containing an End State must have an End Transition (no
  event) leaving the state
* States cannot have more than one End Transition
* End Transitions cannot have guard conditions
* Choice pseudostates must have a default (unguarded) transition -
  this is currently reported as a `WARNING` in the log panel.
* States should not have any transitions without an Event unless they
  contain an End State

Additionally, the following constraints must be true:

* All leaf states must have a valid non-zero timer period (note: timer
  periods for non-leaf states are unused)
* No substates (e.g. any state other than the root) should have
  `Includes` set.
