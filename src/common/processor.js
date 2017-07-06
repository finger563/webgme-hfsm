
/*
 * TODO:
 *   * Build transition functions properly
 *   * Get common parent properly for all state transitions
 *   * Get default transition for choice pseudostates
 */

define(['./checkModel'], function(checkModel) {
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
	addVariableName: function(obj) {
	    var self = this;
	    obj.VariableName = self.sanitizeString(obj.name).toUpperCase();
	},
	processTopLevel: function(obj) {
	    var self = this;
	    var sName = self.sanitizeString(obj.name);
	    obj.sanitizedName = sName;
	    if (obj.Declarations) {
		obj.Declarations = obj.Declarations.replace(self.stripRegex, "  $1");
	    }
	    if (obj.Definitions) {
		obj.Definitions = obj.Definitions.replace(self.stripRegex, "  $1");
	    }
	},
	processModel: function(model) {
	    var self = this;
	    checkModel.checkModel(model);
	    // THIS FUNCTION HANDLES CREATION OF SOME CONVENIENCE MEMBERS
	    // FOR SELECT OBJECTS IN THE MODEL

	    // Keep track of all the events in the model and which
	    // transitions occur from them
	    model.eventNames = [];

	    var objPaths = Object.keys(model.objects);
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		obj.Substates = [];
		// Make sure top-level Project / Task / Timer names
		// are good and code attributes are properly prefixed.
		if (obj.type == 'Project' || obj.type == 'Task' || obj.type == 'Timer') {
		    self.processTopLevel( obj );
		}
		// Make sure component names are good and generation
		// information exists
		else if (obj.type == 'Component') {
		    var sName = self.sanitizeString(obj.name);
		    obj.sanitizedName = sName;
		    obj.needsExtern = obj.Language == 'c';
		    obj.includeName = sName + ((obj.Language == 'c++') ? '.hpp' : '.h');
		}
		// Process External Transition Data into convenience
		// members of source State
		else if (obj.type == 'External Transition') {
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

			if (obj.Event) {
			    // add the event to a global list of events
			    self.addEvent( model, obj.Event );
			}
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
		    // for mustache template
		    obj.isEnd = true;
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

		    // need to make a unique name for this state!
		    // for mustache template
		    obj.isChoice = true;

		    // make external transition convenience
		    var extTrans = checkModel.getTransitionsOutOf( obj, model.objects );
		}
		// Process Process Deep History Pseudostate Data
		else if (obj.type == 'Deep History Pseudostate') {
		    // shouldn't need to do anything special here,
		    // just treat it like a normal state
		    // make the variable name
		    self.addVariableName( obj );
		    // for mustache template
		    obj.isDeepHistory = true;
		}
		// Process Process Shallow History Pseudostate Data
		else if (obj.type == 'Shallow History Pseudostate') {
		    // shouldn't need to do anything special here,
		    // just treat it like a normal state
		    // make the variable name
		    self.addVariableName( obj );
		    // for mustache template
		    obj.isShallowHistory = true;
		}
		// make the state names for the variables and such
		else if (obj.type == 'State') {
		    // for mustache template
		    obj.isState = true;
		    // sanitize name for class name
		    var sName = self.sanitizeString(obj.name);
		    obj.sanitizedName = sName;
		    // make the variable name
		    self.addVariableName( obj );
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
	    // make sure all objects have convenience members
	    self.makeConvenience( model );
	    // make sure all state.transitions have valid .transitionFunc attributes
	    //self.buildTransitionFuncs(model);
	    // make sure all transitions have valid .commonParent attributes
	    //self.findCommonParents(model);
	},
	// MAKE CONVENIENCE FOR WHAT EVENTS ARE HANDLED BY WHICH STATES
	makeSubstate: function(obj, objDict) {
	    var parent = objDict[ obj.parentPath ];
	    if (parent) {
		if (parent.Substates == undefined)
		    parent.Substates = [];
		parent.Substates.push( obj );
	    }
	},
	makeConvenience: function(model) {
	    var self = this;
	    Object.keys(model.objects).map(function(path) {
		var obj = model.objects[ path ];
		if (obj.type == 'Deep History Pseudostate') {
		    obj.fullyQualifiedName = self.getFullyQualifiedName( obj, model.objects );
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
		}
		else if (obj.type == 'Shallow History Pseudostate') {
		    obj.fullyQualifiedName = self.getFullyQualifiedName( obj, model.objects );
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
		}
		else if (obj.type == 'Choice Pseudostate') {
		    obj.fullyQualifiedName = self.getFullyQualifiedName( obj, model.objects );
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
		}
		else if (obj.type == 'State') {
		    obj.fullyQualifiedName = self.getFullyQualifiedName( obj, model.objects );
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
		}
	    });
	},
	getFullyQualifiedName: function( obj, objDict ) {
	    var self = this;
	    var fqName = obj.sanitizedName;
	    var parent = objDict[ obj.parentPath ];
	    // make sure we have a relatively unique name for the state
	    if (parent && parent.type == 'State') {
		var parentFQName = self.getFullyQualifiedName( parent, objDict );
		fqName = parentFQName + '::' + fqName;
	    }
	    return fqName;
	},
	transitionSort: function(transA, transB) {
	    var a = transA.Guard;
	    var b = transB.Guard;
	    if (!a && b) return 1;
	    if (a && !b) return -1;
	    return 0;
	},
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
	    eventInfo.Transitions.sort( self.transitionSort );
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
