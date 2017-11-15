define(['bower/handlebars/handlebars.min',
	'./uml/Templates',
	'text!./Makefile.tmpl',
	'text!./test.cpp'],
       function(handlebars,
		UMLTemplates,
		MakefileTempl,
		MainTestTempl) {
	   'use strict';

	   var Partials = {
	       MakefileTempl: MakefileTempl,
	       MainTestTempl: MainTestTempl,
	   };

	   Object.keys(Partials).map(function(partialName) {
	       handlebars.registerPartial( partialName, Partials[ partialName ] );
	   });

	   return {
	       TestTemplates: {
		   "Project": {
		       "Makefile": 'MakefileTempl',
		   },
		   "State Machine": {
		       "{{{sanitizedName}}}_test.cpp": 'MainTestTempl',
		   },
	       },
	       Templates: {
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
                   if (parent && obj.type != 'State Machine') {
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
                   if (parent && obj.type != 'State Machine') {
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
                   if (parent && obj.type != 'State Machine') {
		       self.makeFullyQualifiedName( parent, objDict );
		       fqName = parent.fullyQualifiedName + '::' + fqName;
		   }
		   obj.fullyQualifiedName = fqName;
	       },
	       renderTestCode: function( model ) {
		   var self = this;
		   var objects = model.objects;
		   var root    = model.root;
		   var artifacts = {};
		   Object.keys(objects).map(function (path) {
		       var obj = objects[ path ];
		       var templDict = self.TestTemplates[ obj.type ];
		       if ( templDict ) {
			   Object.keys(templDict).map(function(templPath) {
			       var templName = templDict[ templPath ];
			       var fileName = handlebars.compile( templPath )( obj );
			       var fileData = handlebars.compile(
				   Partials[ templName ]
			       )(
				   obj
			       );
			       artifacts[ fileName ] = fileData;
			   });
		       }
		   });
		   return artifacts;
	       },
	       renderHFSM: function(model) {
		   var self    = this;
		   var objects = model.objects;
		   var root    = model.root;
		   var rootTypes = ['State Machine'];
		   var generatedArtifacts = {};

		   // make variable names and such for objects
		   Object.keys( objects ).map(function( path ) {
		       var obj = model.objects[ path ];
		       obj.parent = model.objects[ obj.parentPath ];
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
		       else if (obj.type == 'State Machine') {
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
                       var rootTypeList = Object.keys(objects).filter(function(k) {
                           var o = objects[k];
                           return o.type == rootType;
                       }).map(function(k) {
                           return objects[k];
                       });
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
		   generatedArtifacts = Object.assign(
		       generatedArtifacts,
		       UMLTemplates.renderStatic()
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
