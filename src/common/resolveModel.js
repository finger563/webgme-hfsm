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

      // the full set of model-node types the pipeline understands; a
      // typo like "state" would otherwise take the empty-default path,
      // be ignored by checkModel / processor, and produce malformed
      // generated code (e.g. a transition targeting a never-rendered
      // state)
      var VALID_TYPES = [
        'Project', 'State Machine', 'Library', 'State', 'Initial',
        'End State', 'Choice Pseudostate', 'Deep History Pseudostate',
        'Shallow History Pseudostate', 'External Transition',
        'Local Transition', 'Internal Transition', 'Event', 'Field',
        // known non-semantic types
        'Documentation',
      ];

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
        if (VALID_TYPES.indexOf(obj.type) === -1) {
          throw "ERROR: " + path + " has unknown type '" + obj.type +
            "'. Valid types: " + VALID_TYPES.join(', ') + ".";
        }
        // flatten attributes onto the object like webgme-to-json
        // does. Structural fields must not be overwritable through
        // the attributes map -- `attributes.type` would bypass the
        // type validation above ('name' stays legal: it genuinely is
        // an attribute in webgme-to-json output)
        var STRUCTURAL_KEYS = ['path', 'type', 'parentPath',
                               'childPaths', 'pointers', 'sets',
                               'attributes'];
        if (obj.attributes) {
          Object.keys(obj.attributes).forEach(function(attr) {
            if (STRUCTURAL_KEYS.indexOf(attr) > -1) {
              throw "ERROR: " + path + " attributes must not contain the " +
                "structural key '" + attr + "'.";
            }
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
      // validate the explicit root itself before anything derived
      // from it (existence and type first: a leaf-State root would
      // otherwise surface as a confusing dangling-parent error)
      var ROOT_TYPES = ['Project', 'State Machine', 'Library'];
      if (typeof model.root === 'string') {
        if (!objects[model.root]) {
          throw "ERROR: model.root '" + model.root + "' is not in model.objects.";
        }
        if (ROOT_TYPES.indexOf(objects[model.root].type) === -1) {
          throw "ERROR: model.root '" + model.root + "' has type '" +
            objects[model.root].type + "'; the root must be a " +
            ROOT_TYPES.join(' / ') + " (nothing would be generated otherwise).";
        }
      }
      // resolve the root (existence / type already validated above)
      if (typeof model.root === 'string') {
        model.root = objects[model.root];
      } else if (!model.root) {
        // find a supported ROOT-TYPE object with no parent in the
        // map; accepting any lone object would let a rootless model
        // (e.g. a single State) "resolve" and generate nothing
        var roots = paths.filter(function(p) {
          return !objects[objects[p].parentPath] &&
            ROOT_TYPES.indexOf(objects[p].type) > -1;
        });
        if (roots.length !== 1) {
          throw "ERROR: cannot determine model root; found " + roots.length +
            " top-level Project / State Machine / Library objects. " +
            "Set model.root explicitly.";
        }
        model.root = objects[roots[0]];
      }

      // EVERY object must be reachable from the resolved root by
      // walking parentPath links -- regardless of whether the root
      // was explicit or auto-detected. This catches dangling parents
      // (a typo leaves the object silently unlinked and ungenerated)
      // and containment cycles.
      var rootPath = model.root.path;
      paths.forEach(function(path) {
        if (path === rootPath) return;
        var seen = Object.create(null);
        var cur = objects[path];
        while (true) {
          if (cur.path === rootPath) return; // reachable
          if (seen[cur.path]) {
            throw "ERROR: " + path + " is in a containment cycle (via '" +
              cur.path + "') and cannot be reached from the root.";
          }
          seen[cur.path] = true;
          var parent = objects[cur.parentPath];
          if (!parent) {
            throw "ERROR: " + cur.path + " has parentPath '" + cur.parentPath +
              "' which does not resolve to an object in the model " +
              "(only the root may have an external parent), so '" +
              path + "' is unreachable from the root.";
          }
          cur = parent;
        }
      });
      return model;
    },
  };
});
