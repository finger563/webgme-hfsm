/**
 * @author Qishen Zhang  https://github.com/VictorCoder123
 */

define(['js/util',
	'bower/mustache.js/mustache.min',
	'text!./Dialog.html',
	'text!./Type.html',
	'css!./Dialog.css'],
       function(Util,
		mustache,
		DialogTemplate,
		TypeTemplate){
           'use strict';
	   
           var Dialog;

	   var ignoreTypes = ['Documentation']

	   var attrForm = ['<div class="form-group" id="p{{attr}}">',
			   '<label class="col-sm-4 control-label">{{attr}}</label>',
			   '<div class="col-sm-8 controls">' ,
			   '<input type="{{type}}" id="{{attr}}" placeholder="">',
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
            * Initialize Dialog by creating EpicEditor in Bootstrap modal
            * window and set event listeners on its subcomponents like save button. Notice
            * EpicEditor is created but not loaded yet. The creation and loading of editor
            * are seperated due to the reason decorator component is not appended to DOM within
            * its own domain.
            * @param  {Object}     nodeDesc       Descriptor for the node that will be the parent
            * @param  {Object}     client         Client object for creating nodes and setting attributes
            * @return {void}
            */
           Dialog.prototype.initialize = function ( desc, client) {
               var self = this;
	       self.client = client;

               // Initialize Modal and append it to main DOM
               this._dialog.modal({ show: false});

	       // add children types to selector
	       this._childTypes = {};
	       this._childTypes = self.getValidChildrenTypes( desc, client );
	       var typeNames = Object.keys(this._childTypes).sort().reverse();
	       typeNames.map(function(t) {
		   $(self._childSelector).append(new Option(t, t));
	       });
	       this.renderChildForm( typeNames[0] );
	       $(this._childSelector).value = typeNames[0];
	       this._childSelector.on('change', this.selectChild.bind(this));

               // Event listener on click for SAVE button
               this._btnSave.on('click', function (event) {
                   // Invoke callback to deal with modified text, like save it in client.
		   /*
		     client.startTransaction();
		     // save node data here dependent on the type of node
		     client.completeTransaction();
		   */
                   // Close dialog
		   self._dialog.modal({ show: false});
                   self._dialog.modal('hide');
                   event.stopPropagation();
                   event.preventDefault();
               });

               // Event listener on click for SAVE button
               this._btnClose.on('click', function (event) {
                   // Close dialog
		   self._dialog.modal({ show: false});
                   self._dialog.modal('hide');
                   event.stopPropagation();
                   event.preventDefault();
               });

               // Event listener on click for SAVE button
               this._btnCancel.on('click', function (event) {
                   // Close dialog
		   self._dialog.modal({ show: false});
                   self._dialog.modal('hide');
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

	   Dialog.prototype.selectChild = function (event) {
	       var self = this;
	       var childSelect = event.target;
	       var newChildType = childSelect.options[ childSelect.selectedIndex ].textContent;
	       self.renderChildForm( newChildType );
	   };

	   Dialog.prototype.renderChildForm = function( childType ) {
	       var self = this;
	       self._attrForm.empty();
	       if (childType) {
		   // re-render rest of HTML for dialog here!
		   self._attrForm.append( self.getForm( self._childTypes[ childType ], self.client ) );
	       }
	   };

	   Dialog.prototype.getValidChildrenTypes = function( desc, client ) {
	       var node = client.getNode( desc.id );
	       var validChildTypes = {};

	       // create a map of each meta type to number of children of that type
	       var currentChildTypes = {};
	       node.getChildrenIds().forEach(function (childId) {
		   var child = client.getNode( childId );
		   var metaId = child.getMetaTypeId();
		   if (currentChildTypes[metaId])
		       currentChildTypes[metaId]++;
		   else
		       currentChildTypes[metaId] = 1;
	       });

	       // figure out what the allowable range is
	       var validChildren = client.getChildrenMeta( desc.id );
	       if (validChildren && validChildren.items) {
		   validChildren.items.map(function(vc) {
		       var child = client.getNode(vc.id);
		       var childType = child.getAttribute('name');
		       if ( !child.isAbstract() &&
			    !child.isConnection() &&
			    ignoreTypes.indexOf( childType ) == -1 &&
			    (currentChildTypes[vc.id] == undefined ||
			     vc.max == undefined ||
			     currentChildTypes[vc.id] < vc.max) )
			   validChildTypes[ childType ] = vc.id;
		   });
	       }

	       return validChildTypes;
	   };

	   // ATTRIBUTE RELATED FUNCTIONS

	   Dialog.prototype.getForm = function ( metaId, client ) {
	       var self = this;
	       var form = '';
	       var node = client.getNode( metaId );
	       node.getAttributeNames().map( function(a) {
		   form += self.getAttributeForm( a, node.getAttributeMeta(a).type );
	       });
	       return form;
	   };

	   Dialog.prototype.getAttributeForm = function ( attr, type ) {
	       return mustache.render( attrForm, { attr: attr, type: type } );
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

           return Dialog;
       });
