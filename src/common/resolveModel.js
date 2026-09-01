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
define(['./meta'], function(meta) {
  'use strict';

  var TYPES = meta.types;

  // Everything below is DERIVED from the metamodel generated out of
  // WebGME (scripts/gen-meta.js), so the CLI and the playground apply
  // the same rules the editor enforces instead of a hand-kept copy
  // that silently falls behind.

  // the full set of model-node types the pipeline understands; a
  // typo like "state" would otherwise take the empty-default path,
  // be ignored by checkModel / processor, and produce malformed
  // generated code (e.g. a transition targeting a never-rendered
  // state)
  //
  // 'Project' is not one of them: it is the wrapper webgme-to-json
  // emits for the exported project root, so it has no meta type and
  // no containment rules of its own.
  var EXPORT_ROOT_TYPE = 'Project';
  var VALID_TYPES = [EXPORT_ROOT_TYPE].concat(
    Object.keys(TYPES).filter(function(name) {
      return !TYPES[name].isAbstract;
    }));

  // a type's attribute defaults, so templates never see undefined
  // code attributes
  var DEFAULT_ATTRIBUTES = {};
  Object.keys(TYPES).forEach(function(name) {
    var attrs = TYPES[name].attributes;
    DEFAULT_ATTRIBUTES[name] = {};
    Object.keys(attrs).forEach(function(attr) {
      if (attrs[attr].default !== undefined) {
        DEFAULT_ATTRIBUTES[name][attr] = attrs[attr].default;
      }
    });
  });

  // `A` may contain `B`, following inheritance: a rule naming an
  // abstract type admits its concrete descendants
  function concreteDescendants(name) {
    return Object.keys(TYPES).filter(function(candidate) {
      if (TYPES[candidate].isAbstract) return false;
      for (var cur = candidate; cur; cur = TYPES[cur] && TYPES[cur].base) {
        if (cur === name) return true;
      }
      return false;
    });
  }

  var VALID_CHILDREN = {};   // parent type -> { child type: true }
  var VALID_ENDPOINTS = {};  // connection type -> { src|dst: { type: true } }
  Object.keys(TYPES).forEach(function(name) {
    VALID_CHILDREN[name] = {};
    Object.keys(TYPES[name].children).forEach(function(child) {
      concreteDescendants(child).forEach(function(concrete) {
        VALID_CHILDREN[name][concrete] = true;
      });
    });
    var pointers = TYPES[name].pointers;
    VALID_ENDPOINTS[name] = {};
    Object.keys(pointers).forEach(function(ptr) {
      VALID_ENDPOINTS[name][ptr] = {};
      pointers[ptr].targets.forEach(function(target) {
        concreteDescendants(target).forEach(function(concrete) {
          VALID_ENDPOINTS[name][ptr][concrete] = true;
        });
      });
    });
  });

  return {
    resolve: function(model) {
      if (!model || !model.objects) {
        throw "ERROR: model must have an 'objects' map.";
      }
      var objects = model.objects;
      var paths = Object.keys(objects);

      // normalize an object-form root to its path so the single
      // string validation below (membership + root type) covers it;
      // anything else truthy is malformed
      if (model.root && typeof model.root !== 'string') {
        if (typeof model.root === 'object' &&
            typeof model.root.path === 'string') {
          model.root = model.root.path;
        } else {
          throw "ERROR: model.root must be a path string (or an object with a 'path').";
        }
      }

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
            "'. Valid types: " + VALID_TYPES.slice().sort().join(', ') + ".";
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
        var idx = obj.path.lastIndexOf('/');
        var lexicalParent = idx > 0 ? obj.path.substring(0, idx) : '';
        if (obj.parentPath === undefined) {
          // derive from the path
          obj.parentPath = lexicalParent;
        } else if (obj.parentPath !== lexicalParent &&
                   path !== model.root) {
          // exporters and transition-branch computation use
          // path-prefix containment; a parentPath that disagrees with
          // the lexical parent would silently produce wrong output
          throw "ERROR: " + path + " has parentPath '" + obj.parentPath +
            "' which disagrees with its path (lexical parent '" +
            lexicalParent + "'). Only the root may differ.";
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

      // CONTAINMENT and CONNECTION ENDPOINTS, straight from the
      // metamodel. Without this the standalone pipeline accepts
      // models the editor could never build -- a State Machine nested
      // in a State used to generate a whole second machine, and an
      // Event parented by a State reached the generated header.
      paths.forEach(function(path) {
        var obj = objects[path];
        if (path === rootPath) return;
        var parent = objects[obj.parentPath];
        var allowed = parent && VALID_CHILDREN[parent.type];
        // a type the metamodel does not describe (the exported
        // 'Project' wrapper) constrains nothing
        if (!allowed || !Object.keys(allowed).length) return;
        if (!allowed[obj.type]) {
          throw "ERROR: " + path + " is a '" + obj.type + "' inside a '" +
            parent.type + "' (" + parent.path + "), which the metamodel " +
            "does not allow. A '" + parent.type + "' may contain: " +
            Object.keys(allowed).sort().join(', ') + ".";
        }
      });

      paths.forEach(function(path) {
        var obj = objects[path];
        var endpoints = VALID_ENDPOINTS[obj.type];
        if (!endpoints) return;
        Object.keys(endpoints).forEach(function(ptr) {
          var targetPath = obj.pointers[ptr];
          if (targetPath === undefined || targetPath === null) return;
          var target = objects[targetPath];
          if (!target) return;  // dangling pointers are checkModel's call
          if (!endpoints[ptr][target.type]) {
            throw "ERROR: " + path + " is a '" + obj.type + "' whose '" +
              ptr + "' points at a '" + target.type + "' (" + targetPath +
              "), which the metamodel does not allow. Valid " + ptr +
              " types: " + Object.keys(endpoints[ptr]).sort().join(', ') + ".";
          }
        });
      });

      return model;
    },
  };
});
