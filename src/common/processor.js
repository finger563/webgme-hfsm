
define(['./checkModel', 'underscore'], function(checkModel, _) {
    'use strict';
    return {
	stripRegex: /^([^\n]+)/gm,
	uniq: function(a) {
	    var seen = {};
	    return a.filter(function(item) {
		return seen.hasOwnProperty(item) ? false : (seen[item] = true);
	    });
	},
	makeEventName: function(name) {
	    return name.trim(); // toUpperCase();
	},
	addEvent: function(model, obj, eventName) {
	    var self = this;
	    eventName = self.makeEventName(eventName);
	    obj.EventName = eventName;
	    if (eventName) {
                // go to the State Machine object and add it there.
		var p = model.objects[obj.parentPath];
		while (p && p.type && p.type != 'State Machine') {
		    p = model.objects[p.parentPath];
		}
                if (p) {
                    if (!p.eventNames) {
                        p.eventNames = [];
                    }
		    p.eventNames.push( eventName );
                }
            }
	},
	sanitizeString: function(str) {
	    return str.replace(/[ \-]/gi,'_');
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
            if (!obj.eventNames) {
                obj.eventNames = [];
            }
	},
	addBasicParams: function(obj) {
	    obj.Substates = [];
	    obj.UnhandledEvents = [];
	    obj.isRoot = false;
	    obj.isExternalTransition = false;
	    obj.isState = false;
	    obj.isChoice = false;
	    obj.isDeepHistory = false;
	    obj.isShallowHistory = false;
	    obj.isEnd = false;
	},
	processModel: function(model) {
	    var self = this;
            // REMOVE ALL EVENTS THAT ARE MARKED AS DISABLED
            var transitionTypes = ['External Transition', 'Internal Transition'];
            Object.keys(model.objects).map(function(objPath) {
                var obj = model.objects[objPath];
                if (transitionTypes.indexOf(obj.type) > -1 && !obj.Enabled) {
                    console.log('deleting disabled transition: '+objPath);
                    delete model.objects[objPath];
                }
            });
            
	    checkModel.checkModel(model);
	    // THIS FUNCTION HANDLES CREATION OF SOME CONVENIENCE MEMBERS
	    // FOR SELECT OBJECTS IN THE MODEL

	    var objPaths = Object.keys(model.objects);
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		// init all basic params
		self.addBasicParams( obj );
		// Make sure top-level State Machine objects
		// are good and code attributes are properly prefixed.
		if (obj.type == 'State Machine' || obj.type == 'Library') {
		    self.processTopLevel( obj );
		    obj.isRoot = true;
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
			obj.isExternalTransition = true;
			obj.prevState = src;
			obj.nextState = dst;

			if (obj.Event) {
			    // add the event to a global list of events
			    self.addEvent( model, obj, obj.Event );
			    // add the external transition to the source
			    self.updateEventInfo( 'ExternalEvents',
						  src,
						  obj );
			}
			else if (src.type == 'Choice Pseudostate' ||
				 src.type == 'Initial') {
			    // add the external transition to the source
			    if (src.ExternalTransitions == undefined)
				src.ExternalTransitions = [];
			    src.ExternalTransitions.push( obj );
			    src.ExternalTransitions.sort( self.transitionSort );
			}
			else {
			    // should be end event! need to build transition functions properly
			}
		    }
		}
		// Process Internal Transition Data into convenience
		// members of parent State
		else if (obj.type == 'Internal Transition') {
		    var parent = model.objects[ obj.parentPath ];
		    if (parent) {
			// add the event to a global list of events
			self.addEvent( model, obj, obj.Event );
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
		    // add sanitized name
		    var sName = self.sanitizeString(obj.name);
		    obj.sanitizedName = sName;
		    // if root, make convenience to it
		    var parent = model.objects[ obj.parentPath ];
		    if (parent && parent.type != 'State') {
			parent.END = obj;
                    }
		    else {
			var endTransition = checkModel.getEndTransitions( parent, model.objects );
			obj.endTransition = endTransition[0];
		    }
		}
		// Process Choice Pseudostate Data
		else if (obj.type == 'Choice Pseudostate') {
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
		    // for mustache template
		    obj.isChoice = true;
		    // add sanitized name
		    var sName = self.sanitizeString(obj.name);
		    obj.sanitizedName = sName;
		    // make external transition convenience
		    var extTrans = checkModel.getTransitionsOutOf( obj, model.objects );
		}
		// Process Process Deep History Pseudostate Data
		else if (obj.type == 'Deep History Pseudostate') {
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
		    // shouldn't need to do anything special here,
		    // just treat it like a normal state
		    // sanitize name for class name
		    var sName = self.sanitizeString(obj.name);
		    obj.sanitizedName = sName;
		    // for mustache template
		    obj.isDeepHistory = true;
		}
		// Process Process Shallow History Pseudostate Data
		else if (obj.type == 'Shallow History Pseudostate') {
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
		    // shouldn't need to do anything special here,
		    // just treat it like a normal state
		    // sanitize name for class name
		    var sName = self.sanitizeString(obj.name);
		    obj.sanitizedName = sName;
		    // for mustache template
		    obj.isShallowHistory = true;
		}
		// make the state names for the variables and such
		else if (obj.type == 'State') {
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
		    // for mustache template
		    obj.isState = true;
		    // sanitize name for class name
		    var sName = self.sanitizeString(obj.name);
		    obj.sanitizedName = sName;
		    // make sure the State_list is either a real list or null
		    if (!obj.State_list) {
			obj.State_list = null;
		    }
		    // update the prefix for the state function
		    obj['Tick'] = obj['Tick'].replace(self.stripRegex, "      $1");
		    obj['Exit'] = obj['Exit'].replace(self.stripRegex, "    $1");
		}
	    });
            // make sure event names are unique and sort them
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		if (obj.type == 'State Machine') {
                    obj.eventNames = self.uniq( obj.eventNames ).sort();
		}
            });
	    // make sure all objects have convenience members
	    self.makeConvenience( model );
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
	findUnhandledEvents: function(obj, objDict) {
	    var self = this;
	    var parent = objDict[ obj.parentPath ];
	    if (parent) {
		// figure out disjoint set of events
		var handledEventNames = [];
		if (obj.InternalEvents) {
		    handledEventNames = handledEventNames.concat(obj.InternalEvents.map((e) => {
			return e.name;
		    }));
		}
		if (obj.ExternalEvents) {
		    handledEventNames = handledEventNames.concat(obj.ExternalEvents.map((e) => {
			return e.name;
		    }));
		}
		obj.UnhandledEvents = _.difference( parent.UnhandledEvents, handledEventNames );
	    }
	    // recurse down from the top
	    obj.Substates.map((s) => {
		self.findUnhandledEvents(s, objDict);
	    });
	},
	makeConvenience: function(model) {
	    var self = this;
	    Object.keys(model.objects).map((path) => {
		var obj = model.objects[path];
		if (obj.type == 'State Machine') {
		    obj.UnhandledEvents = obj.eventNames;
		    self.findUnhandledEvents(obj, model.objects);
		}
	    });
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
	    var eventInfo = self.getEventInfo( key, obj, transition.EventName );
	    eventInfo.Transitions.push( transition );
	    eventInfo.Transitions.sort( self.transitionSort );
	},
	// END CONVENIENCE
    }
});
