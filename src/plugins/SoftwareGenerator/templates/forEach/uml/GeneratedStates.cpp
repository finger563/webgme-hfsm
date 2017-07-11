#include "Events.hpp"
{{#each dependencies}}
#include "{{{.}}}"
{{/each}}

namespace StateMachine {

  {{> PointerTemplCpp this}}

  {{#END}}
  StateMachine::StateBase         {{{pointerName}}}_stateObj;
  StateMachine::StateBase *const  {{{pointerName}}} = &{{{pointerName}}}_stateObj;
  {{/END}}

{{> StateTemplCpp this }}
};

// Root of the HFSM
StateMachine::StateBase *const root = &StateMachine::{{{pointerName}}}_stateObj;
// Event Factory
StateMachine::EventFactory EVENT_FACTORY;
StateMachine::EventFactory *const eventFactory = &EVENT_FACTORY;

