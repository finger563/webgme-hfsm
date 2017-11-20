define(['bower/handlebars/handlebars.min',
        'underscore',
	'text!./StateBase.hpp',
	'text!./DeepHistoryState.hpp',
	'text!./ShallowHistoryState.hpp',
	'text!./EventTempl.hpp',
	'text!./InternalEvent.tmpl',
	'text!./ExternalEvent.tmpl',
	'text!./ExternalTransition.tmpl',
	'text!./ExecuteTransition.tmpl',
	'text!./InitialState.tmpl',
	'text!./StateTempl.hpp',
	'text!./StateTempl.cpp',
	'text!./EndStateTempl.hpp',
	'text!./Pointer.hpp',
	'text!./Pointer.cpp',
	'text!./GeneratedStates.hpp',
	'text!./GeneratedStates.cpp'],
       function(handlebars,
                _,
		StateBaseData,
		DeepHistoryData,
		ShallowHistoryData,
		EventTempl,
		InternalEventTempl,
		ExternalEventTempl,
		ExternalTransitionTempl,
		ExecuteTransitionTempl,
		InitialStateTempl,
		StateTemplHpp,
		StateTemplCpp,
		EndStateTemplHpp,
		PointerTemplHpp,
		PointerTemplCpp,
		GeneratedStatesTemplHpp,
		GeneratedStatesTemplCpp) {
	   'use strict';

	   var staticFiles = {
	       'StateBase.hpp': StateBaseData,
	       'DeepHistoryState.hpp': DeepHistoryData,
	       'ShallowHistoryState.hpp': ShallowHistoryData,
	   };

	   var Partials = {
	       EventTempl: EventTempl,
	       InternalEventTempl: InternalEventTempl,
	       ExternalEventTempl: ExternalEventTempl,
	       ExternalTransitionTempl: ExternalTransitionTempl,
	       ExecuteTransitionTempl: ExecuteTransitionTempl,
	       InitialStateTempl: InitialStateTempl,
	       StateTemplHpp: StateTemplHpp,
	       StateTemplCpp: StateTemplCpp,
	       EndStateTemplHpp: EndStateTemplHpp,
	       PointerTemplHpp: PointerTemplHpp,
	       PointerTemplCpp: PointerTemplCpp,
	       GeneratedStatesTemplHpp: GeneratedStatesTemplHpp,
	       GeneratedStatesTemplCpp: GeneratedStatesTemplCpp,
	   };

	   var rootTemplates = ["GeneratedStatesTemplHpp",
				"GeneratedStatesTemplCpp" ];

	   var keyTemplates = {
	       'EventTempl': '{{{sanitizedName}}}_Events.hpp',
	       'GeneratedStatesTemplHpp': '{{{sanitizedName}}}_GeneratedStates.hpp',
	       'GeneratedStatesTemplCpp': '{{{sanitizedName}}}_GeneratedStates.cpp',
	   };

	   var dependencies = {
	       'GeneratedStatesTemplCpp': [
		   'GeneratedStatesTemplHpp',
	       ]
	   };

	   var localRoot = null;

	   handlebars.registerHelper('addTransition', function(options) {
	       var context = {},
		   mergeContext = function(obj) {
		       for(var k in obj)context[k]=obj[k];
		   };
	       mergeContext(this);
	       var trans = options.hash.trans;
	       var previousTransitions = new Array();
	       if ( options.hash.previous )
		   previousTransitions = previousTransitions.concat( options.hash.previous );
	       previousTransitions.push( trans );
	       context.previousTransitions = previousTransitions;
	       return options.fn(context);
	   });

	   function getParentList( obj ) {
	       var currentObj = localRoot;
	       var matchedPath = currentObj.path;
	       var parentList = [];
	       if ( obj.path.indexOf( matchedPath ) > -1 ) {
		   // this obj is within the localRoot's tree
		   while (matchedPath != obj.path) {
		       parentList.push( currentObj );
		       var child = currentObj.State_list.filter(function(s) {
			   return obj.path.indexOf( s.path ) > -1;
		       });
		       if (child.length) {
			   child = child[0];
			   currentObj = child;
			   matchedPath = currentObj.path;
		       }
		       else break;
		   }
	       }
	       return parentList;
	   };

	   function getTopParent( start, end, transitions ) {
	       var topParent = null;
	       var startParents = getParentList( start );
	       var endParents = getParentList( end );
	       var parentListArray = transitions.map(function(t) {
		   return getParentList( t );
	       });
	       parentListArray.push( startParents );
	       parentListArray.push( endParents );
	       var intersection = _.intersection.apply(_, parentListArray);
	       if (intersection.length) {
		   topParent = intersection[ intersection.length - 1 ];
		   if (topParent.type != 'State') {
		       topParent = endParents.length > 1 ? endParents[1] : end;
		   }
	       }
	       return topParent;
	   };

	   function getCommonRoot( trans ) {
	       var commonRoot = trans.nextState;
	       var startList = getParentList( trans.prevState );
	       var endList = getParentList( trans.nextState );
	       var intersection = _.intersection(startList, endList);
	       if (intersection.length) {
		   commonRoot = intersection[ intersection.length - 1 ];
	       }
	       return commonRoot;
	   };

	   function getStateExits( trans ) {
	       var root = getCommonRoot( trans );
	       var exits = [];
	       var obj = trans.prevState;
	       while ( obj != root ) {
		   if (obj.type == 'State')
		       exits.push( obj );
		   obj = obj.parent;
	       }
	       return exits;
	   };

	   function getStateEntries( trans ) {
	       var root = getCommonRoot( trans );
	       var entries = [];
	       var obj = trans.nextState;
	       while ( obj != root ) {
		   if (obj.type == 'State')
		       entries.push( obj );
		   obj = obj.parent;
	       }
	       return entries;
	   };

	   function renderNextState( s ) {
	       var rendered = [
		   '// Now set the proper leaf state to be active!',
		   s.pointerName + '->makeActive();',
		   ''
	       ].join('\n');
	       return rendered;
	   };

	   function renderKey( obj, key ) {
	       var a = [
		   '// ' + obj.type + ' : ' + key + ' for: '+obj.path,
	       ];
               if (obj.pointerName) {
                   a.push( obj.pointerName + '->'+key+'();' );
               }
               else {
                   a.push( '//::::'+obj.path+'::::'+key+'::::' );
                   a.push( obj[key] );
               }
               a.push('');
	       return a.join('\n');
	   };

	   function renderDebugOutput( start, end ) {
	       var a = [
		   '#ifdef DEBUG_OUTPUT',
		   'std::cout << "STATE TRANSITION: '+
		       start.fullyQualifiedName+'->'+end.fullyQualifiedName+'" << std::endl;',
		   '#endif',
		   ''
	       ].join('\n');
	       return a;
	   };

	   handlebars.registerHelper('renderTransition', function( options ) {
	       var rendered = '';
	       var transition = options.hash.transition;
	       var transitions = new Array();
	       if (transition.previousTransitions) {
		   transitions = transitions.concat( transition.previousTransitions);
	       }
	       transitions.push( transition );

	       transitions.map(function(trans) {
		   var stateExits = getStateExits( trans );
		   var stateEntries = getStateEntries( trans );
		   if (stateExits.length) {
		       rendered += [
			   '// make sure we exit any child states!',
			   stateExits[0].pointerName + '->exitChildren();',
			   '',
		       ].join('\n');
		   }
		   // render exits
		   stateExits.map(function(s) {
		       rendered += renderKey( s, 'exit' );
		   });
		   // render action
		   rendered += renderKey( trans, 'Action' );
		   rendered += [
		       '#ifdef DEBUG_OUTPUT',
		       'std::cout << "TRANSITION::ACTION for '+trans.path+'" << std::endl;',
		       '#endif',
		       ''
		   ].join('\n');
		   // render entries
		   stateEntries.map(function(s) {
		       rendered += renderKey( s, 'entry' );
		   });
	       });
	       var finalState = transition.nextState;
	       rendered += renderNextState( finalState );
	       rendered += renderDebugOutput( transitions[0].prevState, finalState );
	       return rendered;
	   });

	   handlebars.registerHelper('getCommonRoot', function(options) {
	       console.log('getCommonRoot');
	       var start = options.hash.start;
	       var end = options.hash.end;
	       var src, dst;
	       src = start.prevState;
	       dst = end.nextState;
	       
	       console.log( src );
	       console.log( dst );
	   });

	   Object.keys(Partials).map(function(partialName) {
	       handlebars.registerPartial( partialName, Partials[ partialName ] );
	   });

	   function getKey(templName, root) {
	       var keyTempl = keyTemplates[ templName ];
	       return handlebars.compile( keyTempl )( root );
	   };

	   function getContext( templName, root ) {
	       var key = getKey( templName, root );
	       var deps = dependencies[ templName ] || [];
	       deps = deps.map(function(dep) { return getKey( dep, root ); });
	       return Object.assign({
		   key: key,
		   dependencies: deps
	       }, root);
	   };

	   return {
	       renderStatic: function() {
		   return staticFiles;
	       },
	       renderEvents: function(root) {
		   var templName = "EventTempl";
		   var retObj = {};
		   var context = getContext( templName, root );
		   retObj[ context.key ] = handlebars.compile( Partials[ templName ] )( context );
		   return retObj;
	       },
	       renderStates: function(root) {
		   var rendered = {};
		   localRoot = root;
		   rootTemplates.map(function(rootTemplName) {
		       var context = getContext( rootTemplName, root );
		       rendered[ context.key ] = handlebars.compile( Partials[ rootTemplName ] )( context );
		   });
		   return rendered;
	       },
	   };
       }); // define( [], function() {} );
