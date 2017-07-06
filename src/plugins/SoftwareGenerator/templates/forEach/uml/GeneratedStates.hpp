#ifndef __GENERATED_STATES_INCLUDE_GUARD__
#define __GENERATED_STATES_INCLUDE_GUARD__

#include "StateBase.hpp"
#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"

namespace StateMachine {

{{#Substates}}
{{> StateTemplHpp }}
{{/Substates}}

};

#endif // __GENERATED_STATES_INCLUDE_GUARD__
