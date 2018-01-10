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
	'text!./InitTransition.tmpl',
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
                InitTransitionTempl,
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
	       InitTransitionTempl: InitTransitionTempl,
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

	   function objInBranchOfRoot(obj, root) {
	       return root && obj && obj.path && obj.path.indexOf( root.path ) > -1;
	   };

	   function getBranch( obj ) {
	       var branch = [];
	       if ( objInBranchOfRoot(obj, localRoot) ) {
		   // this obj is within the localRoot's tree
		   var currentObj = localRoot;
		   var matchedPath = currentObj.path;
		   branch.push( currentObj );
		   while (matchedPath != obj.path) {
		       var children = currentObj.State_list.filter(function(s) {
			   return obj.path.indexOf( s.path ) > -1;
		       });
		       if (children.length) {
			   var child = children[0];
			   currentObj = child;
			   branch.push( currentObj );
			   matchedPath = currentObj.path;
		       }
		       else break;
		   }
	       }
	       return branch;
	   };

	   function getCommonRoot( a, b ) {
	       var commonRoot = b;
	       var startList = getBranch( a );
	       var endList = getBranch( b );
	       var intersection = _.intersection(startList, endList);
	       if (intersection.length) {
		   commonRoot = intersection[ intersection.length - 1 ];
	       }
	       return commonRoot;
	   };

	   function sameBranch( a, b ) {
	       return a.path.indexOf(b.path) > -1 || b.path.indexOf(a.path) > -1;
	   };

	   function getStateExits( root, oldState, newState, isLocal ) {
               var rootList = getBranch( root );
               var stateList = getBranch( oldState );

	       // cases:
	       //    1. make sure external transitions along the branch re-enter root
	       //    2. make sure local transitions along branch do not re-enter root

	       if (isLocal) {
	       }
	       else {
		   if (sameBranch(oldState, newState)) {
		       rootList = rootList.filter((a) => { return a != root; });
		   }
	       }

	       var exits = _.difference( stateList, rootList ) || [];
	       return exits.reverse();
	   };

	   function getStateEntries( root, oldState, newState, isLocal ) {
               var rootList = getBranch( root );
               var stateList = getBranch( newState );

	       // cases:
	       //    1. make sure external transitions along the branch re-enter root
	       //    2. make sure local transitions along branch do not re-enter root

	       if (isLocal) {
	       }
	       else {
		   if (sameBranch(oldState, newState)) {
		       rootList = rootList.filter((a) => { return a != root; });
		   }
	       }

	       // need to make sure not to render entries for history pseudostates
	       if (["Deep History Pseudostate", "Shallow History Pseudostate"].indexOf(newState.type) > -1) {
		   stateList = stateList.filter((a) => { return a != newState });
	       }

	       var entries = _.difference( stateList, rootList ) || [];
	       return entries;
	   };

	   handlebars.registerHelper('renderTransition', function( options ) {
	       var rendered = '';

               var renderExit = options.hash.exit && options.hash.exit == "true";
               var renderEntry = options.hash.entry && options.hash.entry == "true";

	       var transition = options.hash.transition;
	       var transitions = new Array();
	       if (transition.previousTransitions) {
		   transitions = transitions.concat( transition.previousTransitions);
	       }
	       transitions.push( transition );

               var prevState = transitions[0].prevState;
               var nextState = transitions[ transitions.length - 1 ].nextState;
               var rootState = getCommonRoot( prevState, nextState );

	       var isLocal = transitions.length == 1 && transitions[0].isLocalTransition;

	       if (renderExit) {
		   // all exits from root down to new
		   var exits = getStateExits(rootState, prevState, nextState, isLocal);
		   rendered += [
		       '// Call all from prev state down exits',
		       prevState.pointerName + '->exitChildren();',
		       ''
		   ].join('\n');
		   exits.map(function(e) {
		       rendered += renderKey( e, 'exit' );
		   });
	       }

               // all transition actions from old to new
               transitions.map(function(trans) {
		   // render action
		   rendered += renderKey( trans, 'Action' );
               });

	       if (renderEntry) {
		   // all entries from root down to new
		   var entries = getStateEntries(rootState, prevState, nextState, isLocal);
		   if (isLocal) {
		       entries = entries.filter((s) => { return s !== rootState && s !== prevState; });
		   }
		   entries.map(function(e) {
		       rendered += renderKey( e, 'entry' );
		   });
	       }

	       var finalState = transition.nextState;
	       rendered += renderDebugOutput( transitions[0].prevState, finalState );
	       return rendered;
	   });

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
               var a = [];
               if (start.fullyQualifiedName) {
	           a = a.concat([
		       '#ifdef DEBUG_OUTPUT',
		       'std::cout << "STATE TRANSITION: '+
		           start.fullyQualifiedName+'->'+end.fullyQualifiedName+'" << std::endl;',
		       '#endif',
		       ''
	           ]);
               }
	       return a.join('\n');
	   };

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
