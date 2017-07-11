#include "Events.hpp"
{{#each dependencies}}
#include "{{{.}}}"
{{/each}}

namespace StateMachine {

  {{> PointerTemplCpp this}}

  {{#END}}
  {{{fullyQualifiedName}}}         {{{pointerName}}}_stateObj;
  {{{fullyQualifiedName}}} *const {{{pointerName}}} = &{{{pointerName}}}_stateObj;
  {{/END}}

{{> StateTemplCpp this }}
};

// Root of the HFSM
StateMachine::StateBase *const root = &StateMachine::{{{pointerName}}}_stateObj;

