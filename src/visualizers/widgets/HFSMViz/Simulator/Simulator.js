/**
 * @author William Emfinger  https://github.com/finger563
 */

define(['js/util',
	'bower/mustache.js/mustache.min',
	'text!./Simulator.html',
	'css!./Simulator.css'],
       function(Util,
		mustache,
		SimulatorHtml){
           'use strict';
	   
           var Simulator;

	   var eventTempl = ['<div class="row btn btn-default btn-primary btn-block eventButton">',
			     '<span class="eventButtonText">{{eventName}}</span>',
			     '</div>'].join('\n');

           /**
            * Simulator Constructor
            * Insert dialog modal into body and initialize editor with
            * customized options
            */
           Simulator = function () {
           };

           /**
	    * @param  {DOM Element}    container   The container for the Simulator
	    * @param  {List of nodes}  nodes       The nodes describing the graph
            * @return {void}
            */
           Simulator.prototype.initialize = function ( container, nodes ) {
               var self = this;

	       container.append( SimulatorHtml );
	       this._container = container;
	       this._el = $(container).find('#hfsmSimulator').first();
	       this._top = $(container).find('.simulator-top-panel').first();
	       this._bottom = $(container).find('.simulator-bottom-panel').first();
	       this._handle = $(container).find('#simulatorHandle').first();

	       // NODE RELATED DATA
	       this._nodes = nodes;

	       // EVENT RELATED DATA
               this._eventButtons = this._el.find('#eventButtons').first();

	       // STATE INFO DISPLAY
	       this._stateInfo = this._el.find('#stateInfo').first();

	       // Active state information
	       this._activeState = null;

	       /*
		*/
	       // DRAGGING INFO
               this.isDragging = false;

               this._handle.mousedown(function(e) {
		   self.isDragging = true;
		   e.preventDefault();
               });
               this._el.mouseup(function() {
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
		   }
               });
           };

	   /* * * * * * * * Event Button Functions    * * * * * * * */

	   function uniq(a) {
	       var seen = {};
	       return a.filter(function(item) {
		   return seen.hasOwnProperty(item) ? false : (seen[item] = true);
	       });
	   }

	   Simulator.prototype.getEventNames = function () {
	       var self = this;
	       var eventNames = Object.keys(self._nodes).map(function(k) {
		   var desc = self._nodes[k];
		   if (desc.isConnection && desc.event) {
		       return desc.event;
		   }
	       });
	       eventNames = uniq(eventNames);
	       return eventNames;
	   };

	   Simulator.prototype.createEventButtons = function () {
	       var self = this;
	       self._eventButtons.empty();
	       var eventNames = self.getEventNames().sort();
	       eventNames.map(function (eventName) {
		   if (eventName) {
		       var buttonHtml = mustache.render(eventTempl, { eventName: eventName });
		       self._eventButtons.append( buttonHtml );
		   }
	       });
	   };
	   
	   Simulator.prototype.updateEventButtons = function () {
	       var self = this;
	       self.createEventButtons();
	   };

           return Simulator;
       });
