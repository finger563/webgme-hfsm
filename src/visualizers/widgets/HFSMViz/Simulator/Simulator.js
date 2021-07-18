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

         var rootTypes = ['State Machine'];

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
          * @param  {DOM Element}    container   The container for the Simulator
          * @param  {List of nodes}  nodes       The nodes describing the graph
          * @return {void}
          */
         Simulator.prototype.initialize = function ( container, nodes, client ) {
           var self = this;

           self._client = client;

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
             self._logEl.append(`${msg}\n`);
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

         Simulator.prototype.update = function() {
           var self = this;
           self.updateEventButtons();
           self.updateActiveState();
           if (self._activeState)
            self._stateChangedCallback( self._activeState.id );
           else 
             self._stateChangedCallback( null );
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
           return self.getInitialState( self.getTopLevelId(), true )
             .then(function(s) {
               self._activeState = s;
               // display info
               if (self._activeState) {
                 self.hideStateInfo();
                 self.displayStateInfo( self._activeState.id );
                 if (self._stateChangedCallback)
                 self._stateChangedCallback( self._activeState.id );
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
           if (self._stateChangedCallback)
            self._stateChangedCallback( null );
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
               alert('Warning!\n'+
                     'More than one transition has the same guard!\n'+
                     'NOT TRANSITIONING!');
               return new Q.Promise(function(resolve, reject) { resolve(); });
             }
           }

           // now get choice
           var choiceToEdgeId = self.getChoices( transitionIds );
           var choice = new Choice();
           choice.initialize( Object.keys(choiceToEdgeId), title );
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

         Simulator.prototype.handleChoice = function( stateId, callback ) {
           var self = this;
           // find the transitions out of the choice state and
           // prompt the user for which guard condition should
           // evaluate to true.
           var edgeIds = self.getEdgesFromNode( stateId );
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
               alert('Warning!\n'+
                     'Cannot have more than one END TRANSITION!\n'+
                     'NOT TRANSITIONING!');
               deferred.resolve(self._activeState);
               break;
             }
             else if (transitionIds.length) {
               // we have event-less transitions but they have guards this is illegal!
               alert('Warning!\n'+
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
               alert('Warning!\n'+
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
             alert('Warning!\nMore than one transition has same Event and no guard!\nNOT TRANSITIONING!');
             nextStateCallback( null );
           }
           else if (transitionIds.length) {
             // now get choice from user
             var state = self.nodes[ stateId ];
             var title = '<b>'+state.name+'</b> transition\'s guard for <b>'+eventName+'</b>:';
             self.selectGuard( transitionIds, title )
               .then(function(selection) {
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
               if (self._stateChangedCallback)
               self._stateChangedCallback( self._activeState.id );
             }
           }
         };

         Simulator.prototype.handleEvent = function( eventName, stateId ) {
           var self = this;
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
               if (child)
               return child.type == 'Initial';
             });
             if (init.length == 1) {
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
                 deferred.resolve( self.getInitialState( childInitId, animate ) );
               }
             }
             else if (state.type == 'Choice Pseudostate') {
               self.handleChoice( state.id, function(s) {
                 deferred.resolve(s);
               });
             }
             else {
               deferred.resolve(initState);
             }
           }
           else {
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

         function getCode(nodeObj, codeAttr, doHighlight, markIncomplete) {
           var originalCode = nodeObj.getAttribute( codeAttr ),
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
             if (childType == 'Internal Transition' && child.getAttribute('Enabled')) {
               internalTransitions.push({
                 id: cid,
                 Event: getCode(child, 'Event', false),
                 Guard: getCode(child, 'Guard', false),
                 Action: getCode(child, 'Action', true, !node.getAttribute('isComplete')),
               });
             }
           });
           var stateObj = {
             name: node.getAttribute('name'),
             id: gmeId
           };
           var text = htmlToElement( mustache.render( stateTemplate, stateObj ) );
           var el = $(text).find('.internal-transitions');
           addCodeToList( el, null, 'Entry', null, getCode(node, 'Entry', true, !node.getAttribute('isComplete')) );
           addCodeToList( el, null, 'Exit', null, getCode(node, 'Exit', true, !node.getAttribute('isComplete')) );
           addCodeToList( el, null, 'Tick', null, getCode(node, 'Tick', true, !node.getAttribute('isComplete')) );
           internalTransitions.sort(function(a,b) { return a.Event.localeCompare(b.Event); }).map(function(i) {
             addCodeToList( el, i.id, i.Event, i.Guard, i.Action );
           });
           return text.outerHTML;
         };

         Simulator.prototype.renderStateMachine = function( gmeId ) {
           var self = this;
           var node = self._client.getNode( gmeId );
           var stateObj = {
             name: node.getAttribute('name'),
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
             else if (nodeType == 'State Machine') {
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
             if (desc.isConnection && desc.Event && desc.Enabled) {
               return desc.Event;
             }
             else if (desc.type == 'Internal Transition' && desc.Enabled) {
               return desc.Event;
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
             if (self._activeState) {
               self.handleEvent( eventName, self._activeState.id );
             }
           }
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
