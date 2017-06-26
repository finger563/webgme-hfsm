/**
 * @author William Emfinger  https://github.com/finger563
 */

define(['js/util',
	'q',
	'./Choice',
	'bower/mustache.js/mustache.min',
	'bower/highlightjs/highlight.pack.min',
	'text!./Simulator.html',
	'css!decorators/UMLStateMachineDecorator/DiagramDesigner/UMLStateMachineDecorator.DiagramDesignerWidget.css',
	'css!bower/highlightjs/styles/default.css',
	'css!./Simulator.css'],
       function(Util,
		Q,
		Choice,
		mustache,
		hljs,
		SimulatorHtml){
           'use strict';
	   
           var Simulator;

	   var parentTempl = ['<div class="simulatorTitle">Child of:',
			      '</div>'].join('\n');

	   var eventTempl = ['<div id="{{eventName}}" class="row btn btn-default btn-primary btn-block eventButton">',
			     '<span class="eventButtonText">{{eventName}}</span>',
			     '</div>'].join('\n');
	   
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

	       // History state information
	       this._historyStates = {}; // map from history state ID to remembered state
	       
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

	   Simulator.prototype.update = function() {
	       var self = this;
	       this.updateEventButtons();
	       this.updateActiveState();
	       if (self._activeState)
		   this._stateChangedCallback( self._activeState.id );
	   };

	   Simulator.prototype.onStateChanged = function(stateChangedCallback) {
	       var self = this;
	       // call func when state is changed; func should take an
	       // argument that is the gmeId of the current active
	       // state
	       self._stateChangedCallback = stateChangedCallback;
	   };

	   Simulator.prototype.setActiveState = function( gmeId ) {
	       var self = this;
	       self._activeState = self.getInitialState( gmeId );
	       self.update();
	   };

	   /* * * * * *      Simulation Functions     * * * * * * * */

	   Simulator.prototype.initActiveState = function( ) {
	       var self = this;
	       this._historyStates = {};
	       this._activeState = self.getInitialState( self.getTopLevelId() );
	       // display info
	       if (self._activeState) {
		   self.hideStateInfo();
		   self.displayStateInfo( self._activeState.id );
		   if (self._stateChangedCallback)
		       self._stateChangedCallback( self._activeState.id );
	       }
	   };

	   Simulator.prototype.updateActiveState = function( ) {
	       var self = this;
	       if (self._activeState == null ||
		   self.nodes[ self._activeState.id ] == undefined) {
		   self.initActiveState();
	       }
	       else {
		   var activeId = self._activeState.id;
		   self._activeState = self.getInitialState( activeId );
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
	       if (historyStateId == undefined) // set to parent if we haven't been here before
		   historyStateId = self.nodes[ stateId ].parentId;
	       return self.getInitialState( historyStateId );
	   };

	   Simulator.prototype.handleDeepHistory = function( stateId ) {
	       var self = this;
	       // set the active state to the state stored in the
	       // history state.
	       var historyStateId = self._historyStates[ stateId ];
	       if (historyStateId == undefined) {
		   // set to parent if we havent' been here before
		   historyStateId = self.nodes[ stateId ].parentId;
		   return self.getInitialState( historyStateId );
	       }
	       else {
		   self._activeState = self.nodes[ historyStateId ];
		   if (self._activeState == undefined ) {
		       alert('History state no longer valid, reinitailizing.');
		       return self.getInitialState( self.getTopLevelId() );
		   }
	       }
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

	   Simulator.prototype.selectGuard = function( transitionIds ) {
	       var self = this;
	       if (!transitionIds.length)
		   return new Q.Promise(function(resolve, reject) { resolve(); });
	       var choiceToEdgeId = self.getChoices( transitionIds );
	       var choice = new Choice();
	       choice.initialize( Object.keys(choiceToEdgeId) );
	       choice.show();
	       return choice.waitForChoice()
		   .then(function(choice) {
		       var retObj = {
			   choice: choice,
			   transitionId: choiceToEdgeId[ choice ]
		       };
		       return new Q.Promise(function(resolve, reject) { resolve(retObj); });
		   })
	   };

	   Simulator.prototype.handleChoice = function( stateId ) {
	       var self = this;
	       // find the transitions out of the choice state and
	       // prompt the user for which guard condition should
	       // evaluate to true.
	       var edgeIds = self.getEdgesFromNode( stateId );
	       return self.selectGuard( edgeIds )
		   .then(function(selectedEdge) {
		       var nextState = null;
		       console.log('choice: ');
		       console.log(selectedEdge);
		       if (selectedEdge && selectedEdge.transitionId) {
			   nextState = self.getNextState( selectedEdge.transitionId );
		       }
		       return new Q.Promise(function(resolve, reject) { resolve(nextState); });
		   });
	   };

	   Simulator.prototype.handleEnd = function( stateId ) {
	       var self = this;
	       // see if the parent state has an external transition
	       // which does not have an event or a guard; make sure
	       // there's only one of them and then take it.
	       //
	       // If that condition is not satisfied, stay in the end
	       // state.
	       return self.nodes[ stateId ];
	   };

	   Simulator.prototype.handleSpecialStates = function( stateId ) {
	       var self = this;
	       var state = self.nodes[ stateId ];
	       var nextState = state;
	       if (state) {
		   if (state.type == 'Shallow History Pseudostate')
		       nextState = self.handleShallowHistory( state.id );
		   else if (state.type == 'Deep History Pseudostate')
		       nextState = self.handleDeepHistory( state.id );
		   else if (state.type == 'End State')
		       nextState = self.handleEnd( state.id );
		   else if (state.type == 'Choice Pseudostate')
		       return self.handleChoice( state.id );
	       }
	       return new Q.Promise(function(resolve, reject) { resolve(nextState); });
	   };

	   function transitionSort(aId, bId) {
	       var a = self.nodes[aId].Guard;
	       var b = self.nodes[bId].Guard;
	       if (!a && b) return -1;
	       if (a && !b) return 1;
	       return 0;
	   }

	   Simulator.prototype.resolveInternalTransitions = function( transitionIds ) {
	       var self = this;
	       var resolution = {
		   choice: null,
		   transitionId: null
	       };
	       // get all transitions with no guard
	       var guardless = transitionIds.filter(function(eid) {
		   var edge = self.nodes[ eid ];
		   return edge.Guard == null || !edge.Guard.trim();
	       });
	       // now check
	       if (guardless.length == 1) {
		   var intTrans = self.nodes[ guardless[0] ];
		   resolution.choice = intTrans.Guard;
		   resolution.transitionId = intTrans.id;
	       }
	       else if (guardless.length > 1) {
		   alert('Warning!\nMore than one transition has same Event and no guard!\nNOT TRANSITIONING!');
	       }
	       else {
		   // now check transitions with guard
		   resolution = self.selectGuard( transitionIds );
	       }
	       return new Q.Promise(function(resolve, reject) { resolve(resolution); });
	   };

	   Simulator.prototype.resolveExternalTransitions = function( transitionIds ) {
	       var self = this;
	       var nextState = null;
	       // check transitions with no guard
	       var guardless = transitionIds.filter(function(eid) {
		   var edge = self.nodes[ eid ];
		   return edge.Guard == null || !edge.Guard.trim();
	       });
	       if (guardless.length == 1) {
		   nextState = self.getNextState( guardless[0] );
	       }
	       else if (guardless.length > 1) {
		   alert('Warning!\nMore than one transition has same Event and no guard!\nNOT TRANSITIONING!');
	       }
	       else {
		   // now check transitions with guard
		   nextState = self.selectGuard( transitionIds )
		       .then(function(selection) {
			   console.log('external got selection: ');
			   console.log(selection);
			   if (selection && selection.transitionId)
			       return self.getNextState( selection.transitionId );
			   else 
			       return null;
		       });
	       }
	       return new Q.Promise(function(resolve, reject) { resolve(nextState); });
	   };

	   Simulator.prototype.handleEvent = function( eventName, stateId ) {
	       var self = this;
	       if (stateId) {
		   // handle internal transitions
		   var intIds = self.getInternalTransitionIds( eventName, stateId );
		   console.log('checking internal transitions');
		   return self.resolveInternalTransitions( intIds )
		       .then(function(resolution) {
			   if (resolution && resolution.transitionId) { // internal transition occured
			       console.log('resolved internal transition!');
			       console.log(resolution);
			       throw new String("internal resolution resolved event!");
			   }
		       })
		       .then(function() {
			   console.log('checking external transitions');
			   // no internal occurred, now check external
			   // get all external transitions for this event
			   var edgeIds = self.getEdgesFromNode( stateId ).filter(function(eId) {
			       return self.nodes[ eId ].Event == eventName;
			   }).sort( transitionSort );
			   // now check them
			   return self.resolveExternalTransitions( edgeIds )
			       .then(function(nextState) {
				   console.log('checked external!');
				   if (nextState) {
				       // update history states here for all states we're leaving
				       self.updateHistory( self._activeState.id );
				       console.log('got next state');
				       console.log(nextState);
				       // if we've gotten a new state, see if we have gone to a special state
				       return self.handleSpecialStates( nextState.id )
					   .then(function(state) {
					       if (state) {
						   console.log('got special state');
						   console.log(state);
						   self._activeState = state;
						   throw new String("External resolution resolved event!");
					       }
					   });
				   }
			       })
		       })
		       .then(function() {
			   console.log('checking parent state');
			   // bubble up to see if parent handles event
			   var parentState = self.getParentState( stateId );
			   if (parentState) {
			       return self.handleEvent( eventName, parentState.id );
			   }
		       })
		       .catch(function(err) {
			   console.log(err);
		       });
	       }
	       return new Q.Promise(function(resolve, reject) { resolve(); });
	   };

	   Simulator.prototype.getInternalTransitionIds = function( eventName, gmeId ) {
	       var self = this;
	       var node = self.nodes[ gmeId ];
	       var intTransIds = [];
	       if (node)
		   intTransIds = node.childrenIds.filter(function(cid) {
		       var child = self.nodes[ cid ];
		       return child.type == 'Internal Transition' && child.Event == eventName;
		   }).sort( transitionSort );
	       return intTransIds;
	   };

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

	   Simulator.prototype.getTopLevelId = function( ) {
	       var self = this;
	       var top = Object.keys(self.nodes).filter(function(k) {
		   return self.nodes[k].type == 'Task' || self.nodes[k].type == 'Timer';
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

	   Simulator.prototype.getInitialState = function( stateId ) {
	       var self = this;
	       var state = self.nodes[ stateId ];
	       var initState = state;
	       if (state) {
		   var init = state.childrenIds.filter(function (cid) {
		       var child = self.nodes[ cid ];
		       if (child)
			   return child.type == 'Initial';
		   });
		   if (init.length == 1) {
		       var initId = init[0];
		       var initEdgeIds = self.getEdgesFromNode( initId );
		       if (initEdgeIds.length == 1) {
			   var edge = self.nodes[ initEdgeIds[0] ];
			   var childInitId = edge.dst;
			   initState = self.getInitialState( childInitId );
		       }
		   }
	       }
	       return initState;
	   };

	   Simulator.prototype.getNextState = function( edgeId ) {
	       var self = this;
	       var nextState = null;
	       var edge = self.nodes[ edgeId ];
	       if (true) {  // edge) {
		   var dstId = edge.dst;
		   if (dstId) {
		       nextState = self.getInitialState( dstId ); // will recurse
		   }
	       }
	       return nextState;
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

	   function addCodeToList(el, id, event, guard, action) {
	       if (event) {
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
		       WebGMEGlobal.State.registerActiveSelection([id]);
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
		       WebGMEGlobal.State.registerActiveSelection([id]);
		   }
	       }
	   };

	   Simulator.prototype.renderState = function( gmeId ) {
	       var self = this;
	       var node = self._client.getNode( gmeId );
	       var internalTransitions = [];
	       node.getChildrenIds().map(function(cid) {
		   var child = self._client.getNode( cid );
		   var childType = self._client.getNode( child.getMetaTypeId() ).getAttribute( 'name' );
		   if (childType == 'Internal Transition') {
		       internalTransitions.push({
			   id: cid,
			   Event: getCode(child, 'Event', false),
			   Guard: getCode(child, 'Guard', false),
			   Action: getCode(child, 'Action', true),
		       });
		   }
	       });
	       var stateObj = {
		   name: node.getAttribute('name'),
		   id: gmeId
	       };
	       var text = htmlToElement( mustache.render( stateTemplate, stateObj ) );
	       var el = $(text).find('.internal-transitions');
	       addCodeToList( el, null, 'Entry', null, getCode(node, 'Entry', true) );
	       addCodeToList( el, null, 'Exit', null, getCode(node, 'Exit', true) );
	       addCodeToList( el, null, 'Tick', null, getCode(node, 'Tick', true) );
	       internalTransitions.sort(function(a,b) { return a.Event.localeCompare(b.Event); }).map(function (i) {
		   addCodeToList( el, i.id, i.Event, i.Guard, i.Action );
	       });
	       return text.outerHTML;
	   };

	   Simulator.prototype.displayStateInfo = function ( gmeId ) {
	       var self = this;
	       //self.hideStateInfo();
	       var node = self._client.getNode( gmeId );
	       if (node) {
		   var nodeType = self._client.getNode( node.getMetaTypeId() ).getAttribute( 'name' );
		   if (nodeType == 'State') {
		       if ( $(self._stateInfo).find('.uml-state-machine').length ) {
			   $(self._stateInfo).append(parentTempl);
		       }
		       $(self._stateInfo).append( self.renderState( gmeId ) );
		       $(self._stateInfo).find('.internal-transition')
			   .on('click', self.onClickInternalTransition.bind(self) );
		       $(self._stateInfo).find('.uml-state-machine')
			   .on('click', self.onClickStateInfo.bind(self) );
		       if (node.getParentId()) {
			   self.displayStateInfo( node.getParentId() );
		       }
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
	       var eventNames = ['RESTART-HFSM','Tick'].concat(self.getEventNames().sort());
	       eventNames.map(function (eventName) {
		   if (eventName) {
		       var buttonHtml = mustache.render(eventTempl, { eventName: eventName });
		       self._eventButtons.append( buttonHtml );
		       var eventButton = $(self._eventButtons).find('#'+eventName).first();
		       eventButton.on('click', self.onEventButtonClick.bind(self));
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
	       if (eventName == 'RESTART-HFSM') {
		   self.initActiveState();
	       }
	       else {
		   self.updateActiveState();
		   self.handleEvent( eventName, self._activeState.id )
		       .then(function() {
			   self.hideStateInfo();
			   self.displayStateInfo( self._activeState.id );
			   if (self._stateChangedCallback)
			       self._stateChangedCallback( self._activeState.id );
		       });
	       }
	   };

           return Simulator;
       });
