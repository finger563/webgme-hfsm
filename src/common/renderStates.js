

var templates = {
    'cpp': {
	'guard': "{{prefix}}// STATE::{{state.name}}\
{{prefix}}if (changeState == 0 && stateLevel_{{state.stateLevel}} == {{state.stateName}}) {\
{{prefix}}  // STATE::{{state.name}}::TRANSITIONS\n`;",

	'setState': "{{prefix}}stateLevel_{{state.stateLevel}} = {{state.stateName}};\n",

	'transition': "{{prefix}}if ( {{guard}} ) {\
{{prefix}}  changeState = 1;\
{{prefix}}  // TRANSITION::{{state.name}}->{{nextState.name}}\
{{prefix}}  {{setState}}\
{{prefix}}  //stop the current state timer (to change period)\
{{prefix}}  hardware_set_soft_timer( 0, state_timer_handle, 0);
{{prefix}}  // start state timer (@ next states period)
{{prefix}}  hardware_set_soft_timer( {{period}}, state_timer_handle, 0);
{{prefix}}  // execute the transition function\
{{prefix}}  {{transition}}\
{{prefix}}}\n",

	'': ""
    },
    'bgs': {
    }
};

define(['mustache/mustache','q'], function(mustache,Q) {
    'use strict';
    return {
	generateStateFunctions: function(root, objects, language) {
	    var self = this;
	    self.root = root;
	    self.objects = objects;
	    if (root.State_list) {
		root.stateTransitions = '';
		root.State_list.map(function(state) {
		    self.getStateTimer(state, '  ');
		    self.getStateIRQ(state, '  ');
		    root.stateTransitions += state.irqFunc + '\n';
		});
	    }
	},
	getStateGuardCode: function(state, prefix, language) {
	    var self = this;
	    var tmpl = templates[language].guard;
	    var view = {
		state: state,
		prefix: prefix
	    };
	    var guardCode = mustache.render(tmpl, view);
	    return guardCode;
	},
	getSetStateCode: function(state, language, prefix, objects) {
	    var self = this;
	    if (objects) {
		self.objects = objects;
	    }
	    var tmpl = templates[language].setState;
	    var view = {
		state: state,
		prefix: prefix
	    };
	    var code = mustache.render(tmpl, view);
	    if (self.objects[state.parentPath].type == 'State') {
		code += self.getSetStateCode(self.objects[state.parentPath], language, prefix);
	    }
	    return code;
    	},
	getTransitionCode: function(state, transition, language, prefix, objects) {
	    var self = this;
	    if (objects) {
		self.objects = objects;
	    }
	    var transFunc = '';
	    var guard = transition.guard;

	    var nextState = self.objects[transition.nextState];
	    // get transition function to next state
	    var transitionFunc = transition.function;
	    transitionFunc += self.getInitFunc(nextState);
	    var tLines = transitionFunc.split('\n');
	    // make sure transition function has prefix
	    transitionFunc = '';
	    tLines.map(function(line) {
		transitionFunc += `${prefix}  ${line}\n`;
	    });

	    nextState = self.getStartState(nextState, self.objects);
	    var period = parseInt(parseFloat(nextState.timerPeriod) * 32768.0);

	    var tmpl = templates[language].transition;
	    var view = {
		state: state,
		nextState: nextState,
		setState: self.getSetStateCode(nextState, prefix + '  ');
		period: period,
		prefix: prefix,
		transition: transitionFunc
	    };

	    transFunc += mustache.render(tmpl, view);
	    return transFunc;
	},
	getStateTimer: function(state, language, prefix, objects) {
	    var self = this;
	    if (objects) {
		self.objects = objects;
	    }
	    if (prefix === undefined) {
		prefix = '';
	    }
	    // use state.transitions object which was built in loader.processModel()
	    var tPaths = Object.keys(state.transitions);
	    var timerFunc = '';
	    timerFunc += self.getStateGuardCode(state, prefix);
	    var tPaths = Object.keys(state.transitions);
	    tPaths.map(function(tPath) {
		timerFunc += self.getTransitionCode(state, state.transitions[tPath], prefix + '  ');
	    });
	    if (state.State_list) {
		state.State_list.map(function(substate) {
		    var subStateFunc = self.getStateTimer(substate, prefix + '  ');
		    timerFunc += subStateFunc;
		});
	    }
	    timerFunc += `${prefix}  // STATE::${state.name}::FUNCTION
${prefix}  if (changeState == 0) {\n`;
	    var funcLines = state.function.split('\n');
	    funcLines.map(function(line) {
		timerFunc += `${prefix}    ${line}\n`;
	    });
	    timerFunc += `${prefix}  }\n`;
	    timerFunc += `${prefix}}\n`;
	    state.timerFunc = timerFunc;
	    return timerFunc;
	},
	getStateIRQ: function(state, prefix, objects) {
	    var self = this;
	    if (objects) {
		self.objects = objects;
	    }
	    if (prefix === undefined) {
		prefix = '';
	    }
	    // use state.transitions object which was built in loader.processModel()
	    var tPaths = Object.keys(state.transitions);
	    var irqFunc = '';
	    irqFunc += self.getStateGuardCode(state, prefix);
	    var tPaths = Object.keys(state.transitions);
	    tPaths.map(function(tPath) {
		irqFunc += self.getTransitionCode(state, state.transitions[tPath], prefix + '  ');
	    });
	    if (state.State_list) {
		state.State_list.map(function(substate) {
		    var subStateFunc = self.getStateIRQ(substate, prefix + '  ');
		    irqFunc += subStateFunc;
		});
	    }
	    irqFunc += `${prefix}}\n`;
	    state.irqFunc = irqFunc;
	    return irqFunc;
	},
	getStartState: function(state, objects) {
	    var self = this;
	    if (objects) {
		self.objects = objects;
	    }
	    var initState = state;
	    //self.notify('info', '\t->'+state.name);
	    if (state.State_list && state.Initial_list) {
		if (state.Initial_list.length > 1)
		    throw new String("State " + state.name + ", " +state.path+" has more than one init state!");
		var init = state.Initial_list[0];
		var tPaths = Object.keys(init.transitions);
		if (tPaths.length == 1) {
		    var dstPath = init.transitions[tPaths[0]].nextState;
		    initState = self.getStartState(self.objects[dstPath]);
		}
		else {
		    throw new String("State " + state.name + ", " +state.path+" must have exactly one transition coming out of init!");
		}
	    }
	    else if (state.State_list) {
		throw new String("State " + state.name + ", " + state.path+" has no init state!");
	    }
	    return initState;
	},
	getInitFunc: function(state, objects) {
	    var self = this;
	    if (objects) {
		self.objects = objects;
	    }
	    var initState = state;
	    var tFunc = '\n'
	    //self.notify('info', '\t->'+state.name);
	    if (state.State_list && state.Initial_list) {
		if (state.Initial_list.length > 1)
		    throw new String("State " + state.name + ", " +state.path+" has more than one init state!");
		var init = state.Initial_list[0];
		var tPaths = Object.keys(init.transitions);
		if (tPaths.length == 1) {
		    var dstPath = init.transitions[tPaths[0]].nextState;
		    tFunc += init.transitions[tPaths[0]].function + self.getInitFunc(self.objects[dstPath], objects);
		}
		else {
		    throw new String("State " + state.name + ", " +state.path+" must have exactly one transition coming out of init!");
		}
	    }
	    else if (state.State_list) {
		throw new String("State " + state.name + ", " + state.path+" has no init state!");
	    }
	    return tFunc;
	},
    }
});
