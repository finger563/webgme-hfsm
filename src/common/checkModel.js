
define(['./viz/describe'], function(describe) {
  'use strict';
  return {
    stripRegex: /^([^\n]+)/gm,

    /**
     * What to call an object in an error message.
     *
     * A path is exact and says nothing: '/c/FRESH has invalid Timer
     * Period' leaves you hunting for which box that is. The name is
     * what is written on the diagram, so it goes first.
     *
     * A TRANSITION is identified by its event, whatever its name --
     * the same rule `describe` labels the diagram by, asked of
     * `describe` rather than guessed at here. An earlier version
     * guessed, by treating a name equal to the type as meaningless;
     * that got the common case right and quietly disagreed about a
     * transition somebody had actually renamed, which would then be
     * called one thing in an error and another on the diagram.
     *
     * @param avoid  a property not to identify it by, because the
     *               message is about to quote that property anyway:
     *               'State "1nvalid" has invalid name: '1nvalid'' says
     *               it twice and reads like a stutter.
     */
    describeObject: function(obj, avoid) {
      if (!obj) return 'the model';
      var type = obj.type || 'object';
      var where = obj.path ? ' (' + obj.path + ')' : '';
      if (describe.labelledByEvent(obj)) {
        if (avoid !== 'Event' && obj.Event) {
          return type + ' [' + obj.Event + ']' + where;
        }
        return type + where;
      }
      if (avoid !== 'name' && obj.name && obj.name !== type) {
        return type + ' "' + obj.name + '"' + where;
      }
      return type + where;
    },

    /**
     * The number an attribute holds, or null if it does not hold one.
     *
     * `Number()` on its own is not a test: `Number([])` is 0, so an
     * empty array passed for a timer period and was then rendered by
     * the template as nothing at all -- `return (double)();`, which
     * is exactly the uncompilable output this validation exists to
     * prevent. Booleans and `{}` coerce just as happily.
     *
     * Strings are allowed because a hand-written model may quote the
     * value, and the generator emits it verbatim either way.
     */
    numericValue: function(raw) {
      if (typeof raw === 'number') return isFinite(raw) ? raw : null;
      if (typeof raw === 'string') {
        var text = raw.trim();
        if (text === '') return null;
        var value = Number(text);
        return isFinite(value) ? value : null;
      }
      return null;   // arrays, objects, booleans, null, undefined
    },

    /**
     * A warning that knows which object it is about.
     *
     * An object rather than a string, for the same reason `problem`
     * throws an Error: so a UI can offer to take you there. It
     * stringifies to the message, so anything that concatenates it --
     * the CLI did, before it was taught otherwise -- still reads
     * correctly rather than printing [object Object].
     */
    warning: function(obj, message) {
      var text = 'WARNING: ' + this.describeObject(obj) + ' ' + message;
      return {
        message: text,
        path: obj && obj.path,
        objectName: obj && obj.name,
        objectType: obj && obj.type,
        toString: function() { return text; },
      };
    },

    /**
     * Throw a problem that knows which object it is about.
     *
     * An Error rather than the bare string this used to throw, so the
     * path and name travel WITH the message and a UI can offer to
     * take you there. `message` still reads the same way and still
     * starts with 'ERROR: ', because the CLI, the plugin and the
     * tests all print or match it.
     */
    problem: function(obj, message, avoid) {
      var err = new Error('ERROR: ' + this.describeObject(obj, avoid) + ' ' + message);
      // says "the model is wrong", not "the generator broke" -- the
      // difference decides whether a caller shows a stack trace
      err.name = 'ModelError';
      if (obj) {
        err.path = obj.path;
        err.objectName = obj.name;
        err.objectType = obj.type;
      }
      return err;
    },

    badProperty: function(obj, prop, msg="") {
      var what = "has invalid " + prop + ": '" + (obj ? obj[prop] : '') + "'.";
      throw this.problem(obj, msg.length > 0 ? what + "\n " + msg : what, prop);
    },
    error: function(obj, str) {
      throw this.problem(obj, ": " + str);
    },
    sanitizeString: function(str) {
      return str.replace(/[ \-]/gi,'_');
    },
    // C++ keywords: never legal as any emitted identifier, including
    // individual namespace segments (exported separately so the CLI
    // can validate `-n foo::bar` per segment -- generated-name
    // reservations like 'Root' are fine as namespace segments)
    cppKeywords: [
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
    ],
    // C++ keywords and other identifiers which cannot be used as
    // state / event names since they are emitted directly into
    // generated C++ code (class names, enum values, etc.)
    generatedNames: [
      // identifiers reserved by the generated code itself. 'Event' is
      // included because an event with that name would generate
      // `typedef Event<EventEventData> Event;` in the same scope as
      // the `Event<T>` class template -- an illegal redeclaration.
      'Root', 'StateBase', 'EventBase', 'GeneratedEventBase', 'EventType',
      'EventFactory', 'Event', 'End_State', 'DeepHistoryState',
      'ShallowHistoryState',
      // namespace-scope identifiers emitted by the event-data /
      // states templates: an event (whose typedef lands in the same
      // scope) with one of these names would be an illegal
      // redeclaration
      'detail', 'event_data_to_string', 'consume_event', 'LogCallback'
    ],
    get reservedNames() {
      return this.cppKeywords.concat(this.generatedNames);
    },
    isValidString: function(str) {
      var varDeclExp = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      return varDeclExp.test(str) && this.reservedNames.indexOf(str) === -1;
    },
    /**
     * Why `name` is not usable on a node of this type, or null.
     *
     * The rule differs by type, and every difference is deliberate:
     *
     *  - most names are SANITIZED first, so "State 1" is fine and is
     *    emitted as State_1;
     *  - an Event or a Field name is emitted and matched VERBATIM, so
     *    'BUTTON-PRESS' has to be rejected rather than quietly
     *    becoming BUTTON_PRESS;
     *  - 'End_State' is reserved so that nothing else collides with
     *    the generated class, which means the End State itself is the
     *    one object allowed to be called it.
     *
     * Exported because the editor has to refuse exactly what the
     * checker refuses. Two implementations of this would disagree,
     * and the one in the editor would be the one nobody tested.
     */
    /**
     * Why `value` is not usable as this attribute on a node of this
     * type, or null. The editor's single entry point into these
     * rules, so it can refuse exactly what the checker refuses.
     */
    identifierProblem: function(type, attribute, value) {
      var self = this;
      if (attribute === 'Event') {
        // a transition's trigger is emitted verbatim, like an Event
        // definition's name (checkEvent)
        var raw = String(value == null ? '' : value);
        if (!raw) return null;          // no trigger is a real thing to be
        return self.isValidString(raw) ? null : 'Not a usable C++ name.';
      }
      if (attribute === 'name') {
        if (!String(value == null ? '' : value)) return 'A name is required.';
        return self.nameProblem(type, value);
      }
      return null;
    },

    nameProblem: function(type, name) {
      var self = this;
      var raw = String(name == null ? '' : name);
      if (type === 'Event' || type === 'Field') {
        return self.isValidString(raw) ? null :
          type + ' names must be valid C++ identifiers (alphanumeric ' +
          '+ underscore, starting with a letter).';
      }
      var sanitized = self.sanitizeString(raw);
      if (type === 'End State' && sanitized === 'End_State') {
        return null;   // the conventional default name
      }
      if (!self.isValidString(sanitized)) {
        return type === 'End State'
          ? 'End State names must be valid C++ identifiers.'
          : 'Not a usable C++ name.';
      }
      return null;
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
            if (!model.warnings) {
              model.warnings = [];
            }
            // a WARNING (not console noise): the conversion changes
            // semantics -- as an External Transition the source state
            // is exited and re-entered
            model.warnings.push(
              "Local Transition " + objPath + " (from '" + src.name +
                "' to '" + dst.name + "') does not go from a composite" +
                " state to one of its direct children; treating it as an" +
                " External Transition (the source will be exited and" +
                " re-entered).");
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
          // both the End State and its sibling States generate class
          // declarations in the same scope -- a State named 'End'
          // next to an End State named 'End' would be two classes of
          // the same name
          var endParent = model.objects[obj.parentPath];
          if (endParent && endParent.State_list) {
            endParent.State_list.forEach(function(sibling) {
              if (self.sanitizeString(sibling.name) === sEndName) {
                self.error(obj, "End State '" + obj.name +
                  "' collides with sibling State '" + sibling.name +
                  "' (" + sibling.path + "): both would generate a class named " +
                  sEndName + "!");
              }
            });
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
        else if (obj.type == 'Deep History Pseudostate' ||
                 obj.type == 'Shallow History Pseudostate') {
          // history names are emitted into C++ member identifiers
          self.checkName( obj );
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
        // NOTE: a Field's parent having to be an Event used to be
        // checked here. It is containment, so it now comes from the
        // metamodel and resolveModel rejects it before this runs.
        // Field NAMES / TYPES are still validated above, through the
        // parent Event's Field_list.
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
          // EVERY state emits `getTimerPeriod` -- see StateTempl.cpp
          // -- so every state's period has to be something C++ can
          // return. A composite with "abc" compiled to
          // `return (double)(abc);` and failed the build, because
          // this check used to sit inside the leaf test below.
          //
          // The period only MEANS anything on a leaf, since
          // `sleep_until_event` asks the active leaf for it. So the
          // value is validated everywhere and interpreted only there.
          var numericPeriod = self.numericValue(obj['Timer Period']);
          if (numericPeriod === null) {
            self.badProperty(obj, 'Timer Period',
              'A timer period must be a finite number: the seconds between' +
              ' ticks, or 0 for no timer.');
          } else if (numericPeriod < 0) {
            self.badProperty(obj, 'Timer Period',
              'A timer period cannot be negative. Use 0 for no timer.');
          }

          // Leaf states (determined by LIST LENGTHS -- an empty list
          // is not a child) carry the period the machine sleeps for
          // while they are active.
          //
          // ZERO MEANS NO TIMER, which is what the runtime has always
          // done: `sleep_until_event` blocks until an event arrives
          // rather than spinning on a zero timeout. The checker used
          // to refuse it anyway, which made every state dropped from
          // the palette invalid -- `Timer Period` defaults to 0 in
          // the metamodel -- for a value the generated code handles
          // perfectly well.
          //
          // What is still refused: anything that is not a finite
          // number, since a string-coerced comparison let "abc" and
          // "Infinity" through into `return (double)(abc)`; and
          // negatives, which mean nothing.
          var isLeaf = (obj.State_list || []).length === 0 &&
              (obj.Initial_list || []).length === 0;
          if (isLeaf) {
            if (numericPeriod === 0 && typeof obj.Tick === 'string' &&
                obj.Tick.trim() !== '') {
              // Now that 0 is legal it can be MEANT, so the mistake
              // worth catching is the state that has tick code and no
              // timer to run it. Zero does not stop `tick()` being
              // called -- the documented loop calls it every time
              // round, before it sleeps -- it stops anything WAKING
              // the loop on a schedule, so the code runs at whatever
              // rate events happen to arrive. Legal, occasionally
              // deliberate, and almost never what was intended.
              if (!model.warnings) {
                model.warnings = [];
              }
              model.warnings.push(self.warning(obj,
                "has Tick code but no timer period, so nothing wakes the" +
                  " machine on its own while it is active: the code runs" +
                  " only as often as the event loop comes round, which" +
                  " with no timer means as often as events arrive. Set a" +
                  " timer period, or move the code to Entry."));
            }
          }
        }
      });
      // Rendered sibling objects (States, End States, history
      // pseudostates) each generate a Root member named
      // <SANITIZED_UPPERCASE>_OBJ, so uniqueness must hold on the
      // GENERATED identifier, not the raw name: siblings 'Foo'/'foo'
      // or 'A-B'/'A B' would collide.
      var renderedListKeys = ['State_list', 'End State_list',
                              'Deep History Pseudostate_list',
                              'Shallow History Pseudostate_list'];
      objPaths.map(function(objPath) {
        var parent = model.objects[objPath];
        var byGenerated = Object.create(null);
        renderedListKeys.forEach(function(key) {
          (parent[key] || []).forEach(function(child) {
            var gen = self.sanitizeString(child.name).toUpperCase();
            if (byGenerated[gen]) {
              self.error(child, "'" + child.name + "' (" + child.path +
                ") and '" + byGenerated[gen].name + "' (" +
                byGenerated[gen].path + ") both generate the identifier " +
                gen + "_OBJ!");
            }
            byGenerated[gen] = child;
          });
        });
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
