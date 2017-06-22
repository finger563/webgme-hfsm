/**
 * @author William Emfinger  https://github.com/finger563
 */

define(['js/util',
	'bower/mustache.js/mustache.min',
	'bower/highlightjs/highlight.pack.min',
	'text!./Simulator.html',
	'css!../../../../decorators/UMLStateMachineDecorator/DiagramDesigner/UMLStateMachineDecorator.DiagramDesignerWidget.css',
	'css!bower/highlightjs/styles/default.css',
	'css!./Simulator.css'],
       function(Util,
		mustache,
		hljs,
		SimulatorHtml){
           'use strict';
	   
           var Simulator;

	   var eventTempl = ['<div class="row btn btn-default btn-primary btn-block eventButton">',
			     '<span class="eventButtonText">{{eventName}}</span>',
			     '</div>'].join('\n');
	   
	   var stateTemplate = [
	       '<div class="uml-state-diagram">',
	       '<div class="state">',
	       '<div class="name">{{name}}</div>',
	       '<ul class="internal-transitions">',
	       '<li class="internal-transition">Entry / <code class="cpp hljs" style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">{{Entry}}</code></li>',
	       '<li class="internal-transition">Exit  / <code class="cpp hljs" style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">{{Exit}}</code></li>',
	       '<li class="internal-transition">Tick  / <code class="cpp hljs" style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">{{Tick}}</code></li>',
	       '{{#InternalTransitions}}',
	       '<li class="internal-transition">{{Event}} [<font color="gray">{{Guard}}</font>] / <code class="cpp hljs" style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">{{Action}}</code></li>',
	       '{{/InternalTransitions}}',
	       '</ul>',
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
	    * @param  {DOM Element}    container   The container for the Simulator
	    * @param  {List of nodes}  nodes       The nodes describing the graph
            * @return {void}
            */
           Simulator.prototype.initialize = function ( container, nodes, client ) {
               var self = this;

	       this._client = client;

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

	   /* * * * * * State Info Display Functions  * * * * * * * */

	   Simulator.prototype.renderState = function( gmeId ) {
	       var self = this;
	       var node = self._client.getNode( gmeId );
	       var internalTransitions = [];
	       node.getChildrenIds().map(function(cid) {
		   var child = self._client.getNode( cid );
		   var childType = self._client.getNode( child.getMetaTypeId() ).getAttribute( 'name' );
		   if (childType == 'Internal Transition') {
		       internalTransitions.push({
			   Event: child.getAttribute('Event'),
			   Guard: child.getAttribute('Guard'),
			   Action: child.getAttribute('Action'),
		       });
		   }
	       });
	       var stateObj = {
		   name: node.getAttribute('name'),
		   Entry: node.getAttribute('Entry'),
		   Exit: node.getAttribute('Exit'),
		   Tick: node.getAttribute('Tick'),
		   InternalTransitions: internalTransitions
	       };
	       return mustache.render( stateTemplate, stateObj );
	   };

	   Simulator.prototype.displayStateInfo = function ( gmeId ) {
	       var self = this;
	       self.hideStateInfo();
	       var node = self._client.getNode( gmeId );
	       var nodeType = self._client.getNode( node.getMetaTypeId() ).getAttribute( 'name' );
	       if (nodeType == 'State')
		   $(self._stateInfo).append( self.renderState( gmeId ) );
	   };

	   Simulator.prototype.hideStateInfo = function( ) {
	       var self = this;
	       $(self._stateInfo).empty();
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
