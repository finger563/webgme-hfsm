// This code relies on the pre-processing done to the model by modelLoader.js

/* 
TODO:
  * Figure out how to properly handle END states
*/

define(['mustache/mustache','q'], function(mustache,Q) {
    'use strict';

    var templates = {

	'c': {
	    // takes a state as the scope (doesn't need any further pre-processing)
            'setState': [
		"    stateLevel_{{stateLevel}} = {{stateName}};",
		"{{#parentState}}",
		"{{> setState}}", // recurse here
		"{{/parentState}}"
	    ],

	    // takes a transition as the scope (needs previous state for transition to be pre-processed)
            'transition': [
		"  if ( {{&guard}} ) {",
		"    changeState = 1;",
		"    // TRANSITION::{{prevState.name}}->{{finalState.name}}",
		"{{#finalState}}",
		"{{> setState}}",
		"    // start state timer (@ next states period)",
		"    stateDelay = {{#convertPeriod}}{{&timerPeriod}}{{/convertPeriod}};",
		"    task_send_msg((enum task_id)task_id_timer_update, 0, 1);",
		//"    hardware_set_soft_timer({{#convertPeriod}}{{&timerPeriod}}{{/convertPeriod}},state_timer_handle,0);",
		"{{/finalState}}",
		"    // execute the transition function",
		"{{&transitionFunc}}",
		"  } // END::TRANSITION::{{prevState.name}}->{{finalState.name}}\n"
	    ],

	    // takes a state as the scope
            'execute': [
		"{{#getPrefix}}",
		"// STATE::{{name}}",
		"if (changeState == 0 && stateLevel_{{stateLevel}} == {{stateName}}) {",
		"  // STATE::{{name}}::TRANSITIONS",
		"{{#transitions}}", 
		"{{> transition}}", // check all transitions 
		"{{/transitions}}",
		"{{#State_list}}",
		"{{> execute}}",    // execute all substates (transitions and functions)
		"{{/State_list}}",
		"{{#execute}}",     // only add the following if execute is true
		"  // STATE::${name}::FUNCTION",
		"  if (changeState == 0) {",
		"{{&function}}",    // run the state function
		"  }",
		"{{/execute}}",
		"}",
		"{{/getPrefix}}",
	    ],

	    // takes a scope with: root(state), getPrefix(function), and execute(bool)
	    // takes partials with: execute, transition, setState
	    'timer': [
		"{{#root.State_list}}",
		"{{> execute}}",
		"{{/root.State_list}}",
		"if (!changeState)",
		"  task_send_timed((enum task_id)task_id_timer_update, 0, 1, stateDelay);"
	    ],
	},

	
	'bgs': {
	    // takes a state as the scope (doesn't need any further pre-processing)
            'setState': [
		"    stateLevel_{{stateLevel}} = {{stateName}}",
		"{{#parentState}}",
		"{{> setState}}", // recurse here
		"{{/parentState}}"
	    ],

	    // takes a transition as the scope
	    'transition': [
		"  if ( {{&guard}} ) then",
		"    changeState = 1",
		"    # TRANSITION::{{prevState.name}}->{{finalState.name}}",
		"{{#finalState}}",
		"{{> setState}}",
		"    # stop the current state timer (to change period)",
		"    call hardware_set_soft_timer( 0, state_timer_handle, 0)",
		"    # start state timer (@ next states period)",
		"    call hardware_set_soft_timer({{#convertPeriod}}{{&timerPeriod}}{{/convertPeriod}},state_timer_handle,0)",
		"{{/finalState}}",
		"    # execute the transition function", // run the transition function
		"{{&transitionFunc}}", // not indented because we pre-indent the function
		"  end if # END::TRANSITION::{{prevState.name}}->{{finalState.name}}\n",
	    ],

	    // takes a state as the scope
            'execute': [
		"{{#getPrefix}}",
		"# STATE::{{name}}",
		"if (changeState = 0 && stateLevel_{{stateLevel}} = {{stateName}}) then",
		"  # STATE::{{name}}::TRANSITIONS",
		"{{#transitions}}",
		"{{> transition}}",// check all transitions 
		"{{/transitions}}",
		"{{#State_list}}",
		"{{> execute}}",   // execute all substates (transitions and functions)
		"{{/State_list}}",
		"{{#execute}}",    // only add the following if execute is true
		"  # STATE::{{name}}::FUNCTION",
		"  if (changeState = 0) then",
		"{{&function}}",   // run the state function
		"  end if # END::STATE::FUNCTION",
		"{{/execute}}",
		"end if # END::STATE::{{name}}\n",
		"{{/getPrefix}}",
	    ],

	    // takes a scope with: root(state), getPrefix(function), and execute(bool)
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
		'setState': templates[language].setState,
		'transition': templates[language].transition,
		'execute': templates[language].execute,
	    };
	    return mustache.render(tmpl, view, partials);
        }
    }
});
