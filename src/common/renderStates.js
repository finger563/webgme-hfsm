// This code relies on the pre-processing done to the model by modelLoader.js

/* 
TODO:
  * Figure out how to properly handle END states
*/

define(['mustache/mustache','q'], function(mustache,Q) {
    'use strict';

    var templates = {

	'c': {
	    'definitions': [
		"void {{stateName}}_execute    ( void );",
		"void {{stateName}}_setState   ( void );",
		"void {{stateName}}_transition ( void );",
	    ],

	    'setStateFunction': [
		"void {{stateName}}_setState ( void ) {",
		"  stateLevel_{{stateLevel}} = {{stateName}};",
		"{{#parentState}}",
		"  {{stateName}}_setState();",
		"{{/parentState}}",
		"}",
	    ],

	    'executeFunction': [
		"void {{stateName}}_execute ( void ) {",
		"  if (changeState || stateLevel_{{stateLevel}} != {{stateName}}) return;",
		"  {{stateName}}_transition();",
		"{{#State_list}}",
		"  {{stateName}}_execute();",    // execute all substates
		"{{/State_list}}",
		"{{#execute}}",     // only add the following if execute is true
		"  // STATE::{{name}}::FUNCTION",
		"  if (changeState == 0) {",
		"{{&function}}",    // run the state function
		"  }",
		"{{/execute}}",
		"}",
	    ],

	    'transitionFunction': [
		"void {{stateName}}_transition ( void ) {",
		"  if (changeState) return;",
		"{{#transitions}}", 
		"{{> transition}}", // check all transitions 
		"{{/transitions}}",
		"}",
	    ],

	    // takes a transition as the scope (needs previous state for transition to be pre-processed)
            'transition': [
		"  else if ( {{&guard}} ) {",
		"    changeState = 1;",
		"    // TRANSITION::{{prevState.name}}->{{finalState.name}}",
		"{{#finalState}}",
		"    {{stateName}}_setState();",
		"    // start state timer (@ next states period)",
		"    stateDelay = {{#convertPeriod}}{{&timerPeriod}}{{/convertPeriod}};",
		"{{/finalState}}",
		"    // execute the transition function",
		"{{&transitionFunc}}",
		"  } // END::TRANSITION::{{prevState.name}}->{{finalState.name}}\n",
	    ],

	    // takes a scope with: root(state), getPrefix(function), and execute(bool)
	    // takes partials with: execute, transition, setState
	    'timer': [
		"changeState = 0;",
		"{{#root.State_list}}",
		"{{stateName}}_execute();",
		"{{/root.State_list}}",
		"task_timed_cancel_masked((enum task_id)task_id_timer_update, 0, 0, 0, 0);",
		"if (!changeState) {",
		"  task_send_timed((enum task_id)task_id_timer_update, 0, 1, stateDelay);",
		"}",
		"else {",
		"  task_send_msg((enum task_id)task_id_timer_update, 0, 1);",
		"}",
	    ],
	},
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
		templates.cpp = templates.c;
	    }
	},

        generateStateFunctions: function(root, language) {
            var self = this;
	    if (language === undefined)
		language = 'cpp';
	    root.timerFunc = self.getStateCode(root, language, true);
	    root.stateTransitions = self.getStateCode(root, language, false);
        },

	getPrefix: function() {
	    return function(val, render) {
		var rendered = render(val);
		var prefix = '  ';
		for (var i=0; i <this.stateLevel; i++) {
		    prefix += '  ';
		}
		rendered = rendered.replace(/^(\S|\s)/gm, prefix + "$1");
		return rendered;
	    };
	},

	getSetState: function(state, language) {
	    if (language === undefined)
		language = 'cpp';
            // use state.transitions object which was built in loader.processModel()
	    var tmpl = templates[language].setState;
	    var view = state;
	    view.getPrefix = this.getPrefix;
	    var partials = {
		'setState': templates[language].setState,
	    };
	    return mustache.render(tmpl, view, partials);
	},

        getStateCode: function(root, language, execute) {
	    if (language === undefined)
		language = 'cpp';
	    if (execute === undefined)
		execute = true;
            // use state.transitions object which was built in loader.processModel()
	    var tmpl = templates[language].timer;
	    var view = {
		root: root,
		execute: execute,
		convertPeriod: function() {
		    return function(val, render) {
			return parseInt(parseFloat(render(val))*32768.0);
		    };
		},
		getPrefix: this.getPrefix
	    };
	    var partials = {
		'transition': templates[language].transition,
	    };
	    return mustache.render(tmpl, view, partials);
        }
    }
});
