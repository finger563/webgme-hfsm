/**
 * ModelBackend over a plain JSON model -- no WebGME.
 *
 * Where WebGMEBackend delegates every meta question to the WebGME
 * client, this answers them from src/common/meta.json, which is
 * generated from that same metamodel (scripts/gen-meta.js). So the
 * playground enforces the rules the editor enforces instead of a
 * hand-kept approximation of them.
 *
 * The store is the model shape the rest of the pipeline already
 * speaks -- { root: '/p', objects: { '<path>': {...} } }, as accepted
 * by resolveModel -- so a model can be loaded here, edited, and handed
 * straight to the checker and the generator.
 *
 * Paths ARE ids, and containment is the path prefix, matching WebGME
 * closely enough that the widget's descriptors need no translation.
 *
 * See src/common/viz/ModelBackend.js for the contract.
 */
define(['./ModelBackend', '../metaRules'], function (ModelBackend, metaRules) {
  'use strict';

  var TYPES = metaRules.types;

  // attributes every node carries, whatever its type
  var STRUCTURAL = ['path', 'type', 'parentPath', 'childPaths',
                    'pointers', 'attributes', 'position'];

  /* * * * * * * * * * * *  the backend  * * * * * * * * * * * */

  /**
   * @param model     { root, objects } -- edited IN PLACE, so the
   *                  caller keeps a live handle to hand to the checker
   * @param onChange  optional; called after each transaction commits
   */
  function LocalBackend(model, onChange) {
    this._model = model;
    this._onChange = onChange || function () {};
    this._selection = [];
    this._readOnly = false;
    this._depth = 0;       // transactions may nest
    this._relid = 0;
  }

  LocalBackend.prototype._objects = function () {
    return this._model.objects || {};
  };

  /* * * * * * * * * * * * *  reads  * * * * * * * * * * * * */

  /**
   * The descriptor shape the widget and simulator read: the object's
   * own attributes, flattened, plus the structural fields they use to
   * lay out the graph.
   */
  LocalBackend.prototype.getNode = function (id) {
    var obj = this._objects()[id];
    if (!obj) return null;

    var desc = {};
    Object.keys(obj).forEach(function (key) {
      if (STRUCTURAL.indexOf(key) > -1) return;
      desc[key] = obj[key];
    });

    var pointers = obj.pointers || {};
    desc.id = id;
    desc.path = id;
    desc.name = obj.name;
    desc.type = obj.type;
    desc.parentId = obj.parentPath;
    desc.childrenIds = this.getChildren(id).map(function (c) { return c.id; });
    desc.position = obj.position || { x: 0, y: 0 };
    desc.isConnection = !!(TYPES[obj.type] && TYPES[obj.type].isConnection);
    desc.src = pointers.src;
    desc.dst = pointers.dst;
    return desc;
  };

  LocalBackend.prototype.getChildren = function (id) {
    var self = this;
    var objects = this._objects();
    return Object.keys(objects).filter(function (path) {
      return objects[path].parentPath === id;
    }).sort().map(function (path) {
      return self.getNode(path);
    });
  };

  LocalBackend.prototype.getNodeInfo = function (id) {
    // An id is a string. Anything else is a caller's mistake, and
    // answering it anyway is how a node once ended up with an ARRAY
    // for its type: `objects[['State']]` and `TYPES[['State']]` both
    // coerce to the string and find something, and `['State'] ==
    // 'State'` then passes every check downstream. Cytoscape's
    // stylesheet, which compares exactly, was the only thing that
    // noticed.
    if (typeof id !== 'string') return null;
    var obj = this._objects()[id];
    if (obj) {
      return {
        id: id,
        name: obj.name,
        type: obj.type,
        // a local store has no separate type identity: the name IS the
        // type, and getValidChildTypes maps onto the same token
        typeId: obj.type,
      };
    }
    // Not an object in the model, so it may be a PALETTE entry, which
    // names a type rather than an instance. WebGME answers this from
    // the meta node, which has an id of its own; here the type name is
    // the whole identity. The widget deliberately asks the backend
    // instead of resolving types itself (`_createNode`,
    // `_canCreateChild`), which is what lets a host with a palette of
    // its own work without knowing the metamodel.
    if (TYPES[id] && !TYPES[id].isAbstract) {
      return { id: id, name: id, type: id, typeId: id };
    }
    return null;
  };

  // how many children of each type `parentId` already has
  LocalBackend.prototype._childCounts = function (parentId) {
    var objects = this._objects();
    var counts = {};
    Object.keys(objects).forEach(function (path) {
      if (objects[path].parentPath !== parentId) return;
      var type = objects[path].type;
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  };

  /**
   * Only the types you could actually add right now. WebGME's
   * getValidChildrenTypesDetailed(null, true) answers "can create
   * MORE of this", and WebGMEBackend filters on it, so ignoring
   * max here would make the two backends offer different palettes:
   * a second Initial would be offered, created, and only then
   * rejected by resolveModel.
   */
  LocalBackend.prototype.getValidChildTypes = function (parentId) {
    var parent = this._objects()[parentId];
    var out = {};
    if (!parent) return out;
    var counts = this._childCounts(parentId);
    var rules = metaRules.childRules(parent.type);
    Object.keys(rules).forEach(function (name) {
      if (metaRules.canContainMore(parent.type, name, counts[name] || 0)) {
        out[name] = name;
      }
    });
    return out;
  };

  LocalBackend.prototype.getValidConnectionTypes = function (srcId, dstId, parentId) {
    var objects = this._objects();
    var src = objects[srcId];
    var dst = objects[dstId];
    var parent = objects[parentId];
    if (!src || !dst || !parent) return [];

    var allowedHere = this.getValidChildTypes(parentId);
    return Object.keys(allowedHere).filter(function (name) {
      if (!metaRules.isConnection(name)) return false;
      var endpoints = metaRules.endpointTypes(name);
      return endpoints.src && endpoints.dst &&
        endpoints.src[src.type] && endpoints.dst[dst.type];
    }).sort().map(function (name) {
      return { typeId: name, name: name };
    });
  };

  // same cardinality filtering as getValidChildTypes: a form must
  // not offer to create what cannot be created
  LocalBackend.prototype.getChildTypeSchemas = function (parentId) {
    var parent = this._objects()[parentId];
    if (!parent) return [];
    return Object.keys(this.getValidChildTypes(parentId)).sort().map(function (name) {
      var type = TYPES[name];
      return {
        name: name,
        typeId: name,
        isConnection: !!type.isConnection,
        attributes: Object.keys(type.attributes).sort().map(function (attr) {
          return {
            name: attr,
            type: type.attributes[attr].type,
            defaultValue: type.attributes[attr].default,
          };
        }),
      };
    });
  };

  LocalBackend.prototype.getAttribute = function (id, name) {
    var obj = this._objects()[id];
    return obj ? obj[name] : undefined;
  };

  LocalBackend.prototype.isReadOnly = function () {
    return this._readOnly;
  };

  LocalBackend.prototype.setReadOnly = function (readOnly) {
    this._readOnly = !!readOnly;
  };

  /* * * * * * * * * * * *  mutations  * * * * * * * * * * * */

  /**
   * All of the operations or none, as the contract requires. An
   * in-memory store can actually deliver that: the outermost
   * transaction snapshots the objects and restores them if the body
   * throws, so a failed edit leaves nothing half-applied.
   *
   * Only the OUTERMOST transaction snapshots -- an inner one that
   * throws unwinds into its caller, which restores the whole thing.
   */
  LocalBackend.prototype.transact = function (message, fn, onComplete) {
    var result;
    var snapshot = this._depth === 0
      ? JSON.parse(JSON.stringify(this._objects()))
      : null;

    this._depth++;
    try {
      result = fn();
    } catch (e) {
      this._depth--;
      if (snapshot) {
        // restore IN PLACE: callers (and the model handed to the
        // checker) hold a reference to this same objects map
        var objects = this._objects();
        Object.keys(objects).forEach(function (path) { delete objects[path]; });
        Object.keys(snapshot).forEach(function (path) {
          objects[path] = snapshot[path];
        });
      }
      if (onComplete) onComplete(e);
      throw e;
    }
    this._depth--;
    // an in-memory store settles immediately, so the change is
    // announced (and reported complete) as soon as the outermost
    // transaction closes
    if (this._depth === 0) this._onChange(message);
    if (onComplete) onComplete(null);
    return result;
  };

  LocalBackend.prototype._assertWritable = function () {
    if (this._readOnly) throw new Error('the model is read-only');
  };

  // paths are ids, so a new child needs a relid unused under `parent`
  LocalBackend.prototype._newPath = function (parentId) {
    var objects = this._objects();
    var path;
    do {
      path = parentId + '/' + (this._relid++).toString(36);
    } while (objects[path]);
    return path;
  };

  LocalBackend.prototype.createChild = function (parentId, typeName, opts) {
    this._assertWritable();
    opts = opts || {};
    if (!this.getValidChildTypes(parentId)[typeName]) {
      throw new Error('cannot create a "' + typeName + '" under ' + parentId +
                      ' (not a valid child type here)');
    }
    var path = this._newPath(parentId);
    var node = {
      path: path,
      type: typeName,
      name: typeName,
      parentPath: parentId,
      pointers: {},
      position: opts.position || { x: 0, y: 0 },
    };
    // start from the metamodel's defaults, so a new node looks the
    // same here as one created in the editor
    var attributes = TYPES[typeName].attributes;
    Object.keys(attributes).forEach(function (attr) {
      if (attributes[attr].default !== undefined) {
        node[attr] = attributes[attr].default;
      }
    });
    this._objects()[path] = node;
    return path;
  };

  /**
   * A local store has no prototypal inheritance, so -- as the
   * contract allows -- this is a deep copy. Callers must not assume
   * the result stays linked to its base.
   */
  LocalBackend.prototype.createInstances = function (parentId, baseIds, position) {
    return this.copyNodes(baseIds, parentId, position);
  };

  LocalBackend.prototype.setAttribute = function (id, name, value) {
    this._assertWritable();
    var obj = this._objects()[id];
    if (!obj) throw new Error('no such node: ' + id);
    obj[name] = value;
    if (obj.attributes) obj.attributes[name] = value;
  };

  LocalBackend.prototype.setPointer = function (id, name, targetId) {
    this._assertWritable();
    var obj = this._objects()[id];
    if (!obj) throw new Error('no such node: ' + id);
    obj.pointers = obj.pointers || {};
    obj.pointers[name] = targetId;
  };

  LocalBackend.prototype.setPosition = function (id, position) {
    this._assertWritable();
    var obj = this._objects()[id];
    if (!obj) throw new Error('no such node: ' + id);
    obj.position = { x: position.x, y: position.y };
  };

  // every path in the subtree rooted at `id`
  LocalBackend.prototype._subtree = function (id) {
    var objects = this._objects();
    return Object.keys(objects).filter(function (path) {
      return path === id || path.indexOf(id + '/') === 0;
    });
  };

  LocalBackend.prototype.deleteNodes = function (ids) {
    this._assertWritable();
    var objects = this._objects();
    var doomed = {};
    var self = this;
    ids.forEach(function (id) {
      self._subtree(id).forEach(function (path) { doomed[path] = true; });
    });
    Object.keys(doomed).forEach(function (path) { delete objects[path]; });
  };

  LocalBackend.prototype._relocate = function (ids, newParentId, position, keepOriginal) {
    this._assertWritable();
    var self = this;
    var objects = this._objects();
    var moved = [];

    ids.forEach(function (id) {
      var node = objects[id];
      if (!node) return;
      if (newParentId === id || newParentId.indexOf(id + '/') === 0) {
        throw new Error('cannot reparent ' + id + ' into its own subtree');
      }
      if (!self.getValidChildTypes(newParentId)[node.type]) {
        throw new Error('cannot put a "' + node.type + '" under ' +
                        newParentId + ' (not a valid child type here)');
      }

      var subtree = self._subtree(id);
      var target = self._newPath(newParentId);
      subtree.forEach(function (path) {
        var copy = JSON.parse(JSON.stringify(objects[path]));
        var newPath = target + path.slice(id.length);
        copy.path = newPath;
        copy.parentPath = path === id
          ? newParentId
          : target + objects[path].parentPath.slice(id.length);
        if (path === id && position) {
          copy.position = { x: position.x, y: position.y };
        }
        objects[newPath] = copy;
      });
      if (!keepOriginal) {
        subtree.forEach(function (path) { delete objects[path]; });
      }
      moved.push(target);
    });

    // Pointers are paths, so a relocated subtree needs them rewritten
    // -- but the two cases differ:
    //
    //   move: the original is gone, so EVERY pointer that named it
    //         has to follow, including transitions that live outside
    //         the moved subtree and point into it.
    //   copy: the original stays. Only pointers INSIDE the copy get
    //         rewritten; rewriting the rest would silently re-aim the
    //         existing model at the duplicate. Leaving the copy's own
    //         transitions pointing at the source is the bug this
    //         guards: they would dangle the moment the source is
    //         deleted.
    var scope = keepOriginal
      ? moved.reduce(function (acc, target) {
          return acc.concat(self._subtree(target));
        }, [])
      : Object.keys(objects);

    scope.forEach(function (path) {
      var node = objects[path];
      if (!node) return;
      var pointers = node.pointers || {};
      Object.keys(pointers).forEach(function (name) {
        ids.forEach(function (id, i) {
          var value = pointers[name];
          if (typeof value !== 'string') return;
          if (value === id || value.indexOf(id + '/') === 0) {
            pointers[name] = moved[i] + value.slice(id.length);
          }
        });
      });
    });
    return moved;
  };

  LocalBackend.prototype.moveNodes = function (ids, newParentId, position) {
    return this._relocate(ids, newParentId, position, false);
  };

  LocalBackend.prototype.copyNodes = function (ids, newParentId, position) {
    return this._relocate(ids, newParentId, position, true);
  };

  /* * * * * * * * * * * *  selection  * * * * * * * * * * * */

  LocalBackend.prototype.setActiveSelection = function (ids, invoker) {
    this._selection = (ids || []).slice(0);
    if (this._onSelectionChanged) this._onSelectionChanged(this._selection, invoker);
  };

  LocalBackend.prototype.getActiveSelection = function () {
    return this._selection.slice(0);
  };

  LocalBackend.prototype.onSelectionChanged = function (fn) {
    this._onSelectionChanged = fn;
  };

  return function (model, onChange) {
    return ModelBackend.assertImplements(
      new LocalBackend(model, onChange), 'LocalBackend');
  };
});
