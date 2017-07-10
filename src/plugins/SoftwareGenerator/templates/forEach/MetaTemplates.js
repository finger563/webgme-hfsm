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
	       makeVariableName: function(obj) {
		   var self = this;
		   obj.VariableName = obj.sanitizedName.toUpperCase();
	       },
	       makePointerName: function( obj, objDict ) {
		   var self = this;
		   if (obj.pointerName)
		       return;
		   if ( obj.VariableName == undefined )
		       self.makeVariableName( obj );
		   var pName = obj.VariableName;
		   var parent = objDict[ obj.parentPath ];
		   if (parent && parent.type == 'State') {
		       self.makePointerName( parent, objDict );
		       pName = parent.pointerName + '__' + pName;
		   }
		   obj.pointerName = pName;
	       },
	       makeFullyQualifiedVariableName: function( obj, objDict ) {
		   var self = this;
		   if (obj.fullyQualifiedVariableName)
		       return;
		   if ( obj.VariableName == undefined )
		       self.makeVariableName( obj );
		   var fqName = obj.VariableName;
		   var parent = objDict[ obj.parentPath ];
		   if (parent && parent.type == 'State') {
		       self.makeFullyQualifiedVariableName( parent, objDict );
		       fqName = parent.fullyQualifiedVariableName + '.' + fqName;
		   }
		   obj.fullyQualifiedVariableName = fqName;
	       },
	       makeFullyQualifiedName: function( obj, objDict ) {
		   var self = this;
		   if (obj.fullyQualifiedName)
		       return;
		   var fqName = obj.sanitizedName;
		   var parent = objDict[ obj.parentPath ];
		   // make sure we have a relatively unique name for the state
		   if (parent && parent.type == 'State') {
		       self.makeFullyQualifiedName( parent, objDict );
		       fqName = parent.fullyQualifiedName + '::' + fqName;
		   }
		   obj.fullyQualifiedName = fqName;
	       },
	       renderHFSM: function(model) {
		   var self    = this;
		   var objects = model.objects;
		   var root    = model.root;
		   var rootTypes = ['Task','Timer'];
		   var generatedArtifacts = {};

		   // make variable names and such for objects
		   Object.keys( objects ).map(function( path ) {
		       var obj = model.objects[ path ];
		       if (obj.type == 'Deep History Pseudostate') {
			   // make rendered names
			   self.makeFullyQualifiedName( obj, model.objects );
			   self.makeFullyQualifiedVariableName( obj, model.objects );
			   self.makePointerName( obj, model.objects );
		       }
		       else if (obj.type == 'Shallow History Pseudostate') {
			   // make rendered names
			   self.makeFullyQualifiedName( obj, model.objects );
			   self.makeFullyQualifiedVariableName( obj, model.objects );
			   self.makePointerName( obj, model.objects );
		       }
		       else if (obj.type == 'State') {
			   // make rendered names
			   self.makeFullyQualifiedName( obj, model.objects );
			   self.makeFullyQualifiedVariableName( obj, model.objects );
			   self.makePointerName( obj, model.objects );
		       }
		       else if (obj.type == 'End State') {
			   // make rendered names
			   self.makeFullyQualifiedName( obj, model.objects );
			   self.makeFullyQualifiedVariableName( obj, model.objects );
			   self.makePointerName( obj, model.objects );
		       }
		   });
		   
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
