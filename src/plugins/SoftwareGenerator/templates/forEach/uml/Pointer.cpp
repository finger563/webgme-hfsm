{{#if isDeepHistory}}
StateMachine::DeepHistoryState           {{{pointerName}}}_stateObj( {{#if parent.pointerName}}{{{parent.pointerName}}}{{/if}} );
StateMachine::DeepHistoryState    *const {{{pointerName}}} = &{{{pointerName}}}_stateObj;
{{else if isShallowHistory}}
StateMachine::ShallowHistoryState        {{{pointerName}}}_stateObj( {{#if parent.pointerName}}{{{parent.pointerName}}}{{/if}} );
StateMachine::ShallowHistoryState *const {{{pointerName}}} = &{{{pointerName}}}_stateObj;
{{else if isState}}
{{{fullyQualifiedName}}}        {{{pointerName}}}_stateObj( {{#if parent.pointerName}}{{{parent.pointerName}}}{{/if}} );
{{{fullyQualifiedName}}} *const {{{pointerName}}} = &{{{pointerName}}}_stateObj;
{{/if}}
{{#each Substates}}
{{> PointerTemplCpp }}
{{/each}}

