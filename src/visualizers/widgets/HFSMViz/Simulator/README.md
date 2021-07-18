# Simulator

The simulator allows you to test in the browser the behavior of your
HFSM in response to certain events and allows you to see what
transitions will be taken and which guards will be evaulated.

The Simulator also checks the HFSM for consistency.

## Consistency Checks

* No two transitions out of a state should have the same Event / Guard combination
* All complete states containing children must have an initial state
  configured and properly wired up to transition to one of their
  children
* Any substate containing an End State must have an End Transition (no
  event) leaving the state
