/**
 * @author William Emfinger  https://github.com/finger563
 */

define(['bower/mustache.js/mustache.min',
        'hfsm/viz/describe',
        'hfsm/checkModel',
        'text!./Dialog.html',
        'text!./Type.html',
        'css!./Dialog.css'],
       function(mustache,
                describe,
                checkModel,
                DialogTemplate,
                TypeTemplate){
           'use strict';
           
           var Dialog;

           var ignoreTypes = ['Documentation']

           const valueMap = {
               'checkbox': function(el) { return el[0].checked; }
           };
           var attrToID = function(attr) {
               return attr.replace(/ /gm, '_');
           };

           // WHICH attributes, in WHAT order, shown as WHICH control:
           // all three come from `describe`, the same answers the
           // inspector renders from. They were decided here
           // separately before, which is how this form went on
           // offering a transition a `name` the generator never emits
           // and putting an Entry block in a one-line input -- the
           // property-grid problem the inspector exists to avoid,
           // still present at the moment a node is created.
           var INPUT_TYPE = { checkbox: 'checkbox', number: 'number' };

           var attrForm = ['<div class="form-group" id="p{{id}}">',
                           '<label class="col-sm-4 control-label" for="{{id}}">{{attr}}</label>',
                           '<div class="col-sm-8 controls">' ,
                           '<input type="{{type}}" id="{{id}}" placeholder="">',
                           '<div class="dialog-field-error" id="e{{id}}"></div>',
                           '</div>',
                           '</div>'].join('\n');

           // code and prose get room to be what they are, rather than
           // a one-line input
           var attrTextForm = ['<div class="form-group" id="p{{id}}">',
                               '<label class="col-sm-4 control-label" for="{{id}}">{{attr}}</label>',
                               '<div class="col-sm-8 controls">' ,
                               '<textarea id="{{id}}" class="dialog-{{kind}}" rows="3"',
                               ' spellcheck="{{spellcheck}}"></textarea>',
                               '<div class="dialog-field-error" id="e{{id}}"></div>',
                               '</div>',
                               '</div>'].join('\n');

           /**
            * Dialog Constructor
            * Insert dialog modal into body and initialize editor with
            * customized options
            */
           Dialog = function () {
               // Get Modal Template node for Editor Dialog and append it to body
               this._dialog = $(DialogTemplate);
               this._dialog.appendTo($(document.body))

               // Get element nodes
               this._el = this._dialog.find('.modal-body').first();

               // forms
               this._attrForm = this._dialog.find('#attrForm').first();
               this._childSelector = this._dialog.find('#childTypeSelector').first();

               // buttons
               this._btnSave = this._dialog.find('.btn-save').first();
               this._btnClose = this._dialog.find('.close').first();
               this._btnCancel = this._dialog.find('.btn-cancel').first();
           };

           /**
            * Initialize Dialog
            * @param  {Object}     desc           Descriptor for the node that will be the parent
            * @param  {Object}     backend        ModelBackend used to read the creatable
            *                                     child types and to create the child
            * @return {void}
            */
           Dialog.prototype.initialize = function ( desc, backend, position) {
               var self = this;
               self.backend = backend;

               // Initialize Modal and append it to main DOM
               this._dialog.modal({ show: false});

               // add children types to selector
               this._childSelector.on('change', this.selectChild.bind(this));
               this._schemas = {};
               backend.getChildTypeSchemas( desc.id ).forEach(function( schema ) {
                   if ( !schema.isConnection &&
                        ignoreTypes.indexOf( schema.name ) == -1 )
                       self._schemas[ schema.name ] = schema;
               });
               var typeNames = Object.keys(this._schemas).sort().reverse();
               typeNames.map(function(t) {
                   $(self._childSelector).append(new Option(t, t));
               });
               $(this._childSelector).val( typeNames[0] );
               this.renderChildForm();

               // Event listener on click for SAVE button
               this._btnSave.on('click', function (event) {
                   // The dialog now stays open until the commit is
                   // confirmed, so without this a second click during
                   // that window starts a second transaction and
                   // creates a duplicate child.
                   if (self._saving) {
                       event.stopPropagation();
                       event.preventDefault();
                       return;
                   }
                   // A name or an Event that is not a C++ identifier
                   // is refused HERE, rather than becoming a node the
                   // inspector then flags: the same rule the
                   // inspector applies, from the same place, at the
                   // one moment where nothing has been created yet.
                   if (!self.validateForm()) {
                       event.stopPropagation();
                       event.preventDefault();
                       return;
                   }

                   self._saving = true;
                   self._btnSave.prop('disabled', true);

                   var attr = self.getAttributesFromForm();
                   var type = self.getSelectedChildType();
                   var msg = 'Creating new child of type ' + type + ' with parent ' + desc.id;

                   // the child and its attributes are one edit: a
                   // half-configured node should never be a state the
                   // user can land on by undoing
                   // captured inside the body so the completion
                   // callback sees it even if a backend settles
                   // synchronously
                   var newChildPath = null;
                   // transact() reports the failure through the
                   // completion callback below and then rethrows;
                   // letting it escape here would also raise WebGME's
                   // global "uncaught exception" banner over a
                   // failure the dialog is already showing
                   try {
                       backend.transact(msg, function () {
                           var childPath = backend.createChild( desc.id, type,
                                                                { position: position } );
                           Object.keys(attr).map(function( attrName ) {
                               var attrVal = attr[attrName];
                               // only write what the form actually changed,
                               // so untouched fields keep inheriting
                               if (attrVal != backend.getAttribute(childPath, attrName)) {
                                   backend.setAttribute( childPath, attrName, attrVal );
                               }
                           });
                           newChildPath = childPath;
                           return childPath;
                       }, function (err) {
                           // The dialog closes only once the store has
                           // ACCEPTED the change. Hiding it as soon as
                           // transact() returned threw away everything the
                           // user typed if the commit was then rejected,
                           // with nothing to retry from.
                           // re-enable either way: on failure so the
                           // user can retry, on success so a reopened
                           // dialog is not stuck disabled
                           self._saving = false;
                           self._btnSave.prop('disabled', false);
                           if (err) {
                               console.error('Could not create child: ', err);
                               self.showError('Could not create the ' + type +
                                              ': ' + (err.message || err));
                               return;
                           }
                           if (newChildPath) {
                               backend.setActiveSelection([newChildPath], self);
                           }
                           self.hide();
                       });
                   } catch (e) {
                       // already reported through the callback above;
                       // make sure Save comes back even if a backend
                       // threw without reporting
                       self._saving = false;
                       self._btnSave.prop('disabled', false);
                   }

                   event.stopPropagation();
                   event.preventDefault();
               });

               // Event listener on click for CLOSE button
               this._btnClose.on('click', function (event) {
                   self.hide();
                   event.stopPropagation();
                   event.preventDefault();
               });

               // Event listener on click for CANCEL button
               this._btnCancel.on('click', function (event) {
                   self.hide();
                   event.stopPropagation();
                   event.preventDefault();
               });

               // Listener on event when dialog is shown
               // Use callback to show editor after Modal window is shown.
               this._dialog.on('shown.bs.modal', function () {
                   // Render text from params into Editor and store it in local storage
               });

               // Listener on event when dialog is hidden
               this._dialog.on('hidden.bs.modal', function () {
                   self._dialog.empty();
                   self._dialog.remove();
               });
           };

           // CHILD RELATED FUNCTIONS

           Dialog.prototype.getSelectedChildType = function () {
               var self = this;
               return $(self._childSelector).val();
           };

           Dialog.prototype.getCurrentSchema = function() {
               var self = this;
               return self._schemas[ self.getSelectedChildType() ];
           };

           Dialog.prototype.selectChild = function (event) {
               var self = this;
               //var childSelect = event.target;
               //var newChildType = childSelect.options[ childSelect.selectedIndex ].textContent;
               self.renderChildForm();
           };

           Dialog.prototype.renderChildForm = function() {
               var self = this;
               self._attrForm.empty();
               self._attrForm.append( self.getForm() );
               // Show what the node would start with. The form used to
               // render empty, so saving without touching a field wrote
               // '' over its default -- a Field left alone lost its
               // 'int' Type, an untouched State its isComplete.
               self.getCurrentAttributes().map(function( a ) {
                   var el = self.fieldFor( a );
                   if (!el.length)
                       return;
                   if (a.defaultValue !== undefined && a.defaultValue !== null) {
                       if (el[0].type === 'checkbox') {
                           el[0].checked = !!a.defaultValue;
                       } else {
                           el.val(a.defaultValue);
                       }
                   }
                   // a message that stays up while the user fixes the
                   // field reads as though the fix had not worked
                   if (describe.IDENTIFIER_ATTRIBUTES.indexOf(a.name) > -1) {
                       el.on('input', function () {
                           self.showFieldProblem( a, self.problem(
                               a, self.normalize( a, el.val() ) ) );
                       });
                   }
               });
           };

           // ATTRIBUTE RELATED FUNCTIONS

           Dialog.prototype.getCurrentAttributes = function () {
               return describe.editableAttributes( this.getCurrentSchema() );
           };

           Dialog.prototype.getForm = function ( ) {
               var self = this;
               var form = '';
               self.getCurrentAttributes().map( function(a) {
                   form += self.renderAttributeForm( a );
               });
               return form;
           };
           
           Dialog.prototype.renderAttributeForm = function ( a ) {
               var kind = describe.fieldKind( a );
               if (kind === 'code' || kind === 'prose') {
                   return mustache.render( attrTextForm, {
                       attr: a.name,
                       id: attrToID(a.name),
                       kind: kind,
                       // C++ is not English, and a red underline under
                       // every identifier is noise
                       spellcheck: String(kind === 'prose')
                   } );
               }
               return mustache.render( attrForm, {
                   attr: a.name,
                   id: attrToID(a.name),
                   type: INPUT_TYPE[kind] || 'text'
               } );
           };

           /**
            * What an identifier attribute is worth once the
            * surrounding space is gone -- what gets VALIDATED has to
            * be what gets STORED, or ' GO ' passes as `GO` and is
            * then written untrimmed.
            */
           Dialog.prototype.normalize = function ( a, value ) {
               if (describe.IDENTIFIER_ATTRIBUTES.indexOf(a.name) === -1)
                   return value;
               if (typeof value !== 'string')
                   return value;
               return value.trim();
           };

           /** the reason this value cannot be stored, or null */
           Dialog.prototype.problem = function ( a, value ) {
               if (describe.IDENTIFIER_ATTRIBUTES.indexOf(a.name) === -1)
                   return null;
               return checkModel.identifierProblem( this.getSelectedChildType(),
                                                    a.name, value );
           };

           /**
            * Check every field, show what is wrong beside it, and put
            * the caret in the first one.
            *
            * @return true when the form may be saved
            */
           Dialog.prototype.validateForm = function () {
               var self = this;
               var first = null;
               self.getCurrentAttributes().map(function( a ) {
                   var el = self.fieldFor( a );
                   if (!el || !el.length)
                       return;
                   var value = self.normalize( a, el.val() );
                   // show the trimmed value, so what was checked is
                   // what is on screen as well as what is written
                   if (value !== el.val())
                       el.val( value );
                   var problem = self.problem( a, value );
                   self.showFieldProblem( a, problem );
                   if (problem && !first)
                       first = el;
               });
               if (first) {
                   first.focus();
                   return false;
               }
               return true;
           };

           Dialog.prototype.fieldFor = function ( a ) {
               return $(this._dialog).find('#' + attrToID(a.name)).first();
           };

           Dialog.prototype.showFieldProblem = function ( a, problem ) {
               var self = this;
               var el = $(self._dialog).find('#e' + attrToID(a.name)).first();
               var group = $(self._dialog).find('#p' + attrToID(a.name)).first();
               if (!el.length)
                   return;
               // .text(), never .html(): the message quotes what the
               // user typed
               el.text(problem || '');
               el.toggle(!!problem);
               group.toggleClass('has-error', !!problem);
           };

           Dialog.prototype.getAttributesFromForm = function () {
               var self = this;
               var attr = {};
               self.getCurrentAttributes().map(function(schemaAttr) {
                   var a = schemaAttr.name;
                   var el = $(self._dialog).find('#'+attrToID(a)).first();
                   var type = el.type || (el[0] && el[0].type);
                   var val = valueMap[type] ? valueMap[type](el) : el.val();
                   attr[a] = self.normalize( schemaAttr, val );
               });
               return attr;
           };

           /**
            * Update text in editor area
            * @param  {String} newtext [new text to replace old one]
            */
           Dialog.prototype.updateText = function (newtext) {
               this.text = newtext;
           };

           /**
            * Show actual text editor in its container by loading EpicEditor, this method
            * must be put into listener's callback function because its container is not appended
            * into DOM at this point and load() cannot access other DOM elements.
            * @return {void}
            */
           Dialog.prototype.show = function () {
               var self = this;
               self._dialog.modal('show');
           };

           Dialog.prototype.hide = function () {
               var self = this;
               self._dialog.modal({ show: false });
               self._dialog.modal('hide');
           };

           /**
            * Report a failed save in the dialog itself. The form stays
            * open and filled in, so the user can retry rather than
            * retype.
            */
           Dialog.prototype.showError = function (message) {
               var self = this;
               if (!self._error || !self._error.length) {
                   self._error = $('<div class="alert alert-danger dialog-error"></div>');
                   self._attrForm.before(self._error);
               }
               // .text(), never .html(): the message can carry model
               // content and error text from the store
               self._error.text(message).show();
           };

           return Dialog;
       });
