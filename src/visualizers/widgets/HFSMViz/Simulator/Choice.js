/**
 * @author William Emfinger  https://github.com/finger563
 */

define(['js/util',
	'q',
	'bower/mustache.js/mustache.min',
	'text!./Choice.html',
	'css!./Choice.css'],
       function(Util,
		Q,
		mustache,
		ChoiceTemplate){
           'use strict';
	   
           var Choice;

	   var choiceTempl = ['<div class="row btn btn-default btn-primary btn-block choice" style="min-height: 40px">',
			      '<span class="choiceText">{{{choice}}}</span>',
			      '</div>'
			     ].join('\n');

           /**
            * Choice Constructor
            * Insert dialog modal into body and initialize editor with
            * customized options
            */
           Choice = function () {
               // Get Modal Template node for Editor Choice and append it to body
               this._dialog = $(ChoiceTemplate);
               this._dialog.appendTo($(document.body))

               // Get element nodes
               this._el = this._dialog.find('.modal-body').first();

               // Get title
               this._title = this._dialog.find('#choiceTitle').first();

	       // forms
	       this._choiceForm = this._dialog.find('#choiceForm').first();

	       // buttons
               this._btnCancel = this._dialog.find('.btn-cancel').first();
           };

           /**
            * Initialize Choice
            * @param  {Array}     choices       Array of string choices to choose from
            * @return {void}
            */
           Choice.prototype.initialize = function ( choices, title ) {
               var self = this;

               // Initialize Modal and append it to main DOM
	       if (title == undefined) {
		   title = 'Select choice:';
	       }
	       $(this._title).html(title);
               //this._dialog.modal({ show: false});
               this._dialog.modal({
		   show: false,
		   //backdrop: 'static',
		   //keyboard: false
	       });
	       this.renderChoices( choices );
	       this._deferred = new Q.defer();

	       this._el.find('.choice').on('click', function (event) {
		   // get text
		   var text = self.getButtonText( event.target )
		   
                   // Close dialog
		   self._dialog.modal({ show: false});
                   self._dialog.modal('hide');
                   event.stopPropagation();
                   event.preventDefault();

		   // resolve promise
		   self._deferred.resolve(text);
	       });

               // Event listener on click for CANCEL button
               this._btnCancel.on('click', function (event) {
                   // Close dialog
		   self._dialog.modal({ show: false});
                   self._dialog.modal('hide');
                   event.stopPropagation();
                   event.preventDefault();

		   // resolve promise
		   self._deferred.resolve();
               });

               // Listener on event when dialog is hidden
               this._dialog.on('hidden.bs.modal', function () {
                   self._dialog.empty();
                   self._dialog.remove();

		   // resolve promise
		   self._deferred.resolve();
               });	       
           };

	   Choice.prototype.renderChoices = function( choices ) {
	       var self = this;
	       self._choiceForm.empty();
	       self._choiceForm.append( self.getForm( choices ) );
	   };

	   // CHOICE RELATED FUNCTIONS

	   Choice.prototype.getButtonText = function ( btnEl ) {
	       return ( $(btnEl).text() || $(btnEl).find('.choiceButtonText').first().text() ).replace(/\n/g,'');
	   };

	   Choice.prototype.getForm = function ( choices ) {
	       var self = this;
	       var form = '';
	       choices.map( function(c) {
		   form += self.renderChoiceForm( c );
	       });
	       return form;
	   };

	   Choice.prototype.renderChoiceForm = function ( choice ) {
	       return mustache.render( choiceTempl, { choice: choice } );
	   };

           /**
            * Show actual text editor in its container by loading EpicEditor, this method
            * must be put into listener's callback function because its container is not appended
            * into DOM at this point and load() cannot access other DOM elements.
            * @return {void}
            */
           Choice.prototype.show = function () {
               var self = this;
               self._dialog.modal({
		   show: true,
		   //backdrop: 'static',
		   //keyboard: false
	       });
           };

	   Choice.prototype.waitForChoice = function () {
	       return this._deferred.promise;
	   };

           return Choice;
       });
