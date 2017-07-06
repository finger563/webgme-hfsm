#ifndef __GENERATED_STATES_INCLUDE_GUARD__
#define __GENERATED_STATES_INCLUDE_GUARD__

#include "Event.hpp"

namespace StateMachine {

{{#State_list}}
{{> StateTemplHpp }}
{{/State_list}}

};

#endif // __GENERATED_STATES_INCLUDE_GUARD__
