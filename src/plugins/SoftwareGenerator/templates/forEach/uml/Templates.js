define(['mustache/mustache',
	'text!./EventTempl.hpp',
	'text!./InternalEvent.tmpl',
	'text!./ExternalEvent.tmpl',
	'text!./ExternalTransition.tmpl',
	'text!./StateTempl.hpp',
	'text!./StateTempl.cpp',
	'text!./EndStateTempl.hpp',
	'text!./GeneratedStates.hpp',
	'text!./GeneratedStates.cpp'],
       function(mustache,
		EventTempl,
		InternalEventTempl,
		ExternalEventTempl,
		ExternalTransitionTempl,
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

	   function getKey(templName, root) {
	       var keyTempl = keyTemplates[ templName ];
	       return mustache.render( keyTempl, root );
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
		   console.log('render events');
		   var templName = "EventTempl";
		   var retObj = {};
		   var context = getContext( templName, root );
		   retObj[ context.key ] = mustache.render(
		       Partials[ templName ],
		       context,
		       Partials
		   );
		   return retObj;
	       },
	       renderStates: function(root) {
		   console.log('render states');
		   var rendered = {};
		   rootTemplates.map(function(rootTemplName) {
		       var context = getContext( rootTemplName, root );
		       rendered[ context.key ] = mustache.render(
			   Partials[ rootTemplName ],
			   context,
			   Partials
		       );
		   });
		   return rendered;
	       },
	   };
       }); // define( [], function() {} );
