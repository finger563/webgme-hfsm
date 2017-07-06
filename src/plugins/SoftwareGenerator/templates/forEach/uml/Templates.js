define(['mustache/mustache',
	'text!./EventTempl.hpp',
	'text!./InternalEvent.tmpl',
	'text!./ExternalEvent.tmpl',
	'text!./StateTempl.hpp',
	'text!./StateTempl.cpp',
	'text!./GeneratedStates.hpp',
	'text!./GeneratedStates.cpp',
	'text!./ChoiceStateTempl.hpp'],
       function(mustache,
		EventTempl,
		InternalEventTempl,
		ExternalEventTempl,
		StateTemplHpp,
		StateTemplCpp,
		GeneratedStatesTemplHpp,
		GeneratedStatesTemplCpp,
		ChoiceTempl) {
	   'use strict';

	   var Partials = {
	       EventTempl: EventTempl,
	       InternalEventTempl: InternalEventTempl,
	       ExternalEventTempl: ExternalEventTempl,
	       StateTemplHpp: StateTemplHpp,
	       StateTemplCpp: StateTemplCpp,
	       GeneratedStatesTemplHpp: GeneratedStatesTemplHpp,
	       GeneratedStatesTemplCpp: GeneratedStatesTemplCpp,
	       ChoiceTempl: ChoiceTempl,
	   };

	   var rootTemplates = ["GeneratedStatesTemplHpp",
				"GeneratedStatesTemplCpp" ];

	   return {
	       renderEvents: function(root) {
		   return mustache.render(
		       Partials[ "EventTempl" ],
		       root,
		       Partials
		   );
	       },
	       renderStates: function(root) {
		   return rootTemplates.map(function(rootTemplName) {
		       return mustache.render(
			   Partials[ rootTemplName ],
			   root,
			   Partials
		       );
		   });
	       },
	   };
       }); // define( [], function() {} );
