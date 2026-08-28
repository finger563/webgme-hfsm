/**
 * Resolves a plain (hand-authored or exported) HFSM model JSON into
 * the shape produced by webgme-to-json's loadModel + resolvePointers,
 * so that the checkModel / processor / template pipeline can consume
 * it outside of WebGME (e.g. from the CLI in CI).
 *
 * Input format (per object in model.objects, keyed by path):
 *   {
 *     name:       'StateName',
 *     path:       '/root/a',        // '/'-separated containment path
 *     type:       'State',          // meta type name
 *     parentPath: '/root',
 *     attributes: { ... },          // optional; flattened onto the object
 *     pointers:   { src: '/x', dst: '/y' },   // transitions only
 *   }
 *
 * The resolver:
 *   - flattens `attributes` onto the object (like webgme-to-json does)
 *   - fills in default attributes per type so templates never see
 *     undefined code attributes
 *   - derives childPaths from parentPath relationships
 *   - builds the `<Type>_list` convenience arrays used by checkModel
 *     and the templates
 *   - sets model.root to the resolved root object
 */
define([], function() {
  'use strict';

  var DEFAULT_ATTRIBUTES = {
    'State Machine': {
      'Includes': '',
      'Declarations': '',
      'Definitions': '',
      'Initialization': '',
    },
    'Library': {
      'Includes': '',
      'Declarations': '',
      'Definitions': '',
      'Initialization': '',
    },
    'State': {
      'Entry': '',
      'Exit': '',
      'Tick': '',
      'Includes': '',
      'Declarations': '',
      'Definitions': '',
      'Timer Period': 0,
    },
    'External Transition': {
      'Event': '',
      'Guard': '',
      'Action': '',
      'Enabled': true,
    },
    'Local Transition': {
      'Event': '',
      'Guard': '',
      'Action': '',
      'Enabled': true,
    },
    'Internal Transition': {
      'Event': '',
      'Guard': '',
      'Action': '',
      'Enabled': true,
    },
    'Event': {},
    'Field': {
      'Type': 'int',
      'Default': '',
      'Description': '',
    },
  };

  return {
    resolve: function(model) {
      if (!model || !model.objects) {
        throw "ERROR: model must have an 'objects' map.";
      }
      var objects = model.objects;
      var paths = Object.keys(objects);

      // basic per-object normalization
      paths.forEach(function(path) {
        var obj = objects[path];
        if (!obj.path) {
          obj.path = path;
        }
        if (obj.path !== path) {
          throw "ERROR: object key '" + path + "' does not match its path '" + obj.path + "'.";
        }
        if (!obj.type) {
          throw "ERROR: " + path + " has no type.";
        }
        // flatten attributes onto the object like webgme-to-json does
        if (obj.attributes) {
          Object.keys(obj.attributes).forEach(function(attr) {
            obj[attr] = obj.attributes[attr];
          });
        } else {
          obj.attributes = {};
        }
        // fill in default attributes for the type
        var defaults = DEFAULT_ATTRIBUTES[obj.type] || {};
        Object.keys(defaults).forEach(function(attr) {
          if (obj[attr] === undefined) {
            obj[attr] = defaults[attr];
            obj.attributes[attr] = defaults[attr];
          }
        });
        if (!obj.pointers) {
          obj.pointers = {};
        }
        if (obj.parentPath === undefined) {
          // derive from the path
          var idx = obj.path.lastIndexOf('/');
          obj.parentPath = idx > 0 ? obj.path.substring(0, idx) : '';
        }
      });

      // derive childPaths and the `<Type>_list` convenience arrays
      paths.forEach(function(path) {
        var obj = objects[path];
        obj.childPaths = [];
      });
      // sort so that list ordering is deterministic
      paths.slice().sort().forEach(function(path) {
        var obj = objects[path];
        var parent = objects[obj.parentPath];
        if (parent) {
          parent.childPaths.push(obj.path);
          var key = obj.type + '_list';
          if (!parent[key]) {
            parent[key] = [];
          }
          parent[key].push(obj);
        }
      });

      // With an explicit root, every OTHER object's parentPath must
      // resolve: a dangling parent (e.g. a typo) would otherwise
      // leave the object unlinked and generation would silently omit
      // it. (Without an explicit root, the auto-detection below
      // already errors unless exactly one object lacks a parent.)
      var rootPathHint = typeof model.root === 'string' ?
          model.root : (model.root && model.root.path);
      if (rootPathHint) {
        paths.forEach(function(path) {
          var obj = objects[path];
          if (path === rootPathHint) return;
          if (!objects[obj.parentPath]) {
            throw "ERROR: " + path + " has parentPath '" + obj.parentPath +
              "' which does not resolve to an object in the model " +
              "(only the root may have an external parent).";
          }
        });
      }

      // resolve the root
      if (typeof model.root === 'string') {
        if (!objects[model.root]) {
          throw "ERROR: model.root '" + model.root + "' is not in model.objects.";
        }
        model.root = objects[model.root];
      } else if (!model.root) {
        // find a supported ROOT-TYPE object with no parent in the
        // map; accepting any lone object would let a rootless model
        // (e.g. a single State) "resolve" and generate nothing
        var rootTypes = ['Project', 'State Machine', 'Library'];
        var roots = paths.filter(function(p) {
          return !objects[objects[p].parentPath] &&
            rootTypes.indexOf(objects[p].type) > -1;
        });
        if (roots.length !== 1) {
          throw "ERROR: cannot determine model root; found " + roots.length +
            " top-level Project / State Machine / Library objects. " +
            "Set model.root explicitly.";
        }
        model.root = objects[roots[0]];
      }
      return model;
    },
  };
});
