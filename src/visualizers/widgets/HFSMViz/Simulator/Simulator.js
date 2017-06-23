/**
 * @author William Emfinger  https://github.com/finger563
 */

define(['js/util',
	'bower/mustache.js/mustache.min',
	'bower/highlightjs/highlight.pack.min',
	'text!./Simulator.html',
	'css!decorators/UMLStateMachineDecorator/DiagramDesigner/UMLStateMachineDecorator.DiagramDesignerWidget.css',
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
	       '<div class="uml-state-machine">',
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
	       this.nodes = nodes;

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
		       self._handle.css('height', handlePercent + '%');
		   }
               });
           };

	   /* * * * * *      Simulation Functions     * * * * * * * */

	   Simulator.prototype.getEdgesFromNode = function( gmeId ) {
	       var self = this;
	       var nodeEdges = Object.keys(self.nodes).map(function (k) {
		   var node = self.nodes[k];
		   if (node.isConnection && node.src == gmeId)
		       return k;
	       });
	       return nodeEdges.filter(function (o) { return o; });
	   };

	   Simulator.prototype.getEdgesToNode = function( gmeId ) {
	       var self = this;
	       var nodeEdges = Object.keys(self.nodes).map(function (k) {
		   var node = self.nodes[k];
		   if (node.isConnection && node.dst == gmeId)
		       return k;
	       });
	       return nodeEdges.filter(function (o) { return o; });
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

	   function getCode(nodeObj, codeAttr, doHighlight) {
	       var originalCode = nodeObj.getEditableAttribute( codeAttr ),
		   code = escapeHtml(originalCode);
	       var el = '';
	       if (doHighlight) {
		   code = '<code class="cpp">'+code+'</code>';
		   code = htmlToElement(code);
		   hljs.highlightBlock(code);
		   $(code).css('text-overflow', 'ellipsis');
		   $(code).css('white-space', 'nowrap');
		   $(code).css('overflow', 'hidden');
		   if (originalCode) {
		   }
		   else {
		       $(code).css('background-color','rgba(255,0,0,0.5)');
		   }
		   el = code.outerHTML;
	       }
	       else {
		   el = code;
	       }
	       return el;
	   }

	   function addCodeToList(el, event, guard, action) {
	       if (event) {
		   var txt = '<li class="internal-transition">'+event;
		   if (guard)
		       txt += ' [<font color="gray">'+guard+'</font>]';
		   txt += ' / ';
		   if (action)
		       txt += action;
		   txt += '</li>';
		   el.append(txt);
	       }
	   }

	   Simulator.prototype.renderState = function( gmeId ) {
	       var self = this;
	       var node = self._client.getNode( gmeId );
	       var internalTransitions = [];
	       node.getChildrenIds().map(function(cid) {
		   var child = self._client.getNode( cid );
		   var childType = self._client.getNode( child.getMetaTypeId() ).getAttribute( 'name' );
		   if (childType == 'Internal Transition') {
		       internalTransitions.push({
			   Event: getCode(child, 'Event', false),
			   Guard: getCode(child, 'Guard', false),
			   Action: getCode(child, 'Action', true),
		       });
		   }
	       });
	       var stateObj = {
		   name: node.getAttribute('name')
	       };
	       var text = htmlToElement( mustache.render( stateTemplate, stateObj ) );
	       var el = $(text).find('.internal-transitions');
	       addCodeToList( el, 'Entry', null, getCode(node, 'Entry', true) );
	       addCodeToList( el, 'Exit', null, getCode(node, 'Exit', true) );
	       addCodeToList( el, 'Tick', null, getCode(node, 'Tick', true) );
	       internalTransitions.sort(function(a,b) { return a.Event.localeCompare(b.Event); }).map(function (i) {
		   addCodeToList( el, i.Event, i.Guard, i.Action );
	       });
	       return text.outerHTML;
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
	       var eventNames = Object.keys(self.nodes).map(function(k) {
		   var desc = self.nodes[k];
		   if (desc.isConnection && desc.Event) {
		       return desc.Event;
		   }
		   else if (desc.type == 'Internal Transition') {
		       return desc.Event;
		   }
	       });
	       eventNames = uniq(eventNames);
	       return eventNames;
	   };

	   Simulator.prototype.createEventButtons = function () {
	       var self = this;
	       self._eventButtons.empty();
	       var eventNames = ['Tick'].concat(self.getEventNames().sort());
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
