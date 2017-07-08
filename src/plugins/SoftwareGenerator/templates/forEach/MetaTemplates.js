define(['handlebars/handlebars.min',
	'./uml/Templates',
	'text!./component.mk',
	'text!./main.cpp',
	'text!./Task.cpp',
	'text!./Task.hpp',
	'text!./Timer.cpp',
	'text!./Timer.hpp',
	'text!./Comp.cpp',
	'text!./Comp.hpp'],
       function(handlebars,
		UMLTemplates,
		compMk,
		mainCppTempl,
		TaskCppTempl,
		TaskHppTempl,
		TimerCppTempl,
		TimerHppTempl,
		CompCppTempl,
		CompHppTempl) {
	   'use strict';

	   return {
	       Templates: {
		   "Component": {
		       "{{base}}/components/{{obj.sanitizedName}}/include/{{obj.sanitizedName}}.hpp": CompHppTempl,
		       "{{base}}/components/{{obj.sanitizedName}}/{{obj.sanitizedName}}.cpp": CompCppTempl,
		       "{{base}}/components/{{obj.sanitizedName}}/component.mk": compMk
		   },
		   "Task": {
		       "{{base}}/components/{{obj.sanitizedName}}/include/{{obj.sanitizedName}}.hpp": TaskHppTempl,
		       "{{base}}/components/{{obj.sanitizedName}}/{{obj.sanitizedName}}.cpp": TaskCppTempl,
		       "{{base}}/components/{{obj.sanitizedName}}/component.mk": compMk
		   },
		   "Timer": {
		       "{{base}}/components/{{obj.sanitizedName}}/include/{{obj.sanitizedName}}.hpp": TimerHppTempl,
		       "{{base}}/components/{{obj.sanitizedName}}/{{obj.sanitizedName}}.cpp": TimerCppTempl,
		       "{{base}}/components/{{obj.sanitizedName}}/component.mk": compMk
		   },
		   "main": {
		       "{{base}}/main.cpp": mainCppTempl,
		   },
	       },
	       renderEnd: function( obj ) {
	       },
	       renderDeepHistory: function( obj ) {
	       },
	       renderShallowHistory: function( obj ) {
	       },
	       renderChoice: function( obj ) {
	       },
	       renderState: function( obj ) {
	       },
	       renderHFSM: function(model) {
		   var self    = this;
		   var objects = model.objects;
		   var root    = model.root;
		   var rootTypes = ['Task','Timer'];
		   var generatedArtifacts = {};
		   rootTypes.map(function(rootType) {
		       var rootTypeList = root[ rootType + '_list' ];
		       if (rootTypeList) {
			   rootTypeList.map(function(obj) {
			       generatedArtifacts = Object.assign(
				   generatedArtifacts,
				   UMLTemplates.renderStates( obj )
			       );
			   });
		       }
		   });
		   generatedArtifacts = Object.assign(
		       generatedArtifacts,
		       UMLTemplates.renderEvents( root )
		   );
		   return generatedArtifacts;
	       },
	       getArtifacts: function(pathToObjDict, baseDir) {
		   var self = this;
		   var artifacts = {};
		   Object.keys(pathToObjDict).map(function (path) {
		       var obj = pathToObjDict[ path ];
		       var templDict = self.Templates[ obj.type ];
		       if ( templDict ) {
			   Object.keys(templDict).map(function(pathTempl) {
			       var fileTempl = templDict[ pathTempl ];
			       var context = {
				   base: baseDir,
				   obj: obj
			       };
			       var fileData = '';
			       var filePath = '';
			       /*
			       var filePath = mustache.render( pathTempl, renderData );
			       var fileData = mustache.render( fileTempl, renderData );
			       */
			       artifacts[ filePath ] = fileData;
			   });
		       }
		   });
	       },
	   };
       }); // define( [], function() {} );
