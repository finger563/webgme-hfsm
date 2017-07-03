
/*
 * TODO:
 *   * Build transition functions properly
 *   * Get common parent properly for all state transitions
 *   * Get default transition for choice pseudostates
 *   * Make sure _ALL_ states have 'VariableName'
 * MODEL CHECKS:
 *   * Default transitions on choice pseudostates
 *   * Choice pseudostate transitions should not have events
 *   * Cannot have multiple or guarded end transitions 
 *   * Multiple transitions with same event / guard
 *   * Multiple events with similar names (only change would be capitalization)
 */

define(['q'], function(Q) {
    'use strict';
    return {
	stripRegex: /^([^\n]+)/gm,
	sanitizeString: function(str) {
	    return str.replace(/[ \-]/gi,'_');
	},
	isValidString: function(str) {
	    var varDeclExp = new RegExp(/^[a-zA-Z_][a-zA-Z0-9_]+$/gi);
	    return varDeclExp.test(str);
	},
	checkName: function( obj ) {
	    var self = this;
	    if (!self.isValidString( obj.name ))
		throw "ERROR: "+obj.path+" has invalid name: "+obj.name;
	},
	addVariableName: function(obj) {
	    var self = this;
	    obj.VariableName = self.sanitizeString(obj.name).toUpperCase();
	},
	processModel: function(model) {
	    var self = this;
	    // THIS FUNCTION HANDLES CREATION OF SOME CONVENIENCE MEMBERS
	    // FOR SELECT OBJECTS IN THE MODEL
	    var topLevelStateNames = [];
	    var objPaths = Object.keys(model.objects);
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		// Make sure top-level Project / Task / Timer names
		// are good and code attributes are properly prefixed.
		if (obj.type == 'Project' || obj.type == 'Task' || obj.type == 'Timer') {
		    var sName = self.sanitizeString(obj.name);
		    self.checkName( obj );
		    obj.sanitizedName = sName;
		    if (obj.Declarations) {
			obj.Declarations = obj.Declarations.replace(self.stripRegex, "  $1");
		    }
		    if (obj.Definitions) {
			obj.Definitions = obj.Definitions.replace(self.stripRegex, "  $1");
		    }
		}
		// Make sure component names are good and generation
		// information exists
		else if (obj.type == 'Component') {
		    var compName = self.sanitizeString(obj.name);
		    self.checkName( obj );
		    obj.needsExtern = obj.Language == 'c';
		    obj.compName = compName;
		    obj.includeName = compName + ((obj.Language == 'c++') ? '.hpp' : '.h');
		}
		// Process External Transition Data into convenience
		// members of source State
		else if (obj.type == 'External Transition') {
		    var src = model.objects[obj.pointers['src']],
			dst = model.objects[obj.pointers['dst']];
		    if ( src && dst ) {
			// valid transition with source and destination pointers in the tree
			if (!src.transitions) {
			    src.transitions = []
			}
			src.transitions.push({
			    'Event' : obj.Event,
			    'Guard' : obj.Guard,
			    'Action' : obj.Action,
			    'prevState' : model.objects[src.path],
			    'nextState' : model.objects[dst.path],
			    'finalState': null,
			    'transitionFunc': ''
			});
		    }
		}
		// Process Internal Transition Data into convenience
		// members of parent State
		else if (obj.type == 'Internal Transition') {
		    var parent = model.objects[ obj.parentPath ];
		    if (parent) {
			if (!parent.InternalTransitions) {
			    parent.InternalTransitions = []
			}
			parent.InternalTransitions.push({
			    'Event' : obj.Event,
			    'Guard' : obj.Guard,
			    'Action': obj.Action,
			});
		    }
		}
		// Process End State Data
		else if (obj.type == 'End State') {
		    var parent = model.objects[ obj.parentPath ];
		    if (parent) {
			if (!parent.InternalTransitions) {
			    parent.InternalTransitions = []
			}
			parent.InternalTransitions.push({
			    'Event' : obj.Event,
			    'Guard' : obj.Guard,
			    'Action': obj.Action,
			});
		    }
		}
		// Process Choice Pseudostate Data
		else if (obj.type == 'Choice Pseudostate') {
		    // shouldn't need to do anything special here,
		    // just treat it like a normal state
		}
		// Process Process Deep History Pseudostate Data
		else if (obj.type == 'Deep History Pseudostate') {
		    // shouldn't need to do anything special here,
		    // just treat it like a normal state
		}
		// Process Process Shallow History Pseudostate Data
		else if (obj.type == 'Shallow History Pseudostate') {
		    // shouldn't need to do anything special here,
		    // just treat it like a normal state
		}
		// make the state names for the variables and such
		else if (obj.type == 'State') {
		    var stateName = self.sanitizeString(obj.name);
		    self.checkName( obj );
		    var parentObj = model.objects[obj.parentPath];
		    // make sure no direct siblings of this state share its name
		    obj.parentState = null;
		    if (parentObj && parentObj.type != 'Project') {
			parentObj.State_list.map(function(child) {
			    if (child.path != obj.path && child.name == obj.name)
				throw new String("States " + obj.path + " and " + child.path + " have the same name: " + obj.name);
			});
			if (parentObj.type == 'State')
			    obj.parentState = parentObj;
		    }
		    else {
			if (topLevelStateNames.indexOf(obj.name) > -1)
			    throw new String("Two top-level states have the same name: " + obj.name);
			topLevelStateNames.push(obj.name);
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
		    obj['Periodic Function'] = obj['Periodic Function'].replace(self.stripRegex, "      $1");
		    obj['Finalization'] = obj['Finalization'].replace(self.stripRegex, "    $1");
		}
	    });
	    // figure out heirarchy levels and assign state ids
	    self.makeStateIDs(model);
	    // make sure all state.transitions have valid .transitionFunc attributes
	    self.buildTransitionFuncs(model);
	    // make sure all transitions have valid .commonParent attributes
	    self.findCommonParents(model);
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
	    if (model.root.Task_list) {
		model.root.Task_list.map(function(task) {
		    var levels = [];
		    if (task.State_list) {
			task.State_list.map(function(state) {
			    self.recurseStates(state, levels, 0);
			});
		    }
		    task.numHeirarchyLevels = levels.length;
		});
	    }
	    if (model.root.Timer_list) {
		model.root.Timer_list.map(function(timer) {
		    var levels = [];
		    if (timer.State_list) {
			timer.State_list.map(function(state) {
			    self.recurseStates(state, levels, 0);
			});
		    }
		    timer.numHeirarchyLevels = levels.length;
		});
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
	    var tFunc = '';
	    var padStr = '    $1';
	    if (state.Initialization)
		tFunc = state.Initialization.replace(self.stripRegex, padStr) + '\n';
	    var init = self.getInitState(state);
	    if (init != state && init.transitions.length) {
		if (init.transitions[0].Function)
		    tFunc += init.transitions[0].Function.replace(self.stripRegex, padStr) + '\n';
		var dst = init.transitions[0].nextState;
		tFunc += self.getInitFunc(dst);
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
	    var objPaths = Object.keys(model.objects);
	    var padStr = '      $1';
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		if (obj.type == "Task" || obj.type == "Timer") {
		    obj.initState = self.getStartState(obj);
		    obj.initFunc = self.getInitFunc(obj);
		}
		else if (obj.type == "State") {
		    obj.transitions.map(function(trans) {
			trans.transitionFunc = '';
			if (trans.Function)
			    trans.transitionFunc += trans.Function + '\n';
			trans.transitionFunc += self.getInitFunc(trans.nextState);
			// update the prefix for the transition function
			trans.transitionFunc = trans.transitionFunc.replace(self.stripRegex, padStr);
			trans.finalState = self.getStartState(trans.nextState);
		    });
		}
	    });
	},
	findCommonParents: function(model) {
	    var self = this;
	    var objPaths = Object.keys(model.objects);
	    var padStr = '      $1';
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		if (obj.type == "Task" || obj.type == "Timer") {
		    obj.initState = self.getStartState(obj);
		    obj.initFunc = self.getInitFunc(obj);
		}
		else if (obj.type == "State") {
		    obj.transitions.map(function(trans) {
			trans.transitionFunc = '';
			if (trans.Function)
			    trans.transitionFunc += trans.Function + '\n';
			trans.transitionFunc += self.getInitFunc(trans.nextState);
			// update the prefix for the transition function
			trans.transitionFunc = trans.transitionFunc.replace(self.stripRegex, padStr);
			trans.finalState = self.getStartState(trans.nextState);
		    });
		}
	    });
	},
    }
});
