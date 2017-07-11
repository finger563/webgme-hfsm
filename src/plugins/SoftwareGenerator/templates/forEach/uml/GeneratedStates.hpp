#ifndef __GENERATED_STATES_INCLUDE_GUARD__
#define __GENERATED_STATES_INCLUDE_GUARD__

#include "StateBase.hpp"
#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"

namespace StateMachine {

  // ROOT OF THE HFSM
{{> StateTemplHpp this}}

{{#END}}
{{> EndStateTemplHpp}}
{{~/END}}

};

// pointers
extern StateMachine::StateBase *const root;
{{> PointerTemplHpp this}}
{{#END}}
extern StateMachine::{{{fullyQualifiedName}}} *const {{{pointerName}}};
{{~/END}}

#endif // __GENERATED_STATES_INCLUDE_GUARD__
