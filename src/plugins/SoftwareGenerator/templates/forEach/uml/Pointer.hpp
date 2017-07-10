{{#if isDeepHistory}}
extern StateMachine::DeepHistoryState *const {{{pointerName}}};
{{else if isShallowHistory}}
extern StateMachine::ShallowHistoryState *const {{{pointerName}}};
{{else if isState}}
extern {{{fullyQualifiedName}}} *const {{{pointerName}}};
{{/if}}
{{#each Substates}}
{{> PointerTemplHpp }}
{{/each}}
