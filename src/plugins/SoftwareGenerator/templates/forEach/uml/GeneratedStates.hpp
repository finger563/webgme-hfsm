#ifndef __GENERATED_STATES_INCLUDE_GUARD__
#define __GENERATED_STATES_INCLUDE_GUARD__

#include "StateBase.hpp"
#include "DeepHistoryState.hpp"
#include "ShallowHistoryState.hpp"

namespace StateMachine {

{{#each Substates}}
{{> StateTemplHpp}}
{{~/each}}

{{#END}}
{{> EndStateTemplHpp}}
{{~/END}}

};

#endif // __GENERATED_STATES_INCLUDE_GUARD__
