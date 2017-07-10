{{#each dependencies}}
#include "{{{.}}}"
{{~/each}}

namespace StateMachine {

  {{#each Substates}}
  {{> PointerTemplCpp }}
  {{/each}}
  {{#END}}
  {{{fullyQualifiedName}}}         {{{pointerName}}}_stateObj( );
  {{{fullyQualifiedName}}} *const {{{pointerName}}} = &{{{pointerName}}}_stateObj;
  {{/END}}

  void initialize ( void ) {
  };

{{#each Substates}}
{{> StateTemplCpp }}
{{~/each}}

};
