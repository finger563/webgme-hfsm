define(['mustache/mustache',
	'text!./EventTempl.hpp',
	'text!./InternalEvent.tmpl',
	'text!./ExternalEvent.tmpl',
	'text!./StateTempl.hpp',
	'text!./StateTempl.cpp',
	'text!./GeneratedStates.hpp',
	'text!./GeneratedStates.cpp'],
       function(mustache,
		EventTempl,
		InternalEventTempl,
		ExternalEventTempl,
		StateTemplHpp,
		StateTemplCpp,
		GeneratedStatesTemplHpp,
		GeneratedStatesTemplCpp) {
	   'use strict';

	   var Partials = {
	       EventTempl: EventTempl,
	       InternalEventTempl: InternalEventTempl,
	       ExternalEventTempl: ExternalEventTempl,
	       StateTemplHpp: StateTemplHpp,
	       StateTemplCpp: StateTemplCpp,
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
	       var key = getKey( templName );
	       return Object.assign({
		   key: key,
		   dependencies: (dependencies[templName] || []).map(function(dep) { return getKey( dep, root ); })
	       }, root);
	   };

	   return {
	       renderEvents: function(root) {
		   var templName = "EventTempl";
		   var retObj = {};
		   var key = getKey( templName, root );
		   var context = getContext( templName, root );
		   retObj[ key ] = mustache.render(
		       Partials[ templName ],
		       context,
		       Partials
		   );
		   return retObj;
	       },
	       renderStates: function(root) {
		   var rendered = {};
		   rootTemplates.map(function(rootTemplName) {
		       var key = getKey( rootTemplName, root );
		       var context = getContext( rootTemplName, root );
		       rendered[ key ] = mustache.render(
			   Partials[ rootTemplName ],
			   context,
			   Partials
		       );
		   });
		   return rendered;
	       },
	   };
       }); // define( [], function() {} );
