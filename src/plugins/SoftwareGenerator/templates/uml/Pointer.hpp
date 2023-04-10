{{#each Substates}}
{{> PointerTemplHpp }}
{{/each}}
{{#if isDeepHistory}}
state_machine::DeepHistoryState {{{pointerName}}};
{{else if isShallowHistory}}
state_machine::ShallowHistoryState {{{pointerName}}};
{{else if isState}}
{{{fullyQualifiedName}}} {{{pointerName}}};
{{/if}}
