
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
		model.root.eventNames.push( eventName );
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
	},
	addBasicParams: function(obj) {
	    obj.Substates = [];
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
	    checkModel.checkModel(model);
	    // THIS FUNCTION HANDLES CREATION OF SOME CONVENIENCE MEMBERS
	    // FOR SELECT OBJECTS IN THE MODEL

	    // Keep track of all the events in the model and which
	    // transitions occur from them
	    model.root.eventNames = [];

	    var objPaths = Object.keys(model.objects);
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		// init all basic params
		self.addBasicParams( obj );
		// Make sure top-level Project / Task / Timer names
		// are good and code attributes are properly prefixed.
		if (obj.type == 'Project') {
		    self.processTopLevel( obj );
		}
		if (obj.type == 'Task' || obj.type == 'Timer') {
		    self.processTopLevel( obj );
		    obj.isRoot = true;
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
			obj.isExternalTransition = true;
			obj.prevState = src;
			obj.nextState = dst;

			if (obj.Event) {
			    // add the event to a global list of events
			    self.addEvent( model, obj.Event );
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
		    // add sanitized name
		    var sName = self.sanitizeString(obj.name);
		    obj.sanitizedName = sName;
		    // if root, make convenience to it
		    var parent = model.objects[ obj.parentPath ];
		    if (parent && parent.type != 'State')
			parent.END = obj;
		    else {
			var endTransition = checkModel.getEndTransitions( parent, model.objects );
			obj.endTransition = endTransition[0];
		    }
		}
		// Process Choice Pseudostate Data
		else if (obj.type == 'Choice Pseudostate') {
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
	    // make sure event names are global and sort them
	    model.root.eventNames = self.uniq( model.root.eventNames ).sort();
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
	makeConvenience: function(model) {
	    var self = this;
	    Object.keys(model.objects).map(function(path) {
		var obj = model.objects[ path ];
		if (obj.type == 'Deep History Pseudostate') {
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
		}
		else if (obj.type == 'Shallow History Pseudostate') {
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
		}
		else if (obj.type == 'Choice Pseudostate') {
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
		}
		else if (obj.type == 'State') {
		    // make a substate of its parent
		    self.makeSubstate( obj, model.objects );
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
	    var eventInfo = self.getEventInfo( key, obj, transition.Event );
	    eventInfo.Transitions.push( transition );
	    eventInfo.Transitions.sort( self.transitionSort );
	},
	// END CONVENIENCE
    }
});
