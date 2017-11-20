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
	'text!./Initialize.tmpl',
	'text!./StateTempl.hpp',
	'text!./StateTempl.cpp',
	'text!./EndStateTempl.hpp',
	'text!./ChoiceState.tmpl',
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
		InitializeTempl,
		StateTemplHpp,
		StateTemplCpp,
		EndStateTemplHpp,
		ChoiceStateTempl,
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
	       InitializeTempl: InitializeTempl,
	       StateTemplHpp: StateTemplHpp,
	       StateTemplCpp: StateTemplCpp,
	       EndStateTemplHpp: EndStateTemplHpp,
	       ChoiceStateTempl: ChoiceStateTempl,
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

	   function getCommonRoot( a, b ) {
	       var commonRoot = b;
	       var startList = getParentList( a );
	       var endList = getParentList( b );
	       var intersection = _.intersection(startList, endList);
	       if (intersection.length) {
		   commonRoot = intersection[ intersection.length - 1 ];
	       }
	       return commonRoot;
	   };

	   function getStateEntries( root, newState ) {
               var rootList = getParentList( root );
               var stateList = getParentList( newState );
	       var entries = _.difference( rootList, stateList );
	       return entries;
	   };

	   function renderKey( obj, key ) {
	       var a = [
		   '// ' + obj.type + ' : ' + key + ' for: '+obj.path,
	       ];
               if (obj.pointerName) {
                   a = a.concat([
                       obj.pointerName + '->'+key+'();',
                   ]);
               }
               else {
                   a = a.concat([
		       '#ifdef DEBUG_OUTPUT',
		       'std::cout << "TRANSITION::ACTION for '+obj.path+'" << std::endl;',
		       '#endif',
		       '',
                       '//::::'+obj.path+'::::'+key+'::::',
                       obj[key],
                   ]);
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

               var prevState = transitions[0].prevState;
               var nextState = transitions[ transitions.length - 1 ].nextState;
               var rootState = getCommonRoot( prevState, nextState );

               // all exits from old up to root
               rendered += [
                   '// Call all exits',
                   rootState.pointerName + '->exitChildren();',
                   '',
               ].join('\n');

               // all transition actions from old to new
               transitions.map(function(trans) {
		   // render action
		   rendered += renderKey( trans, 'Action' );
               });

               // all entries from root down to new
               var entries = getStateEntries(rootState, nextState);
               entries.map(function(e) {
		   rendered += renderKey( e, 'entry' );
               });

	       var finalState = transition.nextState;
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
