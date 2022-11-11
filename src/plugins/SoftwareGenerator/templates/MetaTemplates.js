define(['bower/handlebars/handlebars.min',
        './uml/Templates',
        'text!./test_bench/Makefile.tmpl',
        'text!./test_bench/test.cpp'],
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
             "State Machine": {
               "Makefile": 'MakefileTempl',
               "{{{sanitizedName}}}_test.cpp": 'MainTestTempl',
             },
           },
           Templates: {
           },
           makeVariableName: function(obj) {
             var self = this;
             obj.VariableName = obj.sanitizedName.toUpperCase() + '_OBJ';
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
             if (parent && parent.type != 'State Machine') {
               self.makeFullyQualifiedName( parent, objDict );
               fqName = parent.fullyQualifiedName + '::' + fqName;
             }
             obj.fullyQualifiedName = fqName;
           },
           renderTestCode: function( model, objToFilePrefixFn ) {
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
                   if (objToFilePrefixFn) {
                     var fileName = null;
                     var prefix = objToFilePrefixFn( obj );
                     if (prefix) {
                       fileName = prefix + fileName;
                     }
                   }
                   if (fileName) {
                     artifacts[ fileName ] = fileData;
                   }
                 });
               }
             });
             return artifacts;
           },
           renderHFSM: function(model, objToFilePrefixFn ) {
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
                   var hfsmArtifacts = {};
                   hfsmArtifacts = Object.assign(
                     hfsmArtifacts,
                     UMLTemplates.renderStates( obj )
                   );
                   hfsmArtifacts = Object.assign(
                     hfsmArtifacts,
                     UMLTemplates.renderStatic( )
                   );
                   if (objToFilePrefixFn) {
                     var prefixedArtifacts = {};
                     Object.keys(hfsmArtifacts).map(function(fname) {
                       var fdata = hfsmArtifacts[fname];
                       var prefix = objToFilePrefixFn(obj);
                       if (prefix) {
                         var prefixedName = prefix + fname;
                         prefixedArtifacts[prefixedName] = fdata;
                       }
                     });
                     hfsmArtifacts = prefixedArtifacts;
                   }

                   generatedArtifacts = Object.assign(
                     generatedArtifacts,
                     hfsmArtifacts
                   );
                 });
               }
             });
             return generatedArtifacts;
           },
         };
       }); // define( [], function() {} );
