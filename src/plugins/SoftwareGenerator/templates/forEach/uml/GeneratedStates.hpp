#ifndef __GENERATED_STATES_INCLUDE_GUARD__
#define __GENERATED_STATES_INCLUDE_GUARD__

#include "StateBase.hpp"
#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"

namespace StateMachine {

  void initialize ( void );

{{#each Substates}}
{{> StateTemplHpp}}
{{~/each}}

{{#END}}
{{> EndStateTemplHpp}}
{{~/END}}

};

// pointers
{{#each Substates}}
{{> PointerTemplHpp }}
{{~/each}}
{{#END}}
extern StateMachine::{{{fullyQualifiedName}}} *const {{{pointerName}}};
{{~/END}}

#endif // __GENERATED_STATES_INCLUDE_GUARD__
