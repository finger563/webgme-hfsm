{{#each Substates}}
{{> PointerTemplHpp }}
{{/each}}
{{#if isDeepHistory}}
DeepHistoryState {{{pointerName}}};
{{else if isShallowHistory}}
ShallowHistoryState {{{pointerName}}};
{{else if isState}}
{{{fullyQualifiedName}}} {{{pointerName}}};
{{/if}}
