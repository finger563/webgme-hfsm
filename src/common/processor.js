
define(['./checkModel', './declParser', 'underscore'], function(checkModel, declParser, _) {
  'use strict';
  return {
    stripRegex: /^([^\n]+)/gm,
    // Set-based: a plain-object accumulator would treat names
    // inherited from Object.prototype ('constructor', 'toString',
    // ...) as already-seen and silently drop those events
    uniq: function(a) {
      var seen = new Set();
      return a.filter(function(item) {
        if (seen.has(item)) {
          return false;
        }
        seen.add(item);
        return true;
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
        // go to the State Machine (or Library) object and add it there.
        var p = model.objects[obj.parentPath];
        while (p && p.type && p.type != 'State Machine' && p.type != 'Library') {
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
      obj.hasUnhandledEvents = false;
      obj.isRoot = false;
      obj.isExternalTransition = false;
      obj.isLocalTransition = false;
      obj.isState = false;
      obj.isChoice = false;
      obj.isDeepHistory = false;
      obj.isShallowHistory = false;
      obj.isEnd = false;
      obj.hasEndTransition = false;
    },
    processModel: function(model) {
      var self = this;
      // REMOVE ALL EVENTS THAT ARE MARKED AS DISABLED
      var transitionTypes = ['External Transition', 'Local Transition', 'Internal Transition'];
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
      // FIRST PASS: init basic params on every object. This must be
      // its own pass: addBasicParams resets Substates, so doing it
      // lazily inside the main loop silently dropped children whose
      // objects were serialized before their parent (makeSubstate had
      // already linked them). Processing is order-independent now.
      objPaths.map(function(objPath) {
        self.addBasicParams( model.objects[objPath] );
      });
      // SECOND PASS: type-specific processing and relationship links
      objPaths.map(function(objPath) {
        var obj = model.objects[objPath];
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
        // Process Local Transition Data into convenience
        // members of source State
        else if (obj.type == 'Local Transition') {
          // need function to get final state that doesn't terminate on end states
          var src = model.objects[obj.pointers['src']],
              dst = model.objects[obj.pointers['dst']];
          if ( src && dst ) {
            // valid transition with source and destination pointers in the tree
            // add new data to the object
            obj.isLocalTransition = true;
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
            else {
              // should never happen since this is local transition!
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
            obj.hasEndTransition = endTransition.length > 0;
            if (obj.hasEndTransition)
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
        // Event payload definition: binds payload fields to the event
        // name; the event participates in the machine's event list
        // even if no transition uses it yet (event-library semantics).
        else if (obj.type == 'Event') {
          self.addEvent( model, obj, obj.name );
          var machine = model.objects[obj.parentPath];
          while (machine && machine.type &&
                 machine.type != 'State Machine' && machine.type != 'Library') {
            machine = model.objects[machine.parentPath];
          }
          if (machine) {
            if (!machine.eventDefinitions) {
              machine.eventDefinitions = {};
            }
            machine.eventDefinitions[ obj.name ] = {
              name: obj.name,
              fields: (obj.Field_list || []).map(function(f) {
                return {
                  name: f.name,
                  type: (f.Type || '').trim(),
                  default: (f.Default || '').trim(),
                  // collapsed to one line: the template emits this
                  // after a single '//', so embedded newlines would
                  // become raw C++ in the generated header. A
                  // trailing backslash would line-splice the comment
                  // into the next declaration, so pad it with a space.
                  description: (f.Description || '').trim()
                    .replace(/\s+/g, ' ')
                    .replace(/\\$/, '\\ '),
                };
              }),
            };
          }
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
        if (obj.type == 'State Machine' || obj.type == 'Library') {
          obj.eventNames = self.uniq( obj.eventNames ).sort();
          // full event descriptors for the templates: name + payload
          // fields (empty for events without an Event definition)
          var defs = obj.eventDefinitions || {};
          obj.events = obj.eventNames.map(function(name) {
            var fields = (defs[name] && defs[name].fields) || [];
            return { name: name, fields: fields, hasData: fields.length > 0 };
          });
          // mark each state's event infos so the generated
          // handleEvent can bind the payload alias
          self.markEventData( obj, defs );
          // compute the root-variable aliases each state's generated
          // functions bind, so guards / actions can use bare names
          // (e.g. `someNumber < someValue`) instead of `_root->...`
          self.markRootAliases( obj, model );
        }
      });
      // make sure all objects have convenience members
      self.makeConvenience( model );
    },
    // Compute, for every State in the machine, the list of root HFSM
    // variables its generated functions alias by reference so user
    // code (guards, actions, entry / exit / tick) can use bare names
    // instead of `_root->name`. Best-effort: only variables the
    // declaration parser understands are aliased; names that would
    // collide with generated locals are skipped, as are names the
    // state's own Declarations shadow.
    markRootAliases: function(machine, model) {
      var self = this;
      if (model && !model.warnings) {
        model.warnings = [];
      }
      // names of locals bound by the generated functions themselves
      var reservedLocals = ['event', 'handled', 'data'];
      var rootVars = declParser
          .parseDeclarations( machine.Declarations || '' )
          .variables.filter(function(v) {
            return reservedLocals.indexOf(v.name) === -1;
          });
      var rootNames = rootVars.map(function(v) { return v.name; });
      var visit = function(state) {
        if (state.isState) {
          var ownNames = declParser
              .parseDeclarations( state.Declarations || '' )
              .variables.map(function(v) { return v.name; });
          // a state variable with the same name as a machine variable
          // shadows it in that state's code -- legal, but surprising
          // now that bare-name access resolves to the machine
          // variable everywhere else
          var shadowed = ownNames.filter(function(n) {
            return rootNames.indexOf(n) > -1;
          });
          if (shadowed.length && model) {
            model.warnings.push(
              "State '" + (state.name || state.path) + "' (" + state.path +
                ") declares variable(s) shadowing machine variable(s): " +
                shadowed.join(', ') +
                " -- bare references in this state resolve to the state's" +
                " own variable, not the machine's.");
          }
          state.rootAliases = rootVars.filter(function(v) {
            return ownNames.indexOf(v.name) === -1;
          }).map(function(v) { return { name: v.name }; });
        }
        (state.Substates || []).forEach(visit);
      };
      (machine.Substates || []).forEach(visit);
    },
    // recursively set hasData on every InternalEvents / ExternalEvents
    // info in the machine's substate tree
    markEventData: function(obj, defs) {
      var self = this;
      ['InternalEvents', 'ExternalEvents'].forEach(function(key) {
        (obj[key] || []).forEach(function(info) {
          var def = defs[info.name];
          info.hasData = !!(def && def.fields && def.fields.length);
        });
      });
      (obj.Substates || []).forEach(function(s) {
        self.markEventData( s, defs );
      });
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
      // The root State Machine's UnhandledEvents is seeded with all of
      // its event names by makeConvenience; do not recompute it from a
      // containing Project object (whose UnhandledEvents is empty) --
      // that silently disabled this optimization for every state.
      if (parent && !obj.isRoot) {
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
        obj.hasUnhandledEvents = obj.UnhandledEvents.length > 0;
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
          obj.hasUnhandledEvents = obj.UnhandledEvents.length > 0;
          self.findUnhandledEvents(obj, model.objects);
        }
      });
    },
    // Guarded transitions come before the (single) unguarded
    // transition so the generated else-if chain checks guards first.
    // Among guarded transitions, sort by model path so generation is
    // deterministic (model iteration order is not guaranteed).
    transitionSort: function(transA, transB) {
      var a = transA.Guard;
      var b = transB.Guard;
      if (!a && b) return 1;
      if (a && !b) return -1;
      if (transA.path < transB.path) return -1;
      if (transA.path > transB.path) return 1;
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
