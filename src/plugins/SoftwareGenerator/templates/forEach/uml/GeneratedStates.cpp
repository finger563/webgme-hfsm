{{#dependencies}}
#include "{{{.}}}"
{{/dependencies}}

namespace StateMachine {

{{#Substates}}
{{> StateTemplCpp }}
{{/Substates}}

};
