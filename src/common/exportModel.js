/**
 * Serialize a model to the portable JSON the CLI, the playground and
 * the checker all read -- the inverse of resolveModel.
 *
 * WHY POSITIONS MATTER HERE
 * -------------------------
 * Laying a state machine out by hand is real work: which state sits
 * where, and next to what, is most of what makes a diagram readable.
 * If the exported model does not carry that, the layout is thrown
 * away every time the model leaves WebGME, and the same model draws
 * differently in the editor and in the playground. So `position` is
 * part of the format, not an editor detail.
 *
 * WHAT IS DROPPED
 * ---------------
 * Everything derivable: `childPaths` (containment is the path),
 * `path` (it is the key), the flattened attribute copies, and
 * attributes still at their metamodel default. What is left is what a
 * person would have written by hand, which is also what makes the
 * result reviewable in a diff.
 */
define(['./metaRules'], function (metaRules) {
  'use strict';

  var TYPES = metaRules.types;

  function isDefault(type, attr, value) {
    var meta = TYPES[type] && TYPES[type].attributes[attr];
    return !!meta && meta.default !== undefined && meta.default === value;
  }

  function positionOf(obj) {
    var pos = obj.position;
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      return null;
    }
    // whole pixels: the diagram is not sensitive to sub-pixel offsets
    // and rounding keeps the diffs readable
    return { x: Math.round(pos.x), y: Math.round(pos.y) };
  }

  return {
    /**
     * @param model  { root, objects } -- objects may be raw
     *   webgme-to-json output or an already-resolved model
     * @param opts   { namespace }
     * @return a plain object ready for JSON.stringify
     */
    toPortable: function (model, opts) {
      opts = opts || {};
      var objects = model.objects || {};
      var out = {};

      Object.keys(objects).sort().forEach(function (path) {
        var obj = objects[path];
        if (!obj || !obj.type) return;

        var entry = { name: obj.name, type: obj.type };

        var position = positionOf(obj);
        if (position) entry.position = position;

        // Attributes come from the METAMODEL's list for this type,
        // not from whatever keys the object happens to have. By the
        // time a model has been through resolveModel and the
        // processor it also carries derived fields -- Substates,
        // *_list arrays, sanitizedName -- and asking the metamodel is
        // what keeps those out without having to enumerate them.
        //
        // Values are read off the object itself: resolveModel
        // flattens `attributes` onto it, and a hand-authored model
        // writes them there directly, so the object is the one place
        // both agree on.
        var declared = (TYPES[obj.type] && TYPES[obj.type].attributes) || {};
        Object.keys(declared).sort().forEach(function (attr) {
          if (attr === 'name') return;   // already written above
          var value = obj[attr];
          if (value === undefined && obj.attributes) {
            value = obj.attributes[attr];
          }
          if (value === undefined || value === null) return;
          if (typeof value === 'object' || typeof value === 'function') return;
          if (isDefault(obj.type, attr, value)) return;
          entry[attr] = value;
        });

        var pointers = obj.pointers || {};
        var kept = {};
        Object.keys(pointers).sort().forEach(function (name) {
          if (pointers[name]) kept[name] = pointers[name];
        });
        if (Object.keys(kept).length) entry.pointers = kept;

        out[path] = entry;
      });

      var portable = {
        root: typeof model.root === 'string'
          ? model.root
          : (model.root && model.root.path),
        objects: out,
      };
      var namespace = opts.namespace || model.namespace;
      if (namespace) portable.namespace = namespace;
      return portable;
    },

    /** the same thing, as the text that gets written to a file */
    toJSON: function (model, opts) {
      return JSON.stringify(this.toPortable(model, opts), null, 2) + '\n';
    },
  };
});
