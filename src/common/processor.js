
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
 *   * Choice states chained together (not allowed)
 */

define(['q'], function(Q) {
    'use strict';
    return {
	stripRegex: /^([^\n]+)/gm,
	uniq: function(a) {
	    var seen = {};
	    return a.filter(function(item) {
		return seen.hasOwnProperty(item) ? false : (seen[item] = true);
	    });
	},
	addEvent: function(model, eventName) {
	    eventName = eventName.toUpperCase().trim();
	    if (eventName)
		model.eventNames.push( eventName );
	},
	sanitizeString: function(str) {
	    return str.replace(/[ \-]/gi,'_');
	},
	isValidString: function(str) {
	    var varDeclExp = new RegExp(/^[a-zA-Z_][a-zA-Z0-9_]+$/gi);
	    return varDeclExp.test(str);
	},
	addVariableName: function(obj) {
	    var self = this;
	    obj.VariableName = self.sanitizeString(obj.name).toUpperCase();
	},
	processTopLevel: function(obj) {
	    var self = this;
	    var sName = self.sanitizeString(obj.name);
	    if ( !self.isValidString( sName ) )
		throw "ERROR: "+obj.path+" has invalid name: "+obj.name;
	    obj.sanitizedName = sName;
	    if (obj.Declarations) {
		obj.Declarations = obj.Declarations.replace(self.stripRegex, "  $1");
	    }
	    if (obj.Definitions) {
		obj.Definitions = obj.Definitions.replace(self.stripRegex, "  $1");
	    }
	},
	checkModel: function(model) {
	    // throws an error of model is not valid
	},
	processModel: function(model) {
	    var self = this;
	    // THIS FUNCTION HANDLES CREATION OF SOME CONVENIENCE MEMBERS
	    // FOR SELECT OBJECTS IN THE MODEL

	    // Keep track of all the events in the model and which
	    // transitions occur from them
	    model.eventNames = [];

	    var topLevelStateNames = [];
	    var objPaths = Object.keys(model.objects);
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		// Make sure top-level Project / Task / Timer names
		// are good and code attributes are properly prefixed.
		if (obj.type == 'Project' || obj.type == 'Task' || obj.type == 'Timer') {
		    self.processTopLevel( obj );
		}
		// Make sure component names are good and generation
		// information exists
		else if (obj.type == 'Component') {
		    var compName = self.sanitizeString(obj.name);
		    if (!self.isValidString( compName ))
			throw "ERROR: "+obj.path+" has invalid name: "+obj.name;
		    obj.needsExtern = obj.Language == 'c';
		    obj.compName = compName;
		    obj.includeName = compName + ((obj.Language == 'c++') ? '.hpp' : '.h');
		}
		// Process External Transition Data into convenience
		// members of source State
		else if (obj.type == 'External Transition') {
		    // SHOULD UPDATE THESE DATA DEPENDING ON WHAT THE SRC / DST ARE!
		    // need function to get final state that doesn't terminate on end states
		    var src = model.objects[obj.pointers['src']],
			dst = model.objects[obj.pointers['dst']];
		    if ( src && dst ) {
			// valid transition with source and destination pointers in the tree
			// add new data to the object
			obj.prevState = model.objects[src.path];
			obj.nextState = model.objects[dst.path];
			obj.commonParent = null;
			obj.originalState =  null;
			obj.finalState = null;
			obj.transitionFunc = '';

			// add the event to a global list of events
			self.addEvent( model, obj.Event );
			// add the external transition to the source
			self.updateEventInfo( 'ExternalEvents',
					      src,
					      obj );
		    }
		}
		// Process Internal Transition Data into convenience
		// members of parent State
		else if (obj.type == 'Internal Transition') {
		    var parent = model.objects[ obj.parentPath ];
		    if (parent) {
			// add the event to a global list of events
			self.addEvent( model, obj.Event );
			// add the internal transition to the parent
			self.updateEventInfo( 'InternalEvents',
					      parent,
					      obj );
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
		    // Need to add:
		    // * defaultTransition

		    // Need to figure out if this goes to another
		    // choice pseudostate or an end state, and update
		    // accordingly - how?
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
		    if (!self.isValidString( stateName ))
			throw "ERROR: "+obj.path+" has invalid name: "+obj.name;
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
		    obj['Tick'] = obj['Tick'].replace(self.stripRegex, "      $1");
		    obj['Exit'] = obj['Exit'].replace(self.stripRegex, "    $1");
		}
	    });
	    // make sure event names are global and sort them
	    model.eventNames = self.uniq( model.eventNames ).sort();
	    // make sure all state.transitions have valid .transitionFunc attributes
	    //self.buildTransitionFuncs(model);
	    // make sure all transitions have valid .commonParent attributes
	    //self.findCommonParents(model);
	},
	// MAKE CONVENIENCE FOR WHAT EVENTS ARE HANDLED BY WHICH STATES
	getEventInfo: function( key, obj, eventName ) {
	    var self = this;
	    var eventInfo = obj[ key ]; // should be list of objects { name: , Transitions: }
	    if (eventInfo == undefined) {
		// have not had any events
		obj[ key ] = [ { name: eventName, Transitions: [] } ];
		eventInfo = obj[ key ];
	    }
	    eventInfo = eventInfo.filter(function(o) { return o.name == eventName; });
	    if (eventInfo.length == 0) {
		// have had other events, but not this one
		eventInfo = { name: eventName, Transitions: [] };
		obj[ key ].push( eventInfo );
	    }
	    else {
		// have had this event
		eventInfo = eventInfo[0];
	    }
	    return eventInfo;
	},
	updateEventInfo: function( key, obj, transition ) {
	    var self = this;
	    var eventInfo = self.getEventInfo( key, obj, transition.Event );
	    eventInfo.Transitions.push( transition );
	},
	// END CONVENIENCE
	// MODEL TRAVERSAL
	getFinalState: function( model, transitionId ) {
	    var self = this;
	    // follows transitions recursively through select
	    //  pseudostates to return the final state to which this
	    //  path goes.
	    // Should not terminate in:
	    //   * End States
	    //   * Initial States
	    // Should terminate in:
	    //   * States
	    //   * Choice Pseudostates
	    //   * Deep History Pseudostates
	    //   * Shallow History Pseudostates
	    var transition = model.objects[ transitionId ];
	    
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
	// END MODEL TRAVERSAL
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
    }
});
