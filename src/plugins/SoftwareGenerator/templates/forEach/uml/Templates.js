/*
 * TODO:
 *   * Get common parent properly for all state transitions
 *   * Make pointer objects for states.
 */

define(['handlebars/handlebars.min',
	'text!./EventTempl.hpp',
	'text!./InternalEvent.tmpl',
	'text!./ExternalEvent.tmpl',
	'text!./ExternalTransition.tmpl',
	'text!./ExecuteTransition.tmpl',
	'text!./InitialState.tmpl',
	'text!./StateTempl.hpp',
	'text!./StateTempl.cpp',
	'text!./EndStateTempl.hpp',
	'text!./GeneratedStates.hpp',
	'text!./GeneratedStates.cpp'],
       function(handlebars,
		EventTempl,
		InternalEventTempl,
		ExternalEventTempl,
		ExternalTransitionTempl,
		ExecuteTransitionTempl,
		InitialStateTempl,
		StateTemplHpp,
		StateTemplCpp,
		EndStateTemplHpp,
		GeneratedStatesTemplHpp,
		GeneratedStatesTemplCpp) {
	   'use strict';

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
		   'GeneratedStatesTemplHpp'
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

	   function getParents( state ) {
	       var self = this;
	       return self.getParents( );
	   };

	   function getCommonRoot( a, b ) {
	       var self = this;
	   };

	   function renderNextState( s ) {
	       var rendered = '// set the new active state\n';
	       rendered += s.fullyQualifiedVariableName + '->makeActive();\n';
	       return rendered;
	   };

	   function renderAction( t ) {
	       var a = '// transition Action for: ' + t.path + '\n';
	       a += t.Action + '\n';
	       return a;
	   };

	   function renderEntry( start, end, transitions ) {
	       var e = '';
	       if (end.type == 'End State')
		   e += '// final state, no entry.';
	       else
		   e+= '// call the entry action for the common parent\n';
	       return e;
	   };

	   function renderExit( start, end, transitions ) {
	       var e = '// call the exit function for the old state\n';
	       e += 'activeLeaf->exit();\n';
	       return e;
	   };

	   handlebars.registerHelper('renderTransition', function( options ) {
	       var transition = options.hash.transition;
	       var transitions = new Array();
	       if (transition.previousTransitions) {
		   transitions = transitions.concat( transition.previousTransitions);
	       }
	       transitions.push( transition );
	       var start = transitions[0].prevState;
	       var end = transition.nextState;
	       var rendered = '';
	       rendered += renderNextState( end );
	       rendered += renderExit( start, end, transitions );
	       transitions.map(function(t) {
		   rendered += renderAction( t );
	       });
	       rendered += renderEntry( start, end, transitions );
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
	       renderEvents: function(root) {
		   var templName = "EventTempl";
		   var retObj = {};
		   var context = getContext( templName, root );

		   retObj[ context.key ] = handlebars.compile(
		       Partials[ templName ]
		   )(
		       context
		   );
		   return retObj;
	       },
	       renderStates: function(root) {
		   var rendered = {};
		   localRoot = root;
		   rootTemplates.map(function(rootTemplName) {
		       var context = getContext( rootTemplName, root );

		       rendered[ context.key ] = handlebars.compile(
			   Partials[ rootTemplName ]
		       )(
			   context
		       );
		   });
		   return rendered;
	       },
	   };
       }); // define( [], function() {} );
