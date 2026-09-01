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
define(['./ModelBackend', '../meta'], function (ModelBackend, meta) {
  'use strict';

  var TYPES = meta.types;

  // 'Project' is the exported root wrapper rather than a meta type
  // (see resolveModel); it constrains nothing.
  var UNCONSTRAINED_TYPES = ['Project'];

  // attributes every node carries, whatever its type
  var STRUCTURAL = ['path', 'type', 'parentPath', 'childPaths',
                    'pointers', 'attributes', 'position'];

  /* * * * * * * * * *  metamodel helpers  * * * * * * * * * */

  function isDescendantType(candidate, ancestor) {
    for (var cur = candidate; cur; cur = TYPES[cur] && TYPES[cur].base) {
      if (cur === ancestor) return true;
    }
    return false;
  }

  // a rule naming an abstract type admits its concrete descendants
  function concreteDescendants(name) {
    return Object.keys(TYPES).filter(function (candidate) {
      return !TYPES[candidate].isAbstract &&
        isDescendantType(candidate, name);
    });
  }

  function expand(names) {
    var out = {};
    (names || []).forEach(function (name) {
      concreteDescendants(name).forEach(function (concrete) {
        out[concrete] = true;
      });
    });
    return Object.keys(out).sort();
  }

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
    var obj = this._objects()[id];
    if (!obj) return null;
    return {
      id: id,
      name: obj.name,
      type: obj.type,
      // a local store has no separate type identity: the name IS the
      // type, and getValidChildTypes maps onto the same token
      typeId: obj.type,
    };
  };

  LocalBackend.prototype.getValidChildTypes = function (parentId) {
    var parent = this._objects()[parentId];
    var out = {};
    if (!parent || !TYPES[parent.type]) return out;
    expand(Object.keys(TYPES[parent.type].children)).forEach(function (name) {
      out[name] = name;
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
    return Object.keys(TYPES).filter(function (name) {
      var type = TYPES[name];
      if (!type.isConnection || type.isAbstract) return false;
      if (!allowedHere[name]) return false;
      return expand(type.pointers.src.targets).indexOf(src.type) > -1 &&
        expand(type.pointers.dst.targets).indexOf(dst.type) > -1;
    }).sort().map(function (name) {
      return { typeId: name, name: name };
    });
  };

  LocalBackend.prototype.getChildTypeSchemas = function (parentId) {
    var parent = this._objects()[parentId];
    if (!parent || !TYPES[parent.type]) return [];
    return expand(Object.keys(TYPES[parent.type].children)).map(function (name) {
      var type = TYPES[name];
      return {
        name: name,
        typeId: name,
        isConnection: !!type.isConnection,
        attributes: Object.keys(type.attributes).sort().map(function (attr) {
          return { name: attr, type: type.attributes[attr].type };
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

  LocalBackend.prototype.transact = function (message, fn, onComplete) {
    var result;
    this._depth++;
    try {
      result = fn();
    } catch (e) {
      this._depth--;
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

    // pointers are paths: a relocated subtree's internal transitions
    // would otherwise still name the old endpoints
    if (!keepOriginal) {
      Object.keys(objects).forEach(function (path) {
        var pointers = objects[path].pointers || {};
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
    }
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
