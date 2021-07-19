{{#if isDeepHistory}}
StateMachine::DeepHistoryState {{{pointerName}}};
{{else if isShallowHistory}}
StateMachine::ShallowHistoryState {{{pointerName}}};
{{else if isState}}
{{{fullyQualifiedName}}} {{{pointerName}}};
{{/if}}
{{#each Substates}}
{{> PointerTemplHpp }}
{{/each}}
