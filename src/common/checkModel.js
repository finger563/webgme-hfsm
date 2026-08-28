
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
    // C++ keywords and other identifiers which cannot be used as
    // state / event names since they are emitted directly into
    // generated C++ code (class names, enum values, etc.)
    reservedNames: [
      'alignas','alignof','and','and_eq','asm','auto','bitand','bitor','bool',
      'break','case','catch','char','char8_t','char16_t','char32_t','class',
      'compl','concept','const','consteval','constexpr','constinit','const_cast',
      'continue','co_await','co_return','co_yield','decltype','default','delete',
      'do','double','dynamic_cast','else','enum','explicit','export','extern',
      'false','float','for','friend','goto','if','inline','int','long','mutable',
      'namespace','new','noexcept','not','not_eq','nullptr','operator','or',
      'or_eq','private','protected','public','register','reinterpret_cast',
      'requires','return','short','signed','sizeof','static','static_assert',
      'static_cast','struct','switch','template','this','thread_local','throw',
      'true','try','typedef','typeid','typename','union','unsigned','using',
      'virtual','void','volatile','wchar_t','while','xor','xor_eq',
      // identifiers reserved by the generated code itself. 'Event' is
      // included because an event with that name would generate
      // `typedef Event<EventEventData> Event;` in the same scope as
      // the `Event<T>` class template -- an illegal redeclaration.
      'Root', 'StateBase', 'EventBase', 'GeneratedEventBase', 'EventType',
      'EventFactory', 'Event', 'End_State', 'DeepHistoryState',
      'ShallowHistoryState'
    ],
    isValidString: function(str) {
      var varDeclExp = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      return varDeclExp.test(str) && this.reservedNames.indexOf(str) === -1;
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
      // Event names (from transitions and Event definitions) are
      // scoped per containing State Machine / Library -- each machine
      // generates into its own namespace -- so both exact-duplicate
      // definition tracking and the case-collision check are per
      // machine, not global: { machinePath: [names] }
      var eventNames = {};
      var eventDefinitionNames = {};
      var topLevelObject = null;
      // walk up to the containing State Machine / Library path
      var machineKeyOf = function(obj) {
        var p = model.objects[obj.parentPath];
        while (p && p.type &&
               p.type != 'State Machine' && p.type != 'Library') {
          p = model.objects[p.parentPath];
        }
        return p ? p.path : '';
      };
      var addEventName = function(obj, name) {
        var key = machineKeyOf(obj);
        if (!eventNames[key]) {
          eventNames[key] = [];
        }
        eventNames[key].push(name);
      };
      var objPaths = Object.keys(model.objects);
      objPaths.map(function(objPath) {
        var obj = model.objects[objPath];
        if (obj.type == 'Project' ||
            obj.type == 'State Machine' ||
            obj.type == 'Library') {
          // checks: name -- rendered Library / machine names become
          // C++ identifiers AND artifact file names, so this also
          // blocks path characters ('../../x') from escaping --out
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
          if ( self.hasEvent(obj) )
            addEventName(obj, obj.Event);
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

          // local semantics require the source to be the composite
          // parent and the destination one of its DIRECT children --
          // the symmetric check also accepted child->parent, which is
          // not local (and exported invalid SCXML type="internal")
          if ( dst.parentPath !== src.path ) {
            console.log(`Local Transition ${objPath} does not go from a composite parent to a direct child - converting ${objPath} to External Transition!`);
            obj.type = 'External Transition';
          }

          if ( !self.hasEvent( obj ) ) {
            self.error(obj, "LOCAL TRANSITIONS MUST HAVE EVENTS");
          }
          // store the event name for later
          addEventName(obj, obj.Event);
        }
        else if (obj.type == 'Internal Transition') {
          self.checkEvent(obj);
          // checks: event
          if ( !self.hasEvent( obj ) ) {
            self.error(obj, "INTERNAL TRANSITIONS MUST HAVE EVENTS");
          }
          // store the event name for later
          addEventName(obj, obj.Event);
        }
        else if (obj.type == 'End State') {
          // the sanitized name becomes the generated END class name.
          // 'End_State' itself is exempt from the reserved-name list:
          // it is the conventional default name (the reservation
          // exists to stop OTHER objects from colliding with it)
          var sEndName = self.sanitizeString(obj.name);
          if (sEndName !== 'End_State' && !self.isValidString(sEndName)) {
            self.badProperty(obj, 'name',
              'End State names must be valid C++ identifiers.');
          }
        }
        // Process Choice Pseudostate Data
        else if (obj.type == 'Choice Pseudostate') {
          // checks:
          // * must have unguarded transition,
          // * exit transitions must not have events
          var outTrans = self.getTransitionsOutOf( obj, model.objects );
          outTrans.map(function(trans) {
            if ( self.hasEvent( trans ) )
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
          // * no choice -> ... -> choice cycles: the generated code
          //   inlines choice chains recursively, so a cycle would
          //   overflow the template recursion. Each branch carries a
          //   COPY of its path so converging DAGs remain valid.
          var checkChoiceCycles = function(choice, pathSoFar) {
            if (pathSoFar.indexOf(choice.path) > -1) {
              self.error(obj, "Choice pseudostate cycle detected: " +
                         pathSoFar.concat(choice.path).join(' -> '));
            }
            self.getTransitionsOutOf( choice, model.objects )
              .forEach(function(t) {
                var dst = model.objects[t.pointers['dst']];
                if (dst && dst.type == 'Choice Pseudostate') {
                  checkChoiceCycles(dst, pathSoFar.concat(choice.path));
                }
              });
          };
          checkChoiceCycles(obj, []);
        }
        else if (obj.type == 'Deep History Pseudostate') {
        }
        else if (obj.type == 'Shallow History Pseudostate') {
        }
        else if (obj.type == 'Event') {
          // Event payload definition, bound by name to transitions'
          // Event attribute. checks:
          // * name is a valid identifier
          // * no two Event definitions share a name
          // * field names are valid, unique within the event
          // * field types are non-empty
          //
          // NOTE: the RAW name is validated (not the sanitized
          // spelling checkName tests) because event names are emitted
          // and matched verbatim -- 'BUTTON-PRESS' must be rejected,
          // not silently accepted as BUTTON_PRESS. This matches the
          // transition Event validation (checkEvent).
          if ( !self.isValidString( obj.name ) ) {
            self.badProperty(obj, 'name',
              'Event names must be valid C++ identifiers (alphanumeric + underscore, starting with a letter).');
          }
          // find the containing machine for scoped uniqueness
          var machine = model.objects[obj.parentPath];
          while (machine && machine.type &&
                 machine.type != 'State Machine' && machine.type != 'Library') {
            machine = model.objects[machine.parentPath];
          }
          var machineKey = machine ? machine.path : '';
          if (!eventDefinitionNames[machineKey]) {
            eventDefinitionNames[machineKey] = [];
          }
          if (eventDefinitionNames[machineKey].indexOf(obj.name) > -1) {
            self.error(obj, "Two Event definitions have the same name: " + obj.name);
          }
          eventDefinitionNames[machineKey].push(obj.name);
          // participate in the case-collision check with used events
          addEventName(obj, obj.name);
          var fieldNames = [];
          (obj.Field_list || []).map(function(field) {
            // field names are emitted verbatim as C++ members --
            // validate the raw name
            if ( !self.isValidString( field.name ) ) {
              self.badProperty(field, 'name',
                'Field names must be valid C++ identifiers (alphanumeric + underscore, starting with a letter).');
            }
            if (fieldNames.indexOf(field.name) > -1) {
              self.error(obj, "Event " + obj.name +
                         " has two fields named: " + field.name);
            }
            fieldNames.push(field.name);
            if (!field.Type || !field.Type.trim().length) {
              self.badProperty(field, 'Type',
                               'Event fields must have a C++ type.');
            }
          });
          // 'data' is the generated payload alias in guard / action
          // scope; a field cannot shadow it
          if (fieldNames.indexOf('data') > -1) {
            self.error(obj, "Event fields cannot be named 'data' " +
                       "(reserved for the payload alias).");
          }
        }
        else if (obj.type == 'Field') {
          // validated through its parent Event above
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
          if ((obj.Includes || '').trim().length > 0) {
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
          if (obj.State_list && obj.State_list.length > 0) {
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
            }, Object.create(null));
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
              var guardMap = Object.create(null);
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
              self.error(obj, "END TRANSITION cannot have guard!");
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
      // checks: event name uniqueness (per machine -- events in
      // different machines generate into separate namespaces and
      // never collide)
      Object.keys(eventNames).forEach(function(machineKey) {
        var errTarget = model.objects[machineKey] || topLevelObject;
        // null-prototype accumulator: with a plain object, an event
        // named e.g. 'constructor' would hit the inherited property
        // via `in` and crash / misvalidate
        eventNames[machineKey].reduce((_map, event) => {
          var e = event.trim().toLowerCase();
          if (e in _map) {
            if (_map[e].indexOf(event) == -1) {
              var msg = "Cannot have multiple events with similar names!";
              msg += `\n name "${event}" will collide with "${_map[e][0]}"`;
              self.error(errTarget, msg);
            } else {
              // we're fine, this is the exact same event we already had :)
            }
          } else {
            _map[e] = [event];
          }
          return _map;
        }, Object.create(null));
      });
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
      // directional: the destination must be a DIRECT CHILD of the
      // parent composite. The old symmetric relationship check also
      // accepted the composite's own parent as "within".
      var isDirectChild = function(d) {
        return d.parentPath === parentObj.path;
      };
      if (dest.type == 'Choice Pseudostate') {
        var destinations  = self.getChoiceDestinations(dest, objDict);
        // ensure all choice pseudostate transitions along this
        // path stay within the parent state
        destinations.map((d) => {
          if (!isDirectChild(d)) {
            self.error(d, 'Initial state must be within the parent!');
          }
        });
      } else {
        // State / Deep History / Shallow History / End State
        if (!isDirectChild(dest)) {
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
