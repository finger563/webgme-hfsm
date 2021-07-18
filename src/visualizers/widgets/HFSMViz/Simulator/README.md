# Simulator

The simulator allows you to test in the browser the behavior of your
HFSM in response to certain events and allows you to see what
transitions will be taken and which guards will be evaulated.

The Simulator also checks the HFSM for consistency.

## Consistency Checks

Note: for performance and development reasons, checks are performed
lazily by the simulator - this means that consistency checks will only
be performed when the simulator is handling transitions and the
consistency checks will only be evaluated on states the simulator
transitions into / out of.

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

Note: the simulator does _NOT_ (to better enable iterative
development) check the following conditions:

* States should not have any transitions without an Event unless they
  contain an End State
