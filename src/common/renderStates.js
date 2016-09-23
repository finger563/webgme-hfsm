// This code relies on the pre-processing done to the model by modelLoader.js

var templates = {
    // THE CPP CODE IS FOR THE LPC2148 ARM7TDMI-S

    'cpp': {
	// takes a state as the scope (doesn't need any further pre-processing)
        'setState': "{{prefix}}stateLevel_{{stateLevel}} = {{stateName}};\
{{#parentState}}
{{> setState}}
{{/parentState}}",

	// takes a transition as the scope (needs previous state for transition to be pre-processed)
        'transition': "{{prefix}}if ( {{guard}} ) {\
{{prefix}}  changeState = 1;\
{{prefix}}  // TRANSITION::{{prevState.name}}->{{nextState.name}}\
{{#nextState}}
{{prefix}}  {{> setState}}\
{{/nextState}}
{{prefix}}  //stop the current state timer (to change period)\
{{prefix}}  hardware_set_soft_timer( 0, state_timer_handle, 0);
{{prefix}}  // start state timer (@ next states period)
{{prefix}}  hardware_set_soft_timer( {{period}}, state_timer_handle, 0);
{{prefix}}  // execute the transition function\
{{prefix}}  {{transitionFunc}}\
{{prefix}}}\n",

	// takes a state as the scope
        'execute': "{{prefix}}// STATE::{{name}}\
{{prefix}}if (changeState == 0 && stateLevel_{{stateLevel}} == {{statename}} {\
{{prefix}}  // STATE::{{name}}::TRANSITIONS\
{{prefix}}  {{#transitions}}
{{prefix}}  {{> transition}}
{{prefix}}  {{/transitions}}
{{prefix}}  {{#State_list}}
{{prefix}}  {{> execute}}
{{prefix}}  {{/State_list}}
{{#execute}}
{{prefix}}  // STATE::${name}::FUNCTION
{{prefix}}  if (changeState == 0) {\
{{prefix}}    {{function}}
{{prefix}}  }\
{{/execute}}
{{prefix}}}\n",

	// takes the root level as the scope
	'timer': "{{#State_list}}
{{> execute}}
{{/State_list}}"
    },

    // THE BGS CODE IS FOR THE BLUEGIGA BLE113 BLUETOOTH SoC MODULE
    
    'bgs': {
	// takes a state as the scope (doesn't need any further pre-processing)
        'setState': "{{prefix}}stateLevel_{{stateLevel}} = {{stateName}}\
{{#parentState}}
{{> setState}}
{{/parentState}}",

	// takes a transition as the scope (needs previous state for transition to be pre-processed)
        'transition': "{{prefix}}if ( {{guard}} ) then\
{{prefix}}  changeState = 1\
{{prefix}}  # TRANSITION::{{prevState.name}}->{{nextState.name}}\
{{#nextState}}
{{prefix}}  {{> setState}}\
{{/nextState}}
{{prefix}}  # stop the current state timer (to change period)\
{{prefix}}  hardware_set_soft_timer( 0, state_timer_handle, 0)
{{prefix}}  # start state timer (@ next states period)
{{prefix}}  hardware_set_soft_timer( {{period}}, state_timer_handle, 0)
{{prefix}}  # execute the transition function\
{{prefix}}  {{transitionFunc}}\
{{prefix}}end if\n",

	// takes a state as the scope
        'execute': "{{prefix}}# STATE::{{name}}\
{{prefix}}if (changeState = 0 && stateLevel_{{stateLevel}} = {{statename}} then\
{{prefix}}  # STATE::{{name}}::TRANSITIONS\
{{prefix}}  {{#transitions}}
{{prefix}}  {{> transition}}
{{prefix}}  {{/transitions}}
{{prefix}}  {{#State_list}}
{{prefix}}  {{> execute}}
{{prefix}}  {{/State_list}}
{{#execute}}
{{prefix}}  # STATE::${name}::FUNCTION
{{prefix}}  if (changeState = 0) then\
{{prefix}}    {{function}}
{{prefix}}  end if\
{{/execute}}
{{prefix}}end if\n",

	// takes the root level as the scope
	'timer': "{{#State_list}}
{{> execute}}
{{/State_list}}"
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
        }
    }
});
