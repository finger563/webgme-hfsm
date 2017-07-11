{{#if isDeepHistory}}
extern StateMachine::DeepHistoryState *const {{{pointerName}}};
{{else if isShallowHistory}}
extern StateMachine::ShallowHistoryState *const {{{pointerName}}};
{{else if isState}}
extern StateMachine::{{{fullyQualifiedName}}} *const {{{pointerName}}};
{{else if isRoot}}
extern StateMachine::{{{fullyQualifiedName}}} *const {{{pointerName}}};
{{/if}}
{{#each Substates}}
{{> PointerTemplHpp }}
{{/each}}
