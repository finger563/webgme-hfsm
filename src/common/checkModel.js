
define([], function() {
  'use strict';
  return {
    stripRegex: /^([^\n]+)/gm,
    badProperty: function(obj, prop, msg="") {
      if (msg.length > 0) {
        throw "ERROR: " +obj.path+" has invalid " +prop+": '"+obj[prop] + "'.\n " + msg;
      } else {
        throw "ERROR: " +obj.path+" has invalid " +prop+": '"+obj[prop] + "'.";
      }
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
    checkEvent: function(obj) {
      var self = this;
      if ( self.hasEvent(obj) && !self.isValidString( obj.Event ) )
        self.badProperty(obj, 'Event', 'Event must be a valid C++ Enum name (alphanumeric + underscore, starting with a letter)');
    },
    hasGuard: function( trans ) {
      return trans.Guard && trans.Guard.trim().length > 0;
    },
    getGuard: function( trans ) {
      return (trans.Guard && trans.Guard.trim()) || undefined;
    },
    hasEvent: function( trans ) {
      return trans.Event && trans.Event.trim().length > 0;
    },
    getEvent: function( trans ) {
      return (trans.Event && trans.Event.trim()) || undefined;
    },
    hasParentChildRelationship: function( a, b ) {
      return a.parentPath == b.path || a.path == b.parentPath;
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
      var eventNames = [];
      var topLevelObject = null;
      var objPaths = Object.keys(model.objects);
      objPaths.map(function(objPath) {
        var obj = model.objects[objPath];
        if (obj.type == 'Project' ||
            obj.type == 'State Machine') {
          // checks: name
          self.checkName( obj );
          // save reference to this
          topLevelObject = obj;
        }
        else if (obj.type == 'External Transition') {
          self.checkEvent(obj);
          // checks: src, dst, Event, Guard,
          var src = model.objects[obj.pointers['src']],
              dst = model.objects[obj.pointers['dst']];
          if ( src == undefined )
          self.badProperty(obj, 'src');
          if ( dst == undefined )
          self.badProperty(obj, 'dst');
          // store the event name for later
          eventNames.push(obj.Event);
        }
        else if (obj.type == 'Local Transition') {
          self.checkEvent(obj);
          // checks: src, dst, Event, Guard,
          var src = model.objects[obj.pointers['src']],
              dst = model.objects[obj.pointers['dst']];
          if ( src == undefined )
          self.badProperty(obj, 'src');
          if ( dst == undefined )
          self.badProperty(obj, 'dst');

          if ( !self.hasParentChildRelationship( src, dst ) ) {
            console.log(`Local Transition ${objPath} does not have src/dst that are in an explicitly parent-child relationship - converting ${objPath} to External Transition!`);
            obj.type == 'External Transition';
          }

          if ( !self.hasEvent( obj ) ) {
            self.error(obj, "LOCAL TRANSITIONS MUST HAVE EVENTS");
          }
          // store the event name for later
          eventNames.push(obj.Event);
        }
        else if (obj.type == 'Internal Transition') {
          self.checkEvent(obj);
          // checks: event
          if ( !self.hasEvent( obj ) ) {
            self.error(obj, "INTERNAL TRANSITIONS MUST HAVE EVENTS");
          }
          // store the event name for later
          eventNames.push(obj.Event);
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
          /*
          if (guardless.length > 1) {
            self.error(obj, "Choice states must have <=1 unguarded exit transition!");
          }
          */
          if (guardless.length != 1) {
            self.error(obj, "Choice states must have exactly 1 unguarded exiting transition!");
          }
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
          if (outTrans.length != 1) {
            self.error(obj, "Initial states must have exactly one transition!");
          }
          if ( self.hasEvent( outTrans[0] ) || self.hasGuard( outTrans[0] ) ) {
            self.error(obj, "Initial state transitions cannot have guards or events!");
          }
        }
        else if (obj.type == 'State') {
          // checks:
          // * name is good,
          // * name is unique within siblings
          // * cannot have 'Includes' set
          // * must have 'Initial' if there are children
          // * can only one 'Initial'
          // * must have transition path from 'Initial' to a child state if 'Initial' exists
          // * no two transitions out of the state can have the same Event / Guard combination
          // * only one end transition with no guard / event,
          // * if a child END exists, then it must have one end transition
          // * timer period is non-zero if it has no child states
          self.checkName( obj );
          var parentObj = model.objects[obj.parentPath];
          // cannot have includes set
          if (obj.Includes.trim().length > 0) {
            self.error(obj, "States cannot have 'Includes'");
          }
          // make sure no direct siblings of this state share its name
          obj.parentState = null;
          if (parentObj && parentObj.type != 'Project') {
            parentObj.State_list.map(function(child) {
              if (child.path != obj.path && child.name == obj.name) {
                self.error(obj, "States " +obj.path+" and " +child.path+ " have the same name: " +obj.name);
              }
            });
          }
          else {
            if (topLevelStateNames.indexOf(obj.name) > -1) {
              self.error(obj, "Two top-level states have the same name: " + obj.name);
            }
            topLevelStateNames.push(obj.name);
          }
          // must have 'Initial' if there are children
          if (obj.State_list && obj.State_list > 0) {
            if (!obj.Initial_list || obj.Initial_list.length === 0) {
              self.error(obj, "State must have an Initial state if it has children!");
            }
          }
          // only one Initial
          if (obj.Initial_list) {
            if (obj.Initial_list.length > 1) {
              self.error(obj, "State cannot have more than one initial state!");
            }
            var initTrans = self.getTransitionsOutOf( obj.Initial_list[0], model.objects );
            if (initTrans.length != 1) {
              self.error(obj, "State must have an initial sub state selected!");
            }
            self.checkInitialState(obj.Initial_list[0], model.objects);
          }
          // No two transitions have the same Event / Guard combination
          var allTransitions = self.getTransitionsOutOf( obj, model.objects );
          if (allTransitions && allTransitions.length) {
            // make a map of all events -> all transitions
            var eventTransitionMap = allTransitions.reduce((_map, t) => {
              if (t.Event in _map) {
                _map[t.Event].push(t);
              } else {
                _map[t.Event] = [t];
              }
              return _map;
            }, {});
            Object.entries(eventTransitionMap).forEach(([event, transitions]) => {
              // if this event is empty, then we need to make sure
              // there is a child End State
              if (!event || event.trim().length == 0) {
                if (!obj['End State_list']) {
                  self.error(obj, "State has end transition (without Event), but does not have a child End State!");
                }
              }
              // ensure only one guardless for this event
              var guardless = transitions.filter((t) => {
                return !self.hasGuard(t);
              });
              if (guardless.length > 1) {
                var ids = guardless.map((t) => t.path);
                var msg = "Two unguarded transitions have the same Event!";
                msg += `\nTransitions: ${ids}`;
                self.error(obj, msg);
              }
              // ensure no two transitions for this event have the same guard
              var guards = transitions.filter(self.hasGuard.bind(self)).map(self.getGuard.bind(self));
              var guardMap = {};
              guards.forEach((g) => {
                if (g in guardMap) {
                  self.error(obj, "Two transitions have the same Event / Guard combination!");
                } else {
                  guardMap[g] = true;
                }
              });
            });
          }
          // only one END TRANSITION and it has no guard
          var endTrans = self.getEndTransitions( obj, model.objects );
          if (endTrans.length > 1) {
            self.error(obj, "State cannot have more than one END TRANSITION!");
          }
          else if (endTrans.length == 1) {
            if (self.hasGuard( endTrans[0] )) {
              self.error(obj, "END TRANSITION cannot have gaurd!");
            }
          }
          else { // has no end transition
            if (obj['End State_list']) {
              // has an end state
              self.error(obj, "State has END State but no END TRANSITION!");
            }
          }
          // non-zero timer period if non-zero substates
          if (!obj.Initial_list && !obj.State_list && obj['Timer Period'] <= 0) {
            self.error(obj, "Leaf state must have non-zero timer period!");
          }
        }
      });
      // now that we've processed the model, check a few extras:
      // checks: event name uniqueness
      if (eventNames) {
        eventNames.reduce((_map, event) => {
          var e = event.trim().toLowerCase();
          if (e in _map) {
            if (_map[e].indexOf(event) == -1) {
              var msg = "Cannot have multiple events with similar names!";
              msg += `\n name "${event}" will collide with "${_map[e][0]}"`;
              self.error(topLevelObject, msg);
            } else {
              // we're fine, this is the exact same event we already had :)
            }
          } else {
            _map[e] = [event];
          }
          return _map;
        }, {});
      }
    },
    // MODEL TRAVERSAL
    getEndTransitions: function( stateObj, objDict ) {
      var self = this;
      return self.getTransitionsOutOf( stateObj, objDict ).filter(function(t) {
        return !self.hasEvent( t );
      });
    },

    // this function takes a choice state object as input and returns
    // all destinations the outgoing transitions go to
    getChoiceDestinations: function( stateObj, objDict, seenChoices = []) {
      var self = this;
      var transitions = self.getTransitionsOutOf(stateObj, objDict);
      var destinations = transitions.map((t) => {
        return objDict[t.pointers['dst']];
      });
      var validStates = destinations.filter((s) => {
        return s.type != 'Choice Pseudostate';
      });
      var choices = destinations.filter((s) => {
        return s.type == 'Choice Pseudostate';
      });
      seenChoices.push(stateObj);
      choices.map((c) => {
        // ensure we don't loop back on ourselves and we don't get the
        // same choices multiple times
        if (c.path != stateObj.path && seenChoices.indexOf(c) === -1) {
          validStates = validStates.concat(self.getChoiceDestinations(c, objDict, seenChoices));
        }
      });
      return validStates;
    },
    checkInitialState: function( stateObj, objDict ) {
      var self = this;
      // finds the 'Initial' state in the state and traverses it
      // (potentially through choice pseudostates) to find the actual
      // initial state. All states potentially reachable on this path
      // must be within this state object.
      var parentObj = objDict[stateObj.parentPath];

      var transitions = self.getTransitionsOutOf(stateObj, objDict);
      var dest = objDict[transitions[0].pointers['dst']];
      if (dest.type == 'State') {
        // check that it's a sibling
        if (!self.hasParentChildRelationship(dest, parentObj)) {
          self.error(dest, 'Initial state must be within the parent!');
        }
      } else if (dest.type == 'Choice Pseudostate') {
        var destinations  = self.getChoiceDestinations(dest, objDict);
        // ensure all choice pseudostate transitions along this
        // path stay within the parent state
        destinations.map((d) => {
          // check that it's a sibling
          if (!self.hasParentChildRelationship(d, parentObj)) {
            self.error(d, 'Initial state must be within the parent!');
          }
        });
      } else if (dest.type == 'Deep History Pseudostate') {
        // check that it's a sibling
        if (!self.hasParentChildRelationship(dest, parentObj)) {
          self.error(dest, 'Initial state must be within the parent!');
        }
      } else if (dest.type == 'Shallow History Pseudostate') {
        // check that it's a sibling
        if (!self.hasParentChildRelationship(dest, parentObj)) {
          self.error(dest, 'Initial state must be within the parent!');
        }
      } else if (dest.type == 'End State') {
        // check that it's a sibling
        if (!self.hasParentChildRelationship(dest, parentObj)) {
          self.error(dest, 'Initial state must be within the parent!');
        }
      }
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
