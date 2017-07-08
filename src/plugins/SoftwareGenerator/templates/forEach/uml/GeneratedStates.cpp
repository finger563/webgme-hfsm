{{#each dependencies}}
#include "{{{.}}}"
{{~/each}}

namespace StateMachine {

{{#each Substates}}
{{> StateTemplCpp }}
{{~/each}}

};
