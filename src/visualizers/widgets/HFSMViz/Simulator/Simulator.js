/**
 * @author William Emfinger  https://github.com/finger563
 */

define(['js/util',
        'q',
        './Choice',
        './FormDialog',
        'hfsm/declParser',
        'hfsm/checkModel',
        'bower/mustache.js/mustache.min',
        'bower/highlightjs/highlight.pack.min',
        'text!./Simulator.html',
        'css!decorators/UMLStateMachineDecorator/DiagramDesigner/UMLStateMachineDecorator.DiagramDesignerWidget.css',
        'css!bower/highlightjs/styles/default.css',
        'css!./Simulator.css'],
       function(Util,
                Q,
                Choice,
                FormDialog,
                declParser,
                checkModel,
                mustache,
                hljs,
                SimulatorHtml){
         'use strict';

         var Simulator;

         // must match the widget's root types (HFSMVizWidget.js)
         var rootTypes = ['State Machine', 'Library'];

         // shared with the generator: valid C++ identifier, not a
         // keyword / reserved generated name. Used for Event names.
         function isValidEventName(name) {
           return checkModel.isValidString(name);
         }
         // Field names additionally reserve 'data' (the generated
         // payload alias); Event names do not (an event named 'data'
         // is valid and compiles)
         function isValidFieldName(name) {
           return checkModel.isValidString(name) && name != 'data';
         }

         var parentTempl = ['<div class="simulatorTitle">Child of:',
                            '</div>'].join('\n');

         var eventTempl = [
           '<div>',
           '<div id="{{eventName}}" class="row btn btn-default btn-primary btn-block eventButton">',
           '<span class="eventButtonText">{{eventName}}</span>',
           '</div>',
           '<div id="show_{{eventName}}" class="row btn btn-default btn-info showEventButton">',
           '<i class="fa fa-eye">',
           '<span class="eventButtonText" style="display:none">{{eventName}}</span>',
           '</i>',
           '</div>',
           '</div>',
         ].join('\n');

         var stateTemplate = [
           '<div id="{{id}}" class="uml-state-machine">',
           '<div class="uml-state-diagram">',
           '<div class="state">',
           '<div class="name">{{name}}</div>',
           '<ul class="internal-transitions">',
           '</ul>',
           '</div>',
           '</div>',
           '</div>',
         ].join('\n');

         /**
          * Simulator Constructor
          * Insert dialog modal into body and initialize editor with
          * customized options
          */
         Simulator = function () {
         };

         /**
          * @param  {DOM Element}   container  The container for the Simulator
          * @param  {Object}        nodes      Descriptor table (shared with
          *                                    the widget; see ModelBackend)
          * @param  {ModelBackend}  backend    Reads meta and applies edits.
          *                                    The simulator never touches a
          *                                    model store directly, so it can
          *                                    run against WebGME or a plain
          *                                    JSON model in the browser.
          * @return {void}
          */
         Simulator.prototype.initialize = function ( container, nodes, backend ) {
           var self = this;

           self._backend = backend;

           container.append( SimulatorHtml );
           self._container = container;
           self._el = $(container).find('#hfsmSimulator').first();
           self._top = $(container).find('.simulator-top-panel').first();
           self._bottom = $(container).find('.simulator-bottom-panel').first();
           self._handle = $(container).find('#simulatorHandle').first();

           self._logEl = null;

           // NODE RELATED DATA
           self.nodes = nodes;

           // EVENT RELATED DATA
           self._eventButtons = self._el.find('#eventButtons').first();

           // VARIABLE INSPECTION PANEL
           self._variablesEl = self._el.find('#variablesPanel').first();
           // current (user-editable) values keyed by variable name;
           // null means (re)seed from the parsed initializers
           self._variableValues = null;

           // EVENT DEFINITIONS PANEL
           self._eventDefsEl = self._el.find('#eventDefsPanel').first();
           // simulated payload values: {eventName: {fieldName: value}};
           // null means (re)seed from the Field defaults
           self._eventFieldValues = null;
           // name of the event currently being dispatched (payload
           // context for guard prompts)
           self._currentEventName = null;
           // guard-prompt lifecycle: an open Choice dialog is tracked
           // so a model switch can dismiss it, and the epoch counter
           // invalidates its (stale) resolution
           self._activeChoice = null;
           // an open add/edit form dialog, dismissed on model switch
           self._activeDialog = null;
           self._simEpoch = 0;
           var addEventBtn = self._el.find('#addEventBtn').first();
           addEventBtn.on('click', function() { self.onAddEvent(); });
           // when on, clicking a payload-carrying event button asks for
           // that spawn's values instead of using the panel's directly
           self._promptForPayload = false;
           var promptToggle = self._el.find('#promptPayloadToggle').first();
           promptToggle.on('change', function() {
             self._promptForPayload = $(this).is(':checked');
             self.log('Payload prompt ' +
                      (self._promptForPayload ? 'enabled' : 'disabled'));
           });

           // STATE INFO DISPLAY
           self._stateInfo = self._el.find('#stateInfo').first();

           // Active state information
           self._activeState = null;

           // History state information
           self._historyStates = {}; // map from history state ID to remembered state

           // DRAGGING INFO
           self.isDragging = false;

           self._handle.mousedown(function(e) {
             self.isDragging = true;
             e.preventDefault();
           });
           self._el.mouseup(function() {
             self.isDragging = false;
           }).mousemove(function(e) {
             if (self.isDragging) {
               var selector = $(self._container).parent();
               var mousePosY = e.pageY;

               // convert Y position as needed
               // get offset from split panel
               var splitOffset = $(self._container).parents('.panel-base-wh').parent().position().top;
               mousePosY -= splitOffset;
               // get offset from top panel
               var northOffset = $('.ui-layout-pane-center').position().top;
               mousePosY -= northOffset;

               var maxHeight = selector.height();
               var handlePercent = 0.5;
               var minY = 0;
               var maxY = selector.height() + minY;
               var topHeight = mousePosY - minY;
               var topPercent = Math.max(10, (topHeight / maxHeight) * 100);
               var bottomPercent = Math.max(10, 100 - topPercent - handlePercent);
               topPercent = 100 - bottomPercent - handlePercent;
               self._top.css('height', topPercent + '%');
               self._bottom.css('height', bottomPercent + '%');
               self._handle.css('height', handlePercent + '%');
             }
           });
         };

         Simulator.prototype.log = function( msg ) {
           var self = this;
           if (self._logEl) {
             // append as a TEXT node: jQuery .append(string) parses
             // HTML, so logging model content (guards containing '<',
             // user-entered variable / payload values) verbatim could
             // both break rendering and execute injected markup
             self._logEl.append(document.createTextNode(`${msg}\n`));
             var div = self._logEl.get(0);
             div.scrollTop = div.scrollHeight;
           } else {
             console.log(msg);
           }
         };

         Simulator.prototype.clearLogs = function() {
           var self = this;
           if (self._logEl) {
             self._logEl.empty();
           }
         };

         /* * * * EXTERNAL INTERFACE - NOT CALLED HERE  * * * * * */

         Simulator.prototype.setLogDisplay = function( logEl ) {
           var self = this;
           self._logEl = logEl;
         };

         /* * * * * *  Variable Inspection Panel   * * * * * * * */

         function escapeHtml(str) {
           return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
             .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
         }

         /**
          * Parse the Declarations blocks of the machine and its
          * states into a variable list (best-effort; see
          * hfsm/declParser). Shared with the code generator so the
          * simulator and generated code can never disagree about
          * what a model's variables are.
          */
         Simulator.prototype.getDeclaredVariables = function() {
           var self = this;
           var variables = [];
           var opaqueCount = 0;
           var opaqueStatements = []; // unparsed state declarations
           Object.keys(self.nodes).sort().forEach(function(id) {
             var desc = self.nodes[id];
             if (!desc || desc.isConnection) return;
             if (rootTypes.indexOf(desc.type) > -1 || desc.type == 'State') {
               if (desc.Declarations && desc.Declarations.trim().length) {
                 var parsed = declParser.parseDeclarations(
                   desc.Declarations, desc.name);
                 parsed.variables.forEach(function(v) {
                   v.isMachine = rootTypes.indexOf(desc.type) > -1;
                   // storage key uses the node ID for identity: state
                   // *names* are only unique among siblings, so two
                   // states both named e.g. 'Idle' must not collapse
                   // their variables into one value. The name stays
                   // for display (v.scope).
                   v.nodeId = id;
                   v.key = id + '::' + v.name;
                 });
                 variables = variables.concat(parsed.variables);
                 opaqueCount += parsed.opaque.length;
                 if (parsed.opaque.length &&
                     rootTypes.indexOf(desc.type) === -1) {
                   parsed.opaque.forEach(function(stmt) {
                     opaqueStatements.push({ nodeId: id, scope: desc.name,
                                             stmt: stmt });
                   });
                 }
               }
             }
           });
           // mark state variables that shadow a machine variable
           var machineNames = variables.filter(function(v) {
             return v.isMachine;
           }).map(function(v) { return v.name; });
           variables.forEach(function(v) {
             v.shadowsMachine = !v.isMachine &&
               machineNames.indexOf(v.name) > -1;
           });
           return { variables: variables, opaqueCount: opaqueCount,
                    opaqueStatements: opaqueStatements };
         };

         /**
          * Render the variables panel. Values persist across updates
          * (they are the user's simulated machine state) and reset to
          * the parsed initializers on HFSM-Restart.
          */
         Simulator.prototype.updateVariablesPanel = function() {
           var self = this;
           if (!self._variablesEl || !self._variablesEl.length) return;
           var parsed = self.getDeclaredVariables();
           var previous = self._variableValues; // null -> seed initials
           // null-prototype: keys are user identifiers ('__proto__'
           // must store, not hit the prototype setter)
           var current = Object.create(null);
           parsed.variables.forEach(function(v) {
             current[v.key] = (previous && Object.prototype.hasOwnProperty.call(previous, v.key)) ?
               previous[v.key] : v.initial;
           });
           self._variableValues = current;
           // guard-context lookup tables: machine-scoped variables,
           // plus per-state variables (bare references in a state that
           // declares the same name resolve to the state's variable)
           self._machineVariables = Object.create(null);
           self._stateVariables = Object.create(null);
           // machine-variable names mentioned in a state's UNPARSED
           // declarations: the generator conservatively suppresses
           // their aliases there, so bare references are unresolvable
           self._opaqueShadows = Object.create(null);
           parsed.variables.forEach(function(v) {
             if (v.isMachine) {
               self._machineVariables[v.name] = v.key;
             } else {
               if (!self._stateVariables[v.nodeId]) {
                 self._stateVariables[v.nodeId] = Object.create(null);
               }
               self._stateVariables[v.nodeId][v.name] = v.key;
             }
           });
           var opaqueShadowNotes = [];
           var machineNamesList = Object.keys(self._machineVariables);
           (parsed.opaqueStatements || []).forEach(function(o) {
             declParser.referencedNames(o.stmt, machineNamesList)
               .forEach(function(n) {
                 var owned = self._stateVariables[o.nodeId];
                 if (owned && Object.prototype.hasOwnProperty.call(owned, n)) return;
                 if (!self._opaqueShadows[o.nodeId]) {
                   self._opaqueShadows[o.nodeId] = [];
                 }
                 if (self._opaqueShadows[o.nodeId].indexOf(n) === -1) {
                   self._opaqueShadows[o.nodeId].push(n);
                   opaqueShadowNotes.push('⚠ ' + o.scope +
                     ': unparsed declaration may shadow machine variable "' +
                     n + '"');
                 }
               });
           });

           self._variablesEl.empty();
           parsed.variables.forEach(function(v) {
             var title = v.scope + ' : ' + v.type;
             if (v.shadowsMachine) {
               title += ' -- WARNING: shadows the machine variable "' +
                 v.name + '"; bare references in ' + v.scope +
                 " resolve to this state's variable, not the machine's";
             }
             var row = $('<div class="variableRow"></div>').attr('title', title);
             if (v.shadowsMachine) {
               row.addClass('variableShadowWarning');
             }
             var label = v.isMachine ? v.name : (v.scope + '.' + v.name);
             var nameEl = $('<span class="variableName"></span>')
                 .text((v.shadowsMachine ? '⚠ ' : '') + label);
             var input = $('<input class="variableValue" type="text"/>')
                 .attr('aria-label', 'Value of variable ' + label)
                 .val(current[v.key]);
             input.on('change', function() {
               self._variableValues[v.key] = $(this).val();
               self.log('VARIABLE: ' + label + ' = ' + $(this).val());
             });
             row.append(nameEl).append(input);
             self._variablesEl.append(row);
           });
           opaqueShadowNotes.forEach(function(note) {
             self._variablesEl.append(
               $('<div class="variableNote variableShadowWarning"></div>')
                 .text(note));
           });
           if (parsed.opaqueCount) {
             self._variablesEl.append(
               $('<div class="variableNote"></div>')
                 .text('(' + parsed.opaqueCount +
                       ' declaration(s) not parsed)'));
           }
         };

         /**
          * HTML fragment listing the current values of the variables
          * -- and, when handling an event with a payload definition,
          * the `data.<field>` payload values -- referenced by the
          * given transitions' guards; empty string if none.
          *
          * Name resolution mirrors the generated code: an explicit
          * `_root->name` always reads the machine variable; a bare
          * `name` reads the source state's own variable when that
          * state declares one (shadowing), otherwise the machine's.
          * (For guards on choice pseudostates reached mid-transition
          * the original source state's shadowing is not tracked; the
          * choice itself has no declarations, so bare names resolve
          * to the machine there -- best effort.)
          */
         Simulator.prototype.getGuardContext = function( transitionIds ) {
           var self = this;
           var parts = [];
           var seen = Object.create(null);
           var addPart = function(label, key) {
             var values = self._variableValues || {};
             var v = values[key];
             var text = escapeHtml(label) + ' = ' +
                 escapeHtml(v === '' || v === undefined ? '?' : v);
             if (!seen[text]) {
               seen[text] = true;
               parts.push(text);
             }
           };
           var machineVars = self._machineVariables || {};
           var stateVars = self._stateVariables || {};
           var names = Object.keys(machineVars);

           transitionIds.forEach(function(tid) {
             var node = self.nodes[ tid ];
             if (!node) return;
             var guard = node.Guard;
             if (!guard || !guard.trim().length) return;
             // scope of bare references: the transition's source (for
             // internal transitions, the declaring state)
             var srcStateId = node.isConnection ? node.src : node.parentId;
             var ownVars = stateVars[ srcStateId ] || {};
             // explicit `_root->name` references always read the
             // machine variable (referencedNames excludes them along
             // with all other member accesses, so test separately)
             names.forEach(function(n) {
               var explicitRe = new RegExp('_root\\s*->\\s*' + n + '\\b');
               if (explicitRe.test(guard)) {
                 addPart('_root->' + n, machineVars[n]);
               }
             });
             // bare references (member accesses like `stats.count`,
             // `data.count`, or `_root->count` are excluded by
             // referencedNames)
             declParser.referencedNames(guard, names).forEach(function(n) {
               var opaque = (self._opaqueShadows || {})[srcStateId] || [];
               if (!Object.prototype.hasOwnProperty.call(ownVars, n) && opaque.indexOf(n) > -1) {
                 // possibly shadowed by an unparsed declaration --
                 // the value cannot be resolved
                 var txt = escapeHtml(n) + ' = ? (possibly shadowed)';
                 if (!seen[txt]) { seen[txt] = true; parts.push(txt); }
               } else {
                 addPart(n, Object.prototype.hasOwnProperty.call(ownVars, n) ?
                         ownVars[n] : machineVars[n]);
               }
             });
             // state-only variables (shadowing or state-local) that
             // the machine does not declare
             var ownOnly = Object.keys(ownVars).filter(function(n) {
               return names.indexOf(n) === -1;
             });
             declParser.referencedNames(guard, ownOnly).forEach(function(n) {
               addPart(n, ownVars[n]);
             });
           });

           // payload fields of the event currently being handled
           var eventDef = self._currentEventName &&
               self.getEventDefinition( self._currentEventName );
           if (eventDef) {
             var fieldValues = (self._eventFieldValues || {})[eventDef.name] || {};
             var fieldNames = eventDef.fields.map(function(f) { return f.name; });
             transitionIds.forEach(function(tid) {
               var node = self.nodes[ tid ];
               var guard = node && node.Guard;
               if (!guard) return;
               declParser.referencedFields(guard, fieldNames).forEach(function(n) {
                 var v = Object.prototype.hasOwnProperty.call(fieldValues, n) ? fieldValues[n] : '';
                 var text = 'data.' + escapeHtml(n) + ' = ' +
                     escapeHtml(v === '' ? '?' : v);
                 if (!seen[text]) {
                   seen[text] = true;
                   parts.push(text);
                 }
               });
             });
           }
           if (!parts.length) return '';
           return '<div class="guardContext">current values: ' +
             parts.join(', ') + '</div>';
         };

         /* * * * * *  Event Definitions Panel     * * * * * * * */

         /**
          * Collect Event payload definition nodes (with their Field
          * children) from the model.
          */
         Simulator.prototype.getEventDefinitions = function() {
           var self = this;
           var defs = [];
           Object.keys(self.nodes).sort().forEach(function(id) {
             var desc = self.nodes[id];
             if (!desc || desc.type != 'Event') return;
             var fields = (desc.childrenIds || []).sort().map(function(cid) {
               return self.nodes[cid];
             }).filter(function(c) {
               return c && c.type == 'Field';
             }).map(function(c) {
               return {
                 id: c.id,
                 name: c.name,
                 type: c.Type || 'int',
                 default: c.Default || '',
                 description: c.Description || '',
               };
             });
             defs.push({ id: desc.id, name: desc.name, fields: fields });
           });
           defs.sort(function(a, b) { return a.name < b.name ? -1 : 1; });
           return defs;
         };

         Simulator.prototype.getEventDefinition = function( eventName ) {
           var self = this;
           var matches = self.getEventDefinitions().filter(function(d) {
             return d.name == eventName;
           });
           return matches.length ? matches[0] : null;
         };

         /**
          * Render the Events panel: each Event definition with its
          * fields; field values are editable (they are the simulated
          * payload used by the guard-context display) and the model
          * itself can be extended / edited through the [+] / edit
          * controls.
          */
         Simulator.prototype.updateEventDefsPanel = function() {
           var self = this;
           if (!self._eventDefsEl || !self._eventDefsEl.length) return;
           var defs = self.getEventDefinitions();
           var previous = self._eventFieldValues; // null -> seed defaults
           var current = Object.create(null);
           defs.forEach(function(def) {
             current[def.name] = Object.create(null);
             def.fields.forEach(function(f) {
               var prev = previous && previous[def.name];
               current[def.name][f.name] =
                 (prev && Object.prototype.hasOwnProperty.call(prev, f.name)) ?
                 prev[f.name] : f.default;
             });
           });
           self._eventFieldValues = current;

           self._eventDefsEl.empty();
           defs.forEach(function(def) {
             var header = $('<div class="eventDefHeader"></div>');
             header.append($('<span class="eventDefName"></span>')
                           .text(def.name));
             var addFieldBtn = $('<button type="button" class="eventDefBtn" title="Add a field to ' +
                                 escapeHtml(def.name) + '" aria-label="Add a field to ' +
                                 escapeHtml(def.name) + '">+</button>');
             addFieldBtn.on('click', function() { self.onAddField(def); });
             header.append(addFieldBtn);
             self._eventDefsEl.append(header);
             def.fields.forEach(function(f) {
               var row = $('<div class="variableRow eventFieldRow"></div>')
                   .attr('title', f.type +
                         (f.default ? ' = ' + f.default : '') +
                         (f.description ? ' -- ' + f.description : ''));
               row.append($('<span class="variableName"></span>')
                          .text(f.name + ' : ' + f.type));
               var input = $('<input class="variableValue" type="text"/>')
                   .attr('aria-label', 'Value of ' + def.name + '.' +
                         f.name + ' payload field')
                   .val(current[def.name][f.name]);
               input.on('change', function() {
                 self._eventFieldValues[def.name][f.name] = $(this).val();
                 self.log('PAYLOAD: ' + def.name + '.' + f.name +
                          ' = ' + $(this).val());
               });
               var editBtn = $('<button type="button" class="eventDefBtn" title="Edit field ' +
                               escapeHtml(f.name) + '" aria-label="Edit field ' +
                               escapeHtml(f.name) + '">&#9998;</button>');
               editBtn.on('click', function() { self.onEditField(def, f); });
               row.append(input).append(editBtn);
               self._eventDefsEl.append(row);
             });
             if (!def.fields.length) {
               self._eventDefsEl.append(
                 $('<div class="variableNote"></div>').text('(no payload)'));
             }
           });
         };

         /**
          * Find the meta node id for a child type creatable under the
          * given parent node (e.g. 'Event' under the State Machine,
          * 'Field' under an Event).
          */
         /**
          * Whether `typeName` can still be created under `parentId`.
          * The backend resolves what that means for its model store.
          */
         Simulator.prototype.canCreateChild = function( parentId, typeName ) {
           var self = this;
           if (!self._backend) return false;
           return Object.prototype.hasOwnProperty.call(
             self._backend.getValidChildTypes( parentId ), typeName );
         };

         /**
          * Validation shared by the add / edit dialogs. Returns an
          * error string (kept inline in the dialog) or undefined.
          */
         Simulator.prototype.validateEventName = function( name ) {
           var self = this;
           if (!name || !name.trim()) {
             return 'An event name is required.';
           }
           name = name.trim();
           if (!isValidEventName(name)) {
             return '"' + name + '" must be a C++ identifier and not a ' +
               'keyword or reserved generated name.';
           }
           if (self.getEventDefinition(name)) {
             return 'An Event definition named "' + name + '" already exists.';
           }
           // names differing only by case collide in checkModel; an
           // EXACT match with a used (but undefined) event is fine --
           // that is how a used event gains its payload definition
           var lower = name.toLowerCase();
           var clash = self.getEventNames().filter(function(e) {
             return e && e.trim().length;
           }).filter(function(e) {
             return e.toLowerCase() == lower && e != name;
           });
           if (clash.length) {
             return '"' + name + '" differs only by case from the existing ' +
               'event "' + clash[0] + '"; the model checker rejects that.';
           }
         };

         Simulator.prototype.validateFieldValues = function( def, values, fieldId ) {
           var name = (values.name || '').trim();
           if (!name) {
             return 'A field name is required.';
           }
           if (!isValidFieldName(name)) {
             return '"' + name + '" must be a C++ identifier, not a keyword ' +
               'or reserved generated name, and not "data".';
           }
           var duplicate = def.fields.filter(function(f) {
             return f.name == name && f.id !== fieldId;
           });
           if (duplicate.length) {
             return def.name + ' already has a field named "' + name + '".';
           }
           if (!(values.type || '').trim()) {
             return 'A C++ type is required.';
           }
         };

         /**
          * Open a form dialog, tracking it so a model switch dismisses
          * it (see reset()).
          */
         Simulator.prototype.openFormDialog = function( title, fields, validate ) {
           var self = this;
           var epoch = self._simEpoch;
           var dialog = new FormDialog();
           self._activeDialog = dialog;
           dialog.initialize( title, fields, validate );
           dialog.show();
           return dialog.waitForValues().then(function(values) {
             if (self._activeDialog === dialog) {
               self._activeDialog = null;
             }
             // the model was switched while this dialog was open: its
             // target objects may be gone, so do not act on it
             if (epoch !== self._simEpoch) {
               return undefined;
             }
             return values;
           });
         };

         Simulator.prototype.onAddEvent = function() {
           var self = this;
           var machineId = self.getTopLevelId();
           if (!self.canCreateChild( machineId, 'Event' )) {
             alert('The metamodel does not allow Event definitions under ' +
                   'this State Machine -- is the Event meta type installed?');
             return;
           }
           self.openFormDialog('Add event', [
             { key: 'name', label: 'Event name', value: '',
               hint: 'C++ identifier; matches transitions using this event' },
           ], function(values) {
             return self.validateEventName( values.name );
           }).then(function(values) {
             if (!values) return; // cancelled
             var name = values.name.trim();
             self._backend.transact('Adding Event definition ' + name, function () {
               var newId = self._backend.createChild(machineId, 'Event');
               self._backend.setAttribute(newId, 'name', name);
             });
             self.log('Added Event definition: ' + name);
           }).done();
         };

         Simulator.prototype.onAddField = function( def ) {
           var self = this;
           if (!self.canCreateChild( def.id, 'Field' )) {
             alert('The metamodel does not allow Fields under Event ' +
                   'definitions -- is the Field meta type installed?');
             return;
           }
           self.openFormDialog('Add field to ' + def.name, [
             { key: 'name', label: 'Field name', value: '',
               hint: 'available in guards / actions as data.<name>' },
             { key: 'type', label: 'C++ type', value: 'int' },
             { key: 'default', label: 'Default value', value: '',
               optional: true, hint: 'initializer expression, e.g. 0 or "idle"' },
           ], function(values) {
             return self.validateFieldValues( def, values );
           }).then(function(values) {
             if (!values) return; // cancelled
             var name = values.name.trim();
             var type = values.type.trim();
             var dflt = (values.default || '').trim();
             self._backend.transact('Adding Field ' + name, function () {
               var newId = self._backend.createChild(def.id, 'Field');
               self._backend.setAttribute(newId, 'name', name);
               self._backend.setAttribute(newId, 'Type', type);
               if (dflt) {
                 self._backend.setAttribute(newId, 'Default', dflt);
               }
             });
             self.log('Added Field ' + def.name + '.' + name + ' : ' + type);
           }).done();
         };

         Simulator.prototype.onEditField = function( def, field ) {
           var self = this;
           self.openFormDialog('Edit ' + def.name + '.' + field.name, [
             { key: 'name', label: 'Field name', value: field.name },
             { key: 'type', label: 'C++ type', value: field.type },
             { key: 'default', label: 'Default value', value: field.default,
               optional: true },
           ], function(values) {
             return self.validateFieldValues( def, values, field.id );
           }).then(function(values) {
             if (!values) return; // cancelled
             var name = values.name.trim();
             var type = values.type.trim();
             var dflt = (values.default || '').trim();
             if (name === field.name && type === field.type &&
                 dflt === field.default) {
               return; // nothing changed: no transaction, no log noise
             }
             self._backend.transact('Updating Field ' + name, function () {
               if (name !== field.name) {
                 self._backend.setAttribute(field.id, 'name', name);
               }
               if (type !== field.type) {
                 self._backend.setAttribute(field.id, 'Type', type);
               }
               if (dflt !== field.default) {
                 self._backend.setAttribute(field.id, 'Default', dflt);
               }
             });
             self.log('Updated Field ' + def.name + '.' + name);
           }).done();
         };

         /**
          * Drop all simulation state from the current model -- called
          * when the widget's model is cleared / replaced (e.g. a new
          * HFSM is loaded into the panel) so no stale events, states,
          * variables, or logs survive the switch. The node table
          * itself is shared with the widget and cleared there.
          */
         Simulator.prototype.reset = function() {
           var self = this;
           self._activeState = null;
           self._historyStates = {};
           // invalidate any in-flight guard prompt and dismiss its
           // dialog: resuming it would dereference stale node ids
           self._simEpoch++;
           if (self._activeChoice) {
             try { self._activeChoice.dismiss(); } catch (e) { /* gone */ }
             self._activeChoice = null;
           }
           if (self._activeDialog) {
             try { self._activeDialog.dismiss(); } catch (e) { /* gone */ }
             self._activeDialog = null;
           }
           self._variableValues = null;
           self._machineVariables = Object.create(null);
           self._stateVariables = Object.create(null);
           self._opaqueShadows = Object.create(null);
           self._eventFieldValues = null;
           self._currentEventName = null;
           self.hideStateInfo();
           self.clearLogs();
           if (self._stateChangedCallback) {
             self._stateChangedCallback( null );
           }
           // re-render the panels (empty until the new model's nodes
           // arrive; each addNode triggers update())
           self.updateEventButtons();
           self.updateVariablesPanel();
           self.updateEventDefsPanel();
         };

         Simulator.prototype.update = function() {
           var self = this;
           self.updateEventButtons();
           self.updateVariablesPanel();
           self.updateEventDefsPanel();
           self.updateActiveState();
           if (self._activeState) {
            self._stateChangedCallback( self._activeState.id );
           } else {
             self._stateChangedCallback( null );
           }
         };

         Simulator.prototype.onStateChanged = function(stateChangedCallback) {
           var self = this;
           // call func when state is changed; func should take an
           // argument that is the gmeId of the current active
           // state
           self._stateChangedCallback = stateChangedCallback;
         };

         Simulator.prototype.onAnimateElement = function(animateElementCallback) {
           var self = this;
           // call func when state is changed; func should take an
           // argument that is the gmeId of the current active
           // state
           self._animateElementCallback = animateElementCallback;
         };

         Simulator.prototype.onShowTransitions = function( showTransitionsCallback ) {
           var self = this;
           self._showTransitionsCallback = showTransitionsCallback;
         };

         Simulator.prototype.setActiveState = function( gmeId ) {
           var self = this;
           self.getInitialState( gmeId, true )
             .then(function(s) {
               self.handleNextState( s );
               self.update();
             });
         };

         /* * * * * *      Simulation Functions     * * * * * * * */

         Simulator.prototype.initActiveState = function( ) {
           var self = this;
           self._historyStates = {};
           // restart resets the simulated variable / payload values
           // to their declared initializers
           self._variableValues = null;
           self._eventFieldValues = null;
           self._currentEventName = null;
           self.updateVariablesPanel();
           self.updateEventDefsPanel();
           return self.getInitialState( self.getTopLevelId(), true )
             .then(function(s) {
               self._activeState = s;
               // display info
               if (self._activeState) {
                 self.hideStateInfo();
                 self.displayStateInfo( self._activeState.id );
                 if (self._stateChangedCallback) {
                   self._stateChangedCallback( self._activeState.id );
                 }
               }
             });
         };

         Simulator.prototype.updateActiveState = function( ) {
           var self = this;
           if (self._activeState == null ||
               self.nodes[ self._activeState.id ] == undefined) {
             return self.initActiveState();
           }
           else {
             var activeId = self._activeState.id;
             return self.getInitialState( activeId, true )
               .then(function(s) {
                 self._activeState = s;
               });
           }
         };

         Simulator.prototype.clearActiveState = function( ) {
           var self = this;
           self._activeState = null;
           if (self._stateChangedCallback) {
             self._stateChangedCallback( null );
           }
         };

         Simulator.prototype.getActiveStateId = function( ) {
           var self = this;
           return self._activeState.id;
         };

         Simulator.prototype.updateHistory = function( childId, deepId ) {
           var self = this;
           // recurse from stateId to the top, updating shallow
           // and deep history states along the way
           //
           // uses the passed state ID to set as a parent
           if (deepId == undefined)
            deepId = childId;
           var parentId = self.nodes[ childId ].parentId;
           var parent = self.nodes[ parentId ];
           if (parent && parent.type == 'State') {
             // update deep
             var deepHistoryIds = parent.childrenIds.filter(function(cid) {
               return self.nodes[ cid ].type == 'Deep History Pseudostate';
             });
             if (deepHistoryIds.length) {
               self._historyStates [ deepHistoryIds[0] ] = deepId;
             }
             // update shallow
             var shallowHistoryIds = parent.childrenIds.filter(function(cid) {
               return self.nodes[ cid ].type == 'Shallow History Pseudostate';
             });
             if (shallowHistoryIds.length) {
               self._historyStates [ shallowHistoryIds[0] ] = childId;
             }

             self.updateHistory( parent.id, deepId );
           }
         };

         Simulator.prototype.handleShallowHistory = function( stateId ) {
           var self = this;
           // set the active state to the state stored in the
           // history state.
           var historyStateId = self._historyStates[ stateId ];
           if (historyStateId == undefined) {
             // set to parent if we haven't been here before
             var msg = `No History set - initializing ${stateId}`;
             self.log(msg);
             historyStateId = self.nodes[ stateId ].parentId;
           }
           var msg = `Following Shallow History for ${stateId} to ${historyStateId}`;
           self.log(msg);
           return self.getInitialState( historyStateId, true );
         };

         Simulator.prototype.handleDeepHistory = function( stateId ) {
           var self = this;
           var deferred = Q.defer();
           var histState = null;
           // set the active state to the state stored in the
           // history state.
           var historyStateId = self._historyStates[ stateId ];
           if (historyStateId == undefined) {
             // set to parent if we havent' been here before
             var msg = `No Deep History set - initializing state ${stateId}`;
             self.log(msg);
             historyStateId = self.nodes[ stateId ].parentId;
             self.getInitialState( historyStateId, true )
               .then(function(s) {
                 deferred.resolve(s);
               });
           }
           else {
             // we've been here, get the state it pointed to
             histState = self.nodes[ historyStateId ];
             if (histState == undefined ) {
               // State stored in history must have been moved / deleted
               alert('History state no longer valid, reinitailizing.');
               self.getInitialState( self.getTopLevelId(), true )
                 .then(function(s) {
                   deferred.resolve(s);
                 });
             }
             else {
               var msg = `Following Deep History for ${stateId} to ${histState.id}`;
               self.log(msg);
               deferred.resolve( histState );
             }
           }
           return deferred.promise.then(function(s) {
             return s;
           });
         };

         Simulator.prototype.getChoices = function( transitionIds ) {
           var self = this;
           var choiceToTransitionId = {};
           transitionIds.map(function(tid) {
             var choice = self.nodes[ tid ].Guard;
             choiceToTransitionId[ choice ] = tid;
           });
           return choiceToTransitionId;
         };

         Simulator.prototype.selectGuard = function( transitionIds, title ) {
           var self = this;
           if (!transitionIds.length) {
             return new Q.Promise(function(resolve, reject) { resolve(); });
           }

           // now check transitions with guard
           var groupedTIDs = _.groupBy(transitionIds, function(tid) {
             var e = self.nodes[ tid ];
             return e.Guard;
           });
           for (var g in groupedTIDs) {
             var tidArray = groupedTIDs[ g ];
             if (tidArray && tidArray.length > 1) {
               // more than one transition has the same guard!
               alert('WARNING:\n'+
                     'More than one transition has the same guard!\n'+
                     'NOT TRANSITIONING!');
               return new Q.Promise(function(resolve, reject) { resolve(); });
             }
           }

           // now get choice
           var choiceToEdgeId = self.getChoices( transitionIds );
           // annotate the dialog with the current values of the
           // variables the guards reference (scope-aware), so the
           // user decides informed by the simulated machine state
           title = (title || '') + self.getGuardContext( transitionIds );
           var epoch = self._simEpoch;
           var dialog = new Choice();
           self._activeChoice = dialog;
           dialog.initialize( Object.keys(choiceToEdgeId), title );
           dialog.show();
           return dialog.waitForChoice()
             .then(function(choice) {
               // only clear our own dialog: a dismissed old
               // dialog resolves asynchronously, and a NEWER
               // dialog may already be open and tracked --
               // clearing unconditionally would leave the next
               // reset unable to dismiss it
               if (self._activeChoice === dialog) {
                 self._activeChoice = null;
               }
               // the model was switched while this dialog was open:
               // its transition ids are stale, resolve to nothing
               if (epoch !== self._simEpoch) {
                 return { choice: undefined, transitionId: undefined };
               }
               // choice will be undefined if they press the `None`
               // button, but will be an empty string if there is a
               // choice of no guard - we will force both of those to
               // be the same
               if (choice === undefined) {
                 // the user pressed the `None` button
                 const choices = Object.keys(choiceToEdgeId);
                 if (choices.indexOf("") != -1) {
                   // there was an empty transition with no guard, and
                   // the user pressed the None button, so we will
                   // make choice be ""
                   choice = "";
                   self.log(`User selected 'None' when evaluating transition guards which had a default (unguarded) transition, taking the default transition!`);
                 }
               }
               var retObj = {
                 choice: choice,
                 transitionId: choiceToEdgeId[ choice ]
               };
               return new Q.Promise(function(resolve, reject) { resolve(retObj); });
             })
         };

         Simulator.prototype.handleChoice = function( stateId, callback ) {
           var self = this;
           // find the transitions out of the choice state and
           // prompt the user for which guard condition should
           // evaluate to true.
           var edgeIds = self.getEdgesFromNode( stateId );
           // check here to make sure that there exists at least one
           // default (unguarded) transition from the choice
           // psuedostate
           const choices = Object.keys(self.getChoices( edgeIds ));
           if (choices.indexOf("") == -1 ) {
             // there is no default / unguarded transition, warn the user!
             self.log(`WARNING: choice psuedostate ${stateId} has no default (unguarded) exit transition. This will result in an incorrectly constructed HFSM if not fixed!`);
           }
           var title = 'Choice Pseudostate '+stateId+':';
           return self.selectGuard( edgeIds, title )
             .then(function(selectedEdge) {
               var nextState = null;
               if (selectedEdge && selectedEdge.transitionId) {
                 var msg = `${title} selected choice [ ${selectedEdge.choice} ] on transition ${selectedEdge.transitionId}`;
                 self.log(msg);
                 self.getNextState( selectedEdge.transitionId )
                   .then(function(s) {
                     callback(s);
                   });
               }
               else {
                 callback( null );
               }
             });
         };

         Simulator.prototype.handleEnd = function( stateId ) {
           var self = this;
           // don't transition unless we get a valid end state
           var nextState = self._activeState;
           // see if any of the parent states have an external
           // transition which does not have an event or a guard;
           // make sure there's only one of them and then take it.
           //
           // If that condition is not satisfied, stay in the
           // current state

           // get all external transitions for this event
           var endState = self.nodes[ stateId ];
           var parentState = self.nodes [ endState.parentId ];
           var deferred = Q.defer();
           while (parentState) {
             // get all transitions that don't have an event
             var transitionIds = self.getEdgesFromNode( parentState.id ).filter(function(eId) {
               var edge = self.nodes[ eId ];
               return edge.Event == null || !edge.Event.trim();
             }).sort( self.transitionSort.bind(self) );
             // now check them
             var guardless = transitionIds.filter(function(eid) {
               var edge = self.nodes[ eid ];
               return edge.Guard == null || !edge.Guard.trim();
             });
             if (guardless.length == 1) {
               var msg = 'END TRANSITION on '+
                   stateId + ' through transition ' + guardless[0];
               self.log(msg);
               return self.getNextState( guardless[0] );
               break;
             }
             else if (guardless.length > 1 || (guardless.length != transitionIds.length)) {
               alert('WARNING:\n'+
                     'Cannot have more than one END TRANSITION!\n'+
                     'NOT TRANSITIONING!');
               deferred.resolve(self._activeState);
               break;
             }
             else if (transitionIds.length) {
               // we have event-less transitions but they have guards this is illegal!
               alert('WARNING:\n'+
                     'END TRANSITIONS cannot have guards!\n'+
                     'NOT TRANSITIONING!');
               deferred.resolve(self._activeState);
               break;
             }
             else if ( rootTypes.indexOf( parentState.type ) > -1 ) {
               nextState = endState;
               // THIS IS THE END OF THE STATE MACHINE
               self.log('END OF HFSM');
               deferred.resolve(nextState);
               break;
             }
             else if (transitionIds.length == 0) {
               alert('WARNING:\n'+
                     'END states must be followed by END TRANSITIONS in non-root states!\n'+
                     'NOT TRANSITIONING!');
               deferred.resolve(self._activeState);
               break;
             }
             parentState = self.nodes [ parentState.parentId ];
           }
           return deferred.promise.then(function(s) { return s; });
         };

         Simulator.prototype.transitionSort = function(aId, bId) {
           var self = this;
           var a = self.nodes[aId].Guard;
           var b = self.nodes[bId].Guard;
           if (!a && b) return -1;
           if (a && !b) return 1;
           return 0;
         }

         Simulator.prototype.resolveTransitions = function( eventName, transitionIds, stateId, nextStateCallback ) {
           var self = this;
           // get all transitions with no guard
           var guardless = transitionIds.filter(function(eid) {
             var edge = self.nodes[ eid ];
             return edge.Guard == null || !edge.Guard.trim();
           });
           // now check
           if (guardless.length == 1 && transitionIds.length == 1) {
             var trans = self.nodes[ guardless[0] ];
             var msg = `Event: "${eventName}" on ${trans.type} : ${trans.id}`;
             self.log(msg);
             self.getNextState( trans.id )
               .then(function(s) {
                 nextStateCallback( s );
               });
             //nextStateCallback( self.getNextState( trans.id ) );
           }
           else if (guardless.length > 1) {
             alert('WARNING:\nMore than one transition has same Event and no guard!\nNOT TRANSITIONING!');
             nextStateCallback( null );
           }
           else if (transitionIds.length) {
             // now get choice from user
             var state = self.nodes[ stateId ];
             var title = '<b>'+state.name+'</b> transition\'s guard for <b>'+eventName+'</b>:';
             self.selectGuard( transitionIds, title )
               .then(function(selection) {
                 if (selection && selection.transitionId &&
                     !self.nodes[ selection.transitionId ]) {
                   // stale selection from a dismissed / superseded
                   // prompt: the transition no longer exists
                   nextStateCallback( null );
                   return;
                 }
                 if (selection && selection.transitionId) {
                   var trans = self.nodes[ selection.transitionId ];
                   var msg = `${eventName}::${trans.type}: [ ${selection.choice} ] was TRUE on ${trans.id}`;
                   self.log(msg);
                   self.getNextState( trans.id )
                     .then(function(s) {
                       nextStateCallback(s);
                     });
                   //nextStateCallback( self.getNextState( trans.id ) );
                 } else {
                   nextStateCallback( null );
                 }
               });
           }
           else {
             nextStateCallback( null );
           }
         };

         Simulator.prototype.handleNextState = function ( state ) {
           var self = this;
           if ( state ) {
             self._animateElementCallback( state.id );
             // update history states here for all states we're leaving
             self.updateHistory( self._activeState.id );
             if ( state.type == 'Choice Pseudostate' ) {
               self.handleChoice( state.id, self.handleNextState.bind(self) );
             }
             else if (state.type == 'End State' && state.parentId != self.getTopLevelId()) {
               self.handleEnd( state.id )
                 .then(function(s) {
                   self.handleNextState( s );
                 });
             }
             else if (state.type == 'Shallow History Pseudostate') {
               self.handleShallowHistory( state.id )
                 .then(function(s) {
                   self.handleNextState( s );
                 });
             }
             else if (state.type == 'Deep History Pseudostate') {
               state = self.handleDeepHistory( state.id )
                 .then(function(s) {
                   self.handleNextState( s );
                 });
             }
             else {
               // now transition!
               if ( state.id != self._activeState.id ) {
                 var msg = `STATE TRANSITION: ${self._activeState.name}->${state.name}`;
                 self.log( msg );
                 if (state.type == 'End State') {
                   // THIS IS THE TOP LEVEL END STATE!
                   self.log('HFSM HAS TERMINATED!');
                 }
               }
               // update active state!
               self._activeState = state;
               // update all rendering!
               self.hideStateInfo();
               self.displayStateInfo( self._activeState.id );
               if (self._stateChangedCallback) {
                 self._stateChangedCallback( self._activeState.id );
               }
             }
           }
         };

         Simulator.prototype.handleEvent = function( eventName, stateId ) {
           var self = this;
           // remember which event is being dispatched so guard
           // prompts (including for downstream choice pseudostates)
           // can show its simulated payload values
           self._currentEventName = eventName;
           var deferred = Q.defer();
           if (stateId) {
             var internalTransitionIds = self.getInternalTransitionIds( eventName, stateId );
             var externalTransitionIds = self.getExternalTransitionIds( eventName, stateId );
             // handle internal transitions
             self.resolveTransitions( eventName, internalTransitionIds, stateId, function(nextState) {
               if (nextState) {
                 deferred.resolve();
                 return;
               }
               // handle external transitions
               self.resolveTransitions( eventName, externalTransitionIds, stateId, function(nextState) {
                 if (nextState) {
                   deferred.resolve( self.handleNextState( nextState ) );
                   return;
                 }
                 // bubble up to see if parent handles event
                 var parentState = self.getParentState( stateId );
                 if (parentState) {
                   deferred.resolve( self.handleEvent( eventName, parentState.id ) );
                 } else {
                   deferred.resolve();
                 }
               });
             });
           }
           return deferred.promise;
         };

         Simulator.prototype.getInternalTransitionIds = function( eventName, gmeId ) {
           var self = this;
           var node = self.nodes[ gmeId ];
           var transIds = [];
           if (node)
            transIds = node.childrenIds.filter(function(cid) {
              var child = self.nodes[ cid ];
              return child.type == 'Internal Transition' && child.Event == eventName && child.Enabled;
            }).sort( self.transitionSort.bind(self) );
           return transIds;
         };

         Simulator.prototype.getExternalTransitionIds = function( eventName, gmeId ) {
           var self = this;
           return self.getEdgesFromNode( gmeId ).filter(function(eid) {
             return self.nodes[ eid ].Event == eventName;
           }).sort( self.transitionSort.bind(self) );
         };

         Simulator.prototype.getEdgesFromNode = function( gmeId ) {
           var self = this;
           var nodeEdges = Object.keys(self.nodes).map(function (k) {
             var node = self.nodes[k];
             if (node.isConnection && node.src == gmeId && node.Enabled)
             return k;
           });
           return nodeEdges.filter(function (o) { return o; });
         };

         Simulator.prototype.getEdgesToNode = function( gmeId ) {
           var self = this;
           var nodeEdges = Object.keys(self.nodes).map(function (k) {
             var node = self.nodes[k];
             if (node.isConnection && node.dst == gmeId && node.Enabled)
             return k;
           });
           return nodeEdges.filter(function (o) { return o; });
         };

         Simulator.prototype.getTopLevelId = function( ) {
           var self = this;
           var top = Object.keys(self.nodes).filter(function(k) {
             return rootTypes.indexOf( self.nodes[k].type ) > -1;
           });
           return top.length == 1 ? top[0] : null;
         };

         Simulator.prototype.getParentState = function( gmeId ) {
           var self = this;
           var parentState = null;
           var node = self.nodes[ gmeId ];
           if (node) {
             var parentId = node.parentId;
             var parentNode = self.nodes[ parentId ];
             if (parentNode && parentNode.type == 'State') {
               parentState = parentNode;
             }
           }
           return parentState;
         };

         Simulator.prototype.getInitialState = function( stateId, animate ) {
           var self = this;
           var state = self.nodes[ stateId ];
           var deferred = Q.defer();
           var initState = state;
           if (state) {
             var init = state.childrenIds.filter(function (cid) {
               var child = self.nodes[ cid ];
               if (child) {
                 return child.type == 'Initial';
               }
             });
             // check to make sure that if we have children, we have
             // an initial state - but we _DO ALLOW_ Internal
             // Transitions
             var hasChildren = state.childrenIds.filter(function (cid) {
               var child = self.nodes[ cid ];
               if (child) {
                 return child.type != 'Internal Transition' && child.type != 'Documentation';
               }
             }).length > 0;
             if (hasChildren && init.length != 1) {
               self.log(`WARNING: '${state.name}' (${stateId}) has child states, but no initial state defined!`);
             } else if (!hasChildren && init.length != 0) {
               self.log(`WARNING: '${state.name}' (${stateId}) has initial state, but no substates!`);
	     }
             if (init.length == 1) {
               // this means we have a child of type Initial State -
               // which means we should also have a transition from
               // this child to another child of ours
               var initId = init[0];
               var initEdgeIds = self.getEdgesFromNode( initId );
               if (initEdgeIds.length == 1) {
                 var edge = self.nodes[ initEdgeIds[0] ];
                 if (animate) {
                   self._animateElementCallback( initId );
                   self._animateElementCallback( edge.id );
                 }
                 var childInitId = edge.dst;
                 var msg = `Initial transition ${edge.id} to ${childInitId}`;
                 self.log(msg);
                 // make sure to set the initial state of whatever
                 // child state the initial state points to a real state
                 deferred.resolve( self.getInitialState( childInitId, animate ) );
               } else {
                 // Initial State not connected through transition to child state!
                 self.log(`WARNING: Initial State of '${state.name}' (${stateId}) not connected through transition to a child state!`);
                 deferred.resolve(initState);
               }
             }
             else if (state.type == 'Choice Pseudostate') {
               // if the initial state points to a child pseudostate,
               // we'll come here through the recursion
               self.handleChoice( state.id, function(s) {
                 if (s === null || s === undefined) {
                   // the choice state did not go to an actual state!
                   self.log(`WARNING: Initial choice pseudostate of ${state.parentId} did not resolve to an initial state!`);
                 }
                 deferred.resolve(s);
               });
             }
             else if (state.type == 'End State') {
               // This means that the initial state is wired to an end state!
               self.handleEnd(state.id);
             }
             else {
               // we'll come here if 1) we have no children and 2) we
               // are connected to the initial state via a transition
               deferred.resolve(initState);
             }
           }
           else {
             // we should only come here if we cannot get the state
             // from the stateId - e.g. while the page and the model
             // are loading - simply resolve and it will figure itself
             // out eventually
             deferred.resolve(initState);
           }
           return deferred.promise.then(function(s) {
             return s;
           });
         };

         Simulator.prototype.getNextState = function( transId ) {
           var self = this;
           var nextState = null;
           var deferred = Q.defer();
           var trans = self.nodes[ transId ];
           if (trans) {
             self._animateElementCallback( transId );
             if (trans.type == 'External Transition' || trans.type == 'Local Transition') {
               var dstId = trans.dst;
               if (dstId) { // exte
                 self.getInitialState( dstId, true )
                   .then(function(s) {
                     deferred.resolve(s);
                   });
               }
             }
             else if (trans.type == 'Internal Transition') {
               deferred.resolve(self.nodes[ trans.parentId ]);
             }
           }
           return deferred.promise.then(function(s) { return s; });
         };

         /* * * * * * State Info Display Functions  * * * * * * * */

         var entityMap = {
           '&': '&amp;',
           '<': '&lt;',
           '>': '&gt;',
           '"': '&quot;',
           "'": '&#39;',
           '/': '&#x2F;',
           '`': '&#x60;',
           '=': '&#x3D;'
         };

         function escapeHtml (string) {
           return String(string).replace(/[&<>"'`=\/]/g, function (s) {
             return entityMap[s];
           });
         }

         function htmlToElement(html) {
           var template = document.createElement('template');
           template.innerHTML = html;
           return template.content.firstChild;
         }

         // takes a plain DESCRIPTOR (attributes are flattened onto it)
         // rather than a live model node
         function getCode(desc, codeAttr, doHighlight, markIncomplete) {
           var originalCode = desc[ codeAttr ],
               code = escapeHtml(originalCode);
           var el = '';
           if (doHighlight) {
             code = '<code class="cpp">'+code+'</code>';
             code = htmlToElement(code);
             hljs.highlightBlock(code);
             /*
               $(code).css('text-overflow', 'ellipsis');
               $(code).css('white-space', 'nowrap');
               $(code).css('overflow', 'hidden');
             */
             $(code).css('white-space', 'pre');
             $(code).css('overflow', 'auto');
             if (originalCode) {
             }
             else if (markIncomplete) {
               $(code).css('background-color','rgba(255,0,0,0.5)');
             }
             el = code.outerHTML;
           }
           else {
             el = code;
           }
           return el;
         }

         function addCodeToList(el, id, event, guard, action) {
           var txt = '<li ';
           if (id)
            txt += 'id="'+id+'" ';
           txt += 'class="internal-transition">'+event;
           if (guard)
            txt += ' [<font color="gray">'+guard+'</font>]';
           txt += ' / ';
           if (action)
            txt += action;
           txt += '</li>';
           el.append(txt);
         }

         Simulator.prototype.onClickInternalTransition = function( e ) {
           var self = this;
           var el = e.target;
           var classList = $(el).attr('class');
           if (classList) {
             classList = classList.split(/\s+/g);
             while (classList.indexOf( 'internal-transition' ) == -1) {
               // we clicked on the code
               el = $(el).parent();
               classList = $(el).attr('class').split(/\s+/g);
             }
             var id = $(el).attr('id');
             if (id) {
               self._backend.setActiveSelection([id], self);
               e.stopPropagation();
               e.preventDefault();
             }
           }
         };

         Simulator.prototype.onClickStateInfo = function( e ) {
           var self = this;
           var el = e.target;
           var classList = $(el).attr('class');
           if( classList ) {
             classList = classList.split(/\s+/g);
             while (classList.indexOf( 'uml-state-machine' ) == -1) {
               el = $(el).parent();
               classList = $(el).attr('class').split(/\s+/g);
             }
             var id = $(el).attr('id');
             if (id) {
               self._backend.setActiveSelection([id], self);
             }
           }
         };

         Simulator.prototype.renderState = function( gmeId ) {
           var self = this;
           // descriptors already carry the resolved meta type name and
           // every attribute, so none of this needs the model store
           var node = self.nodes[ gmeId ];
           if (!node) return '';
           var internalTransitions = [];
           (node.childrenIds || []).map(function(cid) {
             var child = self.nodes[ cid ];
             if (child && child.type == 'Internal Transition' && child.Enabled) {
               internalTransitions.push({
                 id: cid,
                 Event: getCode(child, 'Event', false),
                 Guard: getCode(child, 'Guard', false),
                 Action: getCode(child, 'Action', true, !node.isComplete),
               });
             }
           });
           var stateObj = {
             name: node.name,
             id: gmeId
           };
           var text = htmlToElement( mustache.render( stateTemplate, stateObj ) );
           var el = $(text).find('.internal-transitions');
           addCodeToList( el, null, 'Entry', null, getCode(node, 'Entry', true, !node.isComplete) );
           addCodeToList( el, null, 'Exit', null, getCode(node, 'Exit', true, !node.isComplete) );
           addCodeToList( el, null, 'Tick', null, getCode(node, 'Tick', true, !node.isComplete) );
           internalTransitions.sort(function(a,b) { return a.Event.localeCompare(b.Event); }).map(function(i) {
             addCodeToList( el, i.id, i.Event, i.Guard, i.Action );
           });
           return text.outerHTML;
         };

         Simulator.prototype.renderStateMachine = function( gmeId ) {
           var self = this;
           var node = self.nodes[ gmeId ];
           if (!node) return '';
           var stateObj = {
             name: node.name,
             id: gmeId
           };
           var text = htmlToElement( mustache.render( stateTemplate, stateObj ) );
           var el = $(text).find('.internal-transitions');
           addCodeToList( el, null, 'Initialization', null, getCode(node, 'Initialization', true, false));
           return text.outerHTML;
         };

         Simulator.prototype.displayStateInfo = function ( gmeId ) {
           var self = this;
           //self.hideStateInfo();
           var node = self.nodes[ gmeId ];
           if (node) {
             var nodeType = node.type;
             if (nodeType == 'State') {
               if ( $(self._stateInfo).find('.uml-state-machine').length ) {
                 $(self._stateInfo).append(parentTempl);
               }
               $(self._stateInfo).append( self.renderState( gmeId ) );
               $(self._stateInfo).find('.internal-transition')
                 .on('click', self.onClickInternalTransition.bind(self) );
               $(self._stateInfo).find('.uml-state-machine')
                 .on('click', self.onClickStateInfo.bind(self) );
               if (node.parentId) {
                 self.displayStateInfo( node.parentId );
               }
             }
             else if (rootTypes.indexOf(nodeType) > -1) {
               if ( $(self._stateInfo).find('.uml-state-machine').length ) {
                 $(self._stateInfo).append(parentTempl);
               }
               $(self._stateInfo).append( self.renderStateMachine( gmeId ) );
               $(self._stateInfo).find('.uml-state-machine')
                 .on('click', self.onClickStateInfo.bind(self) );
             }
           }
         };

         Simulator.prototype.hideStateInfo = function( ) {
           var self = this;
           $(self._stateInfo).empty();
         };

         Simulator.prototype.updateStateInfo = function() {
           var self = this;
           var el = $(self._stateInfo).find('.uml-state-machine');
           if (el) {
             var id = el.attr('id');
             if (id) {
               self.hideStateInfo();
               self.displayStateInfo( el.attr('id') );
             }
           }
         };

         /* * * * * * * * Event Button Functions    * * * * * * * */

         // Set-based: a plain-object accumulator would drop event
         // names inherited from Object.prototype ('constructor', ...)
         function uniq(a) {
           var seen = new Set();
           return a.filter(function(item) {
             if (seen.has(item)) {
               return false;
             }
             seen.add(item);
             return true;
           });
         }

         Simulator.prototype.getEventNames = function () {
           var self = this;
           var eventNames = Object.keys(self.nodes).map(function(k) {
             var desc = self.nodes[k];
             if (desc.isConnection && desc.Event && desc.Enabled) {
               return desc.Event;
             }
             else if (desc.type == 'Internal Transition' && desc.Enabled) {
               return desc.Event;
             }
             else if (desc.type == 'Event') {
               // Event (payload) definition nodes participate even if
               // no transition uses them yet (event-library
               // semantics, matching the generator)
               return desc.name;
             }
           });
           eventNames = uniq(eventNames);
           return eventNames;
         };

         Simulator.prototype.getTransitionIDsWithEvent = function (eventName) {
           var self = this;
           var transitionIDs = [];
           if (eventName) {
             transitionIDs = Object.keys(self.nodes).filter(function(id) {
               var t = self.nodes[id];
               return t.Event == eventName && t.Enabled;
             });
           }
           return transitionIDs;
         };

         var machineEvents = ['HFSM-Restart','HFSM-Clear','HFSM-Tick'];
         var machineEventTempl = [
           '<div>',
           '<div id="{{eventName}}" class="row btn btn-default btn-primary btn-block eventButton">',
           '<span class="eventButtonText">{{eventName}}</span>',
           '</div>',
           '</div>',
         ].join('\n');

         Simulator.prototype.createEventButtons = function () {
           var self = this;
           self._eventButtons.empty();

           machineEvents.map(function(eventName) {
             var buttonHtml = mustache.render(machineEventTempl, { eventName: eventName });
             self._eventButtons.append( buttonHtml );
             var eventButton = $(self._eventButtons).find('#'+eventName).first();
             eventButton.on('click', self.onEventButtonClick.bind(self));
           });

           var eventNames = self.getEventNames().sort();
           eventNames.map(function (eventName) {
             if (eventName && eventName.trim()) {
                 // warn if the event name is not valid, using the
                 // same rule the generator enforces (accepts
                 // one-character names, rejects keywords / reserved)
                 if (!checkModel.isValidString(eventName)) {
                     alert('WARNING:\n'+
                           'Event name "'+eventName+'" is not a valid C++ identifier!\n'+
                           'Please use only alphanumeric characters and underscores!\n'+
                           'Simulator may not be able to handle this event and the event button (left panel) may not work!'
                          );
                 }

               var buttonHtml = mustache.render(eventTempl, { eventName: eventName });
               self._eventButtons.append( buttonHtml );
               var eventButton = $(self._eventButtons).find('#'+eventName).first();
               eventButton.on('click', self.onEventButtonClick.bind(self));
               var showEventButton = $(self._eventButtons).find('#show_'+eventName).first();
               showEventButton.on('click', self.onShowEventButtonClick.bind(self));
             }
           });
         };

         Simulator.prototype.updateEventButtons = function () {
           var self = this;
           self.createEventButtons();
           self.updateStateInfo();
         };

         Simulator.prototype.getEventButtonText = function ( btnEl ) {
           return $(btnEl).text() || $(btnEl).find('.eventButtonText').first().text();
         };

         Simulator.prototype.onEventButtonClick = function (e) {
           var self = this;
           var eventName = self.getEventButtonText( e.target ).trim();
           if (eventName == 'HFSM-Restart') {
             self.log('\n---- HFSM RESTARTING ----');
             self.initActiveState();
           }
           else if (eventName == 'HFSM-Clear') {
             self.clearLogs();
             self.clearActiveState();
           }
           else if (eventName == 'HFSM-Tick') {
             var msg = `Tick down to leaf node ${self._activeState.name} : ${self._activeState.id}`;
             self.log(msg);
             self.updateActiveState();
           }
           else {
             self.updateActiveState();
             if (!self._activeState) {
               return;
             }
             // events carrying a payload can be spawned with per-spawn
             // values (pre-filled from the Events panel) when the
             // "prompt for payload" toggle is on; otherwise the panel
             // values are used as-is
             var def = self.getEventDefinition( eventName );
             if (self._promptForPayload && def && def.fields.length) {
               self.promptForPayload( def ).then(function(accepted) {
                 if (!accepted) return; // cancelled: do not spawn
                 self.updateActiveState();
                 if (self._activeState) {
                   self.handleEvent( eventName, self._activeState.id );
                 }
               }).done();
             } else {
               self.handleEvent( eventName, self._activeState.id );
             }
           }
         };

         /**
          * Ask for this spawn's payload values, pre-filled from the
          * Events panel. Accepted values are written back to the panel
          * (so they persist as the new defaults for the next spawn,
          * matching how the panel already behaves).
          *
          * @return {Promise<boolean>} false when cancelled
          */
         Simulator.prototype.promptForPayload = function( def ) {
           var self = this;
           var stored = (self._eventFieldValues || {})[def.name] || {};
           var fields = def.fields.map(function(f) {
             var v = Object.prototype.hasOwnProperty.call(stored, f.name) ?
                 stored[f.name] : f.default;
             return {
               key: f.name,
               label: f.name + ' : ' + f.type,
               value: v,
               optional: true,
               hint: f.description || undefined,
             };
           });
           return self.openFormDialog('Spawn ' + def.name, fields)
             .then(function(values) {
               if (!values) return false;
               if (!self._eventFieldValues) {
                 self._eventFieldValues = Object.create(null);
               }
               if (!self._eventFieldValues[def.name]) {
                 self._eventFieldValues[def.name] = Object.create(null);
               }
               Object.keys(values).forEach(function(k) {
                 self._eventFieldValues[def.name][k] = values[k];
               });
               self.updateEventDefsPanel();
               var shown = def.fields.map(function(f) {
                 return f.name + '=' + values[f.name];
               }).join(', ');
               self.log('PAYLOAD: ' + def.name + ' { ' + shown + ' }');
               return true;
             });
         };

         Simulator.prototype.onShowEventButtonClick = function (e) {
           var self = this;
           var transitionIDs = [];
           var eventName = self.getEventButtonText( e.target ).trim();
           if (machineEvents.indexOf(eventName) == -1) {
             transitionIDs = self.getTransitionIDsWithEvent( eventName );
           }
           if (self._showTransitionsCallback)
            self._showTransitionsCallback( transitionIDs );
         };

         return Simulator;
       });
