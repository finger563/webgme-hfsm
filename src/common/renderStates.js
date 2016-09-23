// This code relies on the pre-processing done to the model by modelLoader.js

define(['mustache/mustache','q'], function(mustache,Q) {
    'use strict';

    var templates = {
	// THE CPP CODE IS FOR THE LPC2148 ARM7TDMI-S

	'cpp': {
	    // takes a state as the scope (doesn't need any further pre-processing)
            'setState': [
		"{{prefix}}stateLevel_{{stateLevel}} = {{stateName}};",
		"{{#parentState}}",
		"{{prefix}}{{> setState}}", // recurse here
		"{{/parentState}}"
	    ],

	    // takes a transition as the scope (needs previous state for transition to be pre-processed)
            'transition': [
		"{{prefix}}if ( {{&guard}} ) {",
		"{{prefix}}  changeState = 1;",
		"{{prefix}}  // TRANSITION::{{prevState.name}}->{{nextState.name}}",
		"{{#nextState}}",
		"{{prefix}}  {{> setState}}",
		"{{/nextState}}",
		"{{prefix}}  //stop the current state timer (to change period)",
		"{{prefix}}  hardware_set_soft_timer( 0, state_timer_handle, 0);",
		"{{prefix}}  // start state timer (@ next states period)",
		"{{prefix}}  hardware_set_soft_timer( {{timerPeriod}}, state_timer_handle, 0);",
		"{{prefix}}  // execute the transition function",
		"{{prefix}}  {{&transitionFunc}}",
		"{{prefix}}}"
	    ],

	    // takes a state as the scope
            'execute': [
		"{{prefix}}// STATE::{{name}}",
		"{{prefix}}if (changeState == 0 && stateLevel_{{stateLevel}} == {{stateName}}) {",
		"{{prefix}}  // STATE::{{name}}::TRANSITIONS",
		"{{prefix}}  {{#transitions}}", // if there are any transitions out of this state
		"{{prefix}}  {{> transition}}",
		"{{prefix}}  {{/transitions}}",
		"{{prefix}}  {{#State_list}}",
		"{{prefix}}  {{> execute}}",  // recurse here
		"{{prefix}}  {{/State_list}}",
		"{{#execute}}", // only add the following if execute is true
		"{{prefix}}  // STATE::${name}::FUNCTION",
		"{{prefix}}  if (changeState == 0) {",
		"{{prefix}}    {{&function}}",
		"{{prefix}}  }",
		"{{/execute}}",
		"{{prefix}}}"
	    ],

	    // takes a scope with: root, prefix, and execute
	    // takes partials with: execute, transition, setState
	    'timer': [
		"{{#root.State_list}}",
		"{{> execute}}",
		"{{/root.State_list}}"
	    ],
	},

	// THE BGS CODE IS FOR THE BLUEGIGA BLE113 BLUETOOTH SoC MODULE
	
	'bgs': {
	    // takes a state as the scope (doesn't need any further pre-processing)
            'setState': [
		"{{prefix}}stateLevel_{{stateLevel}} = {{stateName}}",
		"{{#parentState}}",
		"{{prefix}}{{> setState}}", // recurse here
		"{{/parentState}}"
	    ],

	    // takes a transition as the scope (needs previous state for transition to be pre-processed)
            'transition': [
		"{{prefix}}if ( {{&guard}} ) then",
		"{{prefix}}  changeState = 1",
		"{{prefix}}  # TRANSITION::{{prevState.name}}->{{nextState.name}}",
		"{{#nextState}}",
		"{{prefix}}  {{> setState}}",
		"{{/nextState}}",
		"{{prefix}}  # stop the current state timer (to change period)",
		"{{prefix}}  call hardware_set_soft_timer( 0, state_timer_handle, 0)",
		"{{prefix}}  # start state timer (@ next states period)",
		"{{prefix}}  call hardware_set_soft_timer({{parseInt(parseFloat(timerPeriod)*32768.0)}},state_timer_handle,0)",
		"{{prefix}}  # execute the transition function",
		"{{prefix}}  {{&transitionFunc}}",
		"{{prefix}}end if"
	    ],

	    // takes a state as the scope
            'execute': [
		"{{prefix}}# STATE::{{name}}",
		"{{prefix}}if (changeState = 0 && stateLevel_{{stateLevel}} = {{stateName}}) then",
		"{{prefix}}  # STATE::{{name}}::TRANSITIONS",
		"{{prefix}}  {{#transitions}}",
		"{{prefix}}  {{> transition}}",
		"{{prefix}}  {{/transitions}}",
		"{{prefix}}  {{#State_list}}",
		"{{prefix}}  {{> execute}}",
		"{{prefix}}  {{/State_list}}",
		"{{#execute}}",
		"{{prefix}}  # STATE::${name}::FUNCTION",
		"{{prefix}}  if (changeState = 0) then",
		"{{prefix}}    {{&function}}",
		"{{prefix}}  end if",
		"{{/execute}}",
		"{{prefix}}end if\n"
	    ],

	    // takes a scope with: root, prefix, and execute
	    // takes partials with: execute, transition, setState
	    'timer': [
		"{{#root.State_list}}",
		"{{> execute}}",
		"{{/root.State_list}}"
	    ]
	}
    };

    var joined = false;

    return {
	initTemplates: function() {
	    // convert templates from string arrays to multiline strings
	    if (!joined) {
		for (var l in templates) {
		    for (var t in templates[l]) {
			templates[l][t] = templates[l][t].join('\n');
		    }
		}
		joined = true;
	    }
	},

        generateStateFunctions: function(root, language) {
            var self = this;
	    if (language === undefined)
		language = 'cpp';
	    root.timerFunc = self.getStateCode(root, language, true);
	    root.stateTransitions = self.getStateCode(root, language, false);
        },

	getSetState: function(state, language) {
	    if (language === undefined)
		language = 'cpp';
            // use state.transitions object which was built in loader.processModel()
	    var tmpl = templates[language].setState;
	    var view = state;
	    view.prefix = '';
	    var partials = {};
	    return mustache.render(tmpl, view, partials);
	},

        getStateCode: function(root, language, execute) {
	    if (language === undefined)
		language = 'cpp';
	    if (execute === undefined)
		execute = true;
            var prefix = '  ';
            // use state.transitions object which was built in loader.processModel()
	    var tmpl = templates[language].timer;
	    var view = {
		root: root,
		prefix: prefix,
		execute: execute
	    };
	    var partials = {
		'setState': templates[language].setState,
		'transition': templates[language].transition,
		'execute': templates[language].execute,
	    };
	    return mustache.render(tmpl, view, partials);
        }
    }
});
