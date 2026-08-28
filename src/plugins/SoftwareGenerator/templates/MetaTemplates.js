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
             if (parent && obj.type != 'State Machine' && obj.type != 'Library') {
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
             if (parent && obj.type != 'State Machine' && obj.type != 'Library') {
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
             if (parent && parent.type != 'State Machine' && parent.type != 'Library') {
               self.makeFullyQualifiedName( parent, objDict );
               fqName = parent.fullyQualifiedName + '::' + fqName;
             }
             obj.fullyQualifiedName = fqName;
           },
             renderTestCode: function( model, namespace, objToFilePrefixFn ) {
             var self = this;
             var objects = model.objects;
             var root    = model.root;
             var artifacts = {};
             Object.keys(objects).map(function (path) {
               var obj = objects[ path ];
               obj['namespace'] = namespace;
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
                     var prefix = objToFilePrefixFn( obj );
                     // no prefix for this object means skip its artifacts
                     fileName = prefix ? prefix + fileName : null;
                   }
                   if (fileName) {
                     if (Object.prototype.hasOwnProperty.call(artifacts, fileName) &&
                         artifacts[fileName] !== fileData) {
                       throw "ERROR: machine '" + obj.name + "' (" + obj.path +
                         ") generates test artifact '" + fileName +
                         "' which collides with another machine's -- " +
                         "rename one of the machines.";
                     }
                     artifacts[ fileName ] = fileData;
                   }
                 });
               }
             });
             return artifacts;
           },
           renderHFSM: function(model, namespace, objToFilePrefixFn ) {
             var self    = this;
             var objects = model.objects;
             var root    = model.root;
             var rootTypes = ['State Machine', 'Library'];
             var generatedArtifacts = {};
             // artifact names derive from sanitized machine names, so
             // two machines may collide; identical content (e.g. the
             // shared static headers) is fine, different content must
             // not be silently overwritten
             var addArtifacts = function(target, added, machine) {
               Object.keys(added).forEach(function(fname) {
                 if (Object.prototype.hasOwnProperty.call(target, fname) &&
                     target[fname] !== added[fname]) {
                   throw "ERROR: machine '" + machine.name + "' (" +
                     machine.path + ") generates artifact '" + fname +
                     "' which collides with another machine's artifact " +
                     "of the same name -- rename one of the machines.";
                 }
                 target[fname] = added[fname];
               });
             };

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
               else if (obj.type == 'State Machine' ||
                        obj.type == 'Library') {
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
                   obj['namespace'] = namespace;
                   var hfsmArtifacts = {};
                   hfsmArtifacts = Object.assign(
                     hfsmArtifacts,
                     UMLTemplates.renderStates( obj )
                   );
                   hfsmArtifacts = Object.assign(
                     hfsmArtifacts,
                     UMLTemplates.renderStatic()
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

                   addArtifacts( generatedArtifacts, hfsmArtifacts, obj );
                 });
               }
             });
             return generatedArtifacts;
           },
         };
       }); // define( [], function() {} );
