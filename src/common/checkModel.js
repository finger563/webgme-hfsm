
define([], function() {
    'use strict';
    return {
	stripRegex: /^([^\n]+)/gm,
	badProperty: function(obj, prop) {
	    throw "ERROR: " +obj.path+" has invalid " +prop+": "+obj[prop];
	},
	error: function(obj, str) {
	    throw "ERROR: " +obj.path+" : "+str;
	},
	sanitizeString: function(str) {
	    return str.replace(/[ \-]/gi,'_');
	},
	isValidString: function(str) {
	    var varDeclExp = new RegExp(/^[a-zA-Z_][a-zA-Z0-9_]+$/gi);
	    return varDeclExp.test(str);
	},
	checkName: function(obj) {
	    var self = this;
	    var sName = self.sanitizeString(obj.name);
	    if ( !self.isValidString( sName ) )
		self.badProperty(obj, 'name');
	},
	hasGuard: function( trans ) {
	    return trans.Guard && trans.Guard.trim().length > 0;
	},
	hasEvent: function( trans ) {
	    return trans.Event && trans.Event.trim().length > 0;
	},
	checkModel: function(model) {
	    /**
	     * @brief Ensures correctness of the model, throwing
	     * errors for violations.
	     * 
	     *  Model Checks performed:
	     *   * Default transitions on choice pseudostates
	     *   * Choice pseudostate transitions should not have events
	     *   * Cannot have multiple or guarded end transitions 
	     *   * Multiple transitions with same event / guard
	     *   * Multiple events with similar names (only change would be capitalization)
	     */
	    var self = this;
	    var topLevelStateNames = [];
	    var objPaths = Object.keys(model.objects);
	    objPaths.map(function(objPath) {
		var obj = model.objects[objPath];
		if (obj.type == 'Project' ||
		    obj.type == 'State Machine') {
		    // checks: name
		    self.checkName( obj );
		}
		else if (obj.type == 'External Transition') {
		    // checks: src, dst, Event, Guard,
		    var src = model.objects[obj.pointers['src']],
			dst = model.objects[obj.pointers['dst']];
		    if ( src == undefined )
			self.badProperty(obj, 'src');
		    if ( dst == undefined )
			self.badProperty(obj, 'dst');
		}
		else if (obj.type == 'Internal Transition') {
		    // checks: event
		    if ( !self.hasEvent( obj ) )
			self.error(obj, "INTERNAL TRANSITIONS MUST HAVE EVENTS");
		}
		else if (obj.type == 'End State') {
		}
		// Process Choice Pseudostate Data
		else if (obj.type == 'Choice Pseudostate') {
		    // checks:
		    // * must have unguarded transition,
		    // * exit transitions must not have events
		    var outTrans = self.getTransitionsOutOf( obj, model.objects );
		    outTrans.map(function(trans) {
			if ( self.hasEvent( obj ) )
			    self.error(obj, "Transitions out of choice states cannot have events!");
		    });
		    var guardless = outTrans.filter(function(trans) { return !self.hasGuard( trans ); });
		    if (guardless.length > 1)
			self.error(obj, "Choice states must have <=1 unguarded exit transition!");
		    /*
		    if (guardless.length != 1)
			self.error(obj, "Choice states must have exactly 1 unguarded exit transition!");
		    */
		}
		else if (obj.type == 'Deep History Pseudostate') {
		}
		else if (obj.type == 'Shallow History Pseudostate') {
		}
		else if (obj.type == 'End State') {
		}
		else if (obj.type == 'Initial') {
		    // checks:
		    // * no incoming transitions,
		    // * no outgoing transitions with guards or events,
		    // * only one outgoing transition
		    var outTrans = self.getTransitionsOutOf( obj, model.objects );
		    if (outTrans.length != 1)
			self.error(obj, "Initial states must have exactly one transition!");
		    if ( self.hasEvent( outTrans[0] ) || self.hasGuard( outTrans[0] ) )
			self.error(obj, "Initial state transitions cannot have guards or events!");
		}
		else if (obj.type == 'State') {
		    // checks:
		    // * name is good,
		    // * name is unique within siblings
		    // * only one 'Initial'
		    // * only one end transition with no guard / event,
                    // * timer period is non-zero if it has no child states
		    self.checkName( obj );
		    var parentObj = model.objects[obj.parentPath];
		    // make sure no direct siblings of this state share its name
		    obj.parentState = null;
		    if (parentObj && parentObj.type != 'Project') {
			parentObj.State_list.map(function(child) {
			    if (child.path != obj.path && child.name == obj.name)
				self.error(obj, "States " +obj.path+" and " +child.path+ " have the same name: " +obj.name);
			});
		    }
		    else {
			if (topLevelStateNames.indexOf(obj.name) > -1)
			    self.error(obj, "Two top-level states have the same name: " + obj.name);
			topLevelStateNames.push(obj.name);
		    }
		    // only one Initial
		    if (obj.Initial_list) {
			if (obj.Initial_list > 1)
			    self.error(obj, "State cannot have more than one initial state!");
			var initTrans = self.getTransitionsOutOf( obj.Initial_list[0], model.objects );
			if (initTrans.length != 1)
			    self.error(obj, "State must have an initial sub state selected!");
		    }
		    // only one END TRANSITION and it has no guard
		    var endTrans = self.getEndTransitions( obj, model.objects );
		    if (endTrans.length > 1)
			self.error(obj, "State cannot have more than one END TRANSITION!");
		    else if (endTrans.length == 1 && self.hasGuard( endTrans[0] ))
			self.error(obj, "END TRANSITION cannot have gaurd!");
                    // non-zero timer period if non-zero substates
                    if (!obj.Initial_list && !obj.State_list && obj['Timer Period'] <= 0) {
                        self.error(obj, "Leaf state must have non-zero timer period!");
                    }
		}
	    });
	},
	// MODEL TRAVERSAL
	getEndTransitions: function( stateObj, objDict ) {
	    var self = this;
	    return self.getTransitionsOutOf( stateObj, objDict ).filter(function(t) {
		return !self.hasEvent( t );
	    });
	},
	getTransitionsOutOf: function( srcObj, objDict ) {
	    return Object.keys( objDict ).filter(function(path) {
		var obj = objDict[path];
		return obj.type == 'External Transition' && obj.pointers['src'] == srcObj.path;
	    }).map(function(transId) {
		return objDict[ transId ];
	    });
	},
	getTransitionsInto: function( dstObj, objDict ) {
	    return Object.keys( objDict ).filter(function(path) {
		var obj = objDict[path];
		return obj.type == 'External Transition' && obj.pointers['dst'] == dstObj.path;
	    }).map(function(transId) {
		return objDict[ transId ];
	    });
	},
    }
});
