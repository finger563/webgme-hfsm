

define(['q'], function(Q) {
    'use strict';
    return {
	sanitizeString: function(str) {
	    return str.replace(/[ \-]/gi,'_');
	},
	isValidString: function(str) {
	    var varDeclExp = new RegExp(/^[a-zA-Z_][a-zA-Z0-9_]+$/gi);
	    return varDeclExp.test(str);
	},
	processModel: function(model) {
	    var self = this;
	    // THIS FUNCTION HANDLES CREATION OF SOME CONVENIENCE MEMBERS
	    // FOR SELECT OBJECTS IN THE MODEL
	    // get state outgoing transition guards
	    var topLevelStateNames = [];
	    var objPaths = Object.keys(model.objects);
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		// Make sure task is good
		if (obj.type == 'Task') {
		    var taskName = self.sanitizeString(obj.name);
		    if (!self.isValidString(taskName))
			throw new String("Task " + obj.path + " has invlaid task name: " + obj.name);
		    obj.taskName = taskName;
		}
		// figure out transition destinations, functions, and guards
		else if (obj.type == 'Transition') {
		    var src = model.objects[obj.pointers['src']],
			dst = model.objects[obj.pointers['dst']];
		    if ( src && dst ) {
			// valid transition with source and destination pointers in the tree
			if (!src.transitions) {
			    src.transitions = []
			}
			src.transitions.push({
			    'Guard' : obj.Guard,
			    'Function' : obj.Function,
			    'prevState' : model.objects[src.path],
			    'nextState' : model.objects[dst.path],
			    'finalState': null,
			    'transitionFunc': ''
			});
		    }
		}
		// make the state names for the variables and such
		else if (obj.type == 'State') {
		    var stateName = self.sanitizeString(obj.name);
		    if (!self.isValidString(stateName))
			throw new String("State " + obj.path + " has an invalid state name: " + obj.name);
		    var parentObj = model.objects[obj.parentPath];
		    // make sure no direct siblings of this state share its name
		    if (parentObj && parentObj.type != 'Project') {
			obj.parentState = model.objects[obj.parentPath];
			obj.parentState.State_list.map(function(child) {
			    if (child.path != obj.path && child.name == obj.name)
				throw new String("States " + obj.path + " and " + child.path + " have the same name: " + obj.name);
			});
		    }
		    else {
			if (topLevelStateNames.indexOf(obj.name) > -1)
			    throw new String("Two top-level states have the same name: " + obj.name);
			topLevelStateNames.push(obj.name);
			obj.parentState = null;
		    }
		    // make sure we have a relatively unique name for the state
		    while (parentObj && parentObj.type == 'State') {
			stateName = self.sanitizeString(parentObj.name) + '_'+stateName;
			parentObj = model.objects[parentObj.parentPath];
		    }
		    // set the state name
		    obj.stateName = 'state_'+stateName;
		    // make sure all states have transitions, even if empty!
		    if (!obj.transitions) {
			obj.transitions = [];
		    }
		    // make sure the State_list is either a real list or null
		    if (!obj.State_list) {
			obj.State_list = null;
		    }
		    // update the prefix for the state function
		    obj['Periodic Function'] = obj['Periodic Function'].replace(/^(\S|\s)/gm, "    $1");
		}
	    });
	    // figure out heirarchy levels and assign state ids
	    self.makeStateIDs(model);
	    // make sure all state.transitions have valid .transitionFunc attributes
	    self.buildTransitionFuncs(model);
	},
	recurseStates: function(state, levels, level) {
	    var self = this;
	    if (levels.length <= level) {
		levels[level] = {
		    'numStatesInLevel': 0
		}
	    }
	    state.stateLevel = level;
	    state.stateID = levels[level].numStatesInLevel++;
	    if (state.State_list) {
		state.State_list.map(function(substate) {
		    self.recurseStates(substate, levels, level + 1);
		});
	    }
	},
	makeStateIDs: function(model) {
	    var self = this;
	    var levels = [];
	    if (model.root.State_list) {
		model.root.State_list.map(function(state) {
		    self.recurseStates(state, levels, 0);
		});
		model.root.numHeirarchyLevels = levels.length;
	    }
	},
	getInitState: function(state) {
	    // does not recurse; simply gets the init state and does error checking
	    var self = this;
	    var initState = state;
            if (state.State_list && state.Initial_list) {
                if (state.Initial_list.length > 1)
                    throw new String("State " + state.name + ", " +state.path+" has more than one init state!");
                var init = state.Initial_list[0];
                if (init.transitions.length == 1) {
		    initState = init;
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
	getInitFunc: function(state) {
	    // recurses to build up the transition function for an arbitrarily nested set of init states.
	    var self = this;
            var tFunc = state.Initialization + '\n';
	    var init = self.getInitState(state);
	    if (init != state && init.transitions.length) {
		var dst = init.transitions[0].nextState;
		tFunc += init.transitions[0].Function + '\n' + self.getInitFunc(dst);
	    }
            return tFunc;	    
	},
	getStartState: function(state) {
	    // recurses to get the leaf init state
	    var self = this;
	    var start = state
	    var init = self.getInitState(state);
	    if (init != state && init.transitions.length) {
		var dst = init.transitions[0].nextState;
		start = self.getStartState(dst);
	    }
            return start;
	},
	buildTransitionFuncs: function(model) {
	    var self = this;
	    model.root.initState = self.getStartState(model.root);
	    model.root.initFunc = self.getInitFunc(model.root);
	    var objPaths = Object.keys(model.objects);
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		if (obj.type == "State") {
		    obj.transitions.map(function(trans) {
			trans.transitionFunc = trans.Function + '\n' + self.getInitFunc(trans.nextState);
			// update the prefix for the transition function
			trans.transitionFunc = trans.transitionFunc.replace(/^(\S|\s)/gm, '    $1');
			trans.finalState = self.getStartState(trans.nextState);
		    });
		}
	    });
	},
    }
});
