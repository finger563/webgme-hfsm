/**
 * @author Qishen Zhang  https://github.com/VictorCoder123
 */

define(['js/util',
	'text!./Dialog.html',
	'css!./Dialog.css'],
    function(Util,
             DialogTemplate){
        'use strict';
	
        var Dialog;

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

            // Initialize Modal and append it to main DOM
            this._dialog.modal({ show: false});

	    // can we add <option>Deep History Pseudotate</option>
            // can we add <option>Shallow History Pseudostate</option>
            // can we add <option>Initial</option>
            // can we add <option>End State</option>
	    var node = client.getNode( desc.id );
	    var uniqueTypes = ['Shallow History Pseudostate', 'Deep History Pseudostate', 'Initial', 'End State'];
	    node.getChildrenIds().forEach(function (childId) {
		var child = client.getNode( childId );
	    });

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
