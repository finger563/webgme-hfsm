/**
 * ModelBackend implementation over the WebGME client.
 *
 * This is the only place in the visualizer that knows about WebGME's
 * client API: territories, meta nodes, registries, transactions.
 * Everything else works against the ModelBackend contract, so the
 * same widget and simulator can run against a plain JSON model in
 * the browser.
 *
 * See src/common/viz/ModelBackend.js for the contract.
 */
define([
  'hfsm/viz/ModelBackend',
  'js/Utils/GMEConcepts',
  'js/Constants',
], function (ModelBackend, GMEConcepts, CONSTANTS) {
  'use strict';

  /**
   * @param client      the WebGME client
   * @param getNodes    () -> the widget's descriptor table, used for
   *                    reads so display paths never hit the client
   *                    for data the descriptors already carry
   * @param webgmeGlobal WebGMEGlobal (injected so this file has no
   *                    hard dependency on the global for testing)
   */
  function WebGMEBackend(client, getNodes, webgmeGlobal) {
    this._client = client;
    this._getNodes = getNodes || function () { return {}; };
    this._global = webgmeGlobal;
    GMEConcepts.initialize(client);
  }

  /* * * * * * * * * * *  reads  * * * * * * * * * * */

  WebGMEBackend.prototype.getNode = function (id) {
    return this._getNodes()[id] || null;
  };

  WebGMEBackend.prototype.getChildren = function (id) {
    var nodes = this._getNodes();
    var desc = nodes[id];
    if (!desc || !desc.childrenIds) return [];
    return desc.childrenIds.map(function (cid) {
      return nodes[cid];
    }).filter(Boolean);
  };

  /**
   * `{id, name, type}` for any id the client knows -- including nodes
   * outside the visualizer's territory, which is what drag-and-drop
   * from the part browser needs.
   */
  WebGMEBackend.prototype.getNodeInfo = function (id) {
    var node = this._client.getNode(id);
    if (!node) return null;
    var metaNode = this._client.getNode(node.getMetaTypeId());
    return {
      id: id,
      name: node.getAttribute('name'),
      type: metaNode ? metaNode.getAttribute('name') : undefined,
      typeId: node.getMetaTypeId(),
    };
  };

  /**
   * @return {Object} { typeName: metaId } for types that may still be
   *   created under `parentId`
   */
  WebGMEBackend.prototype.getValidChildTypes = function (parentId) {
    var client = this._client;
    var node = client.getNode(parentId);
    var out = {};
    if (!node) return out;
    var valid = node.getValidChildrenTypesDetailed(null, true);
    Object.keys(valid).forEach(function (metaId) {
      var metaNode = client.getNode(metaId);
      if (metaNode && valid[metaId] && !metaNode.isAbstract()) {
        out[metaNode.getAttribute('name')] = metaId;
      }
    });
    return out;
  };

  WebGMEBackend.prototype.isReadOnly = function () {
    return this._client.isReadOnly();
  };

  // what a "create a child here" form needs: the creatable types
  // under `parentId` and, for each, its attributes
  WebGMEBackend.prototype.getChildTypeSchemas = function (parentId) {
    var client = this._client;
    var node = client.getNode(parentId);
    if (!node) return [];
    var valid = node.getValidChildrenTypesDetailed();
    return Object.keys(valid).map(function (metaId) {
      var meta = client.getNode(metaId);
      if (!meta || !valid[metaId] || meta.isAbstract()) return null;
      return {
        name: meta.getAttribute('name'),
        typeId: metaId,
        isConnection: meta.isConnection(),
        attributes: meta.getAttributeNames().sort().map(function (attr) {
          var attrMeta = meta.getAttributeMeta(attr) || {};
          return { name: attr, type: attrMeta.type };
        }),
      };
    }).filter(Boolean);
  };

  WebGMEBackend.prototype.getAttribute = function (id, name) {
    var node = this._client.getNode(id);
    return node ? node.getAttribute(name) : undefined;
  };

  // which connection meta-types may join src -> dst inside parent
  WebGMEBackend.prototype.getValidConnectionTypes = function (srcId, dstId, parentId) {
    var client = this._client;
    var ids = GMEConcepts.getValidConnectionTypesInAspect(
      srcId, dstId, parentId, CONSTANTS.ASPECT_ALL) || [];
    return ids.map(function (typeId) {
      var node = client.getNode(typeId);
      return { typeId: typeId, name: node ? node.getAttribute('name') : undefined };
    }).filter(function (entry) { return !!entry.name; });
  };

  /* * * * * * * * * *  mutations  * * * * * * * * * */

  WebGMEBackend.prototype.transact = function (message, fn) {
    var client = this._client;
    client.startTransaction(message || '');
    var result;
    try {
      result = fn();
    } catch (e) {
      // still close the transaction: leaving it open would wedge
      // every later edit in the session
      client.completeTransaction('');
      throw e;
    }
    client.completeTransaction(message || '');
    return result;
  };

  WebGMEBackend.prototype.createChild = function (parentId, typeName, opts) {
    opts = opts || {};
    var metaId = this.getValidChildTypes(parentId)[typeName];
    if (!metaId) {
      throw new Error('cannot create a "' + typeName + '" under ' + parentId +
                      ' (not a valid child type here)');
    }
    var params = { parentId: parentId, baseId: metaId };
    if (opts.position) params.position = opts.position;
    return this._client.createChild(params, opts.message || ('Creating ' + typeName));
  };

  /**
   * Create nodes inheriting from `baseIds`. WebGME supports this
   * natively; see the contract for what other stores may do instead.
   */
  WebGMEBackend.prototype.createInstances = function (parentId, baseIds, position) {
    var client = this._client;
    return baseIds.map(function (baseId) {
      var params = { parentId: parentId, baseId: baseId };
      if (position) params.position = position;
      return client.createChild(params);
    });
  };

  WebGMEBackend.prototype.setAttribute = function (id, name, value, message) {
    this._client.setAttribute(id, name, value, message);
  };

  WebGMEBackend.prototype.setPointer = function (id, name, targetId) {
    this._client.setPointer(id, name, targetId);
  };

  WebGMEBackend.prototype.setPosition = function (id, position) {
    this._client.setRegistry(id, 'position', position);
  };

  WebGMEBackend.prototype.deleteNodes = function (ids) {
    var client = this._client;
    ids.forEach(function (id) { client.deleteNode(id); });
  };

  // moveMoreNodes / copyMoreNodes take a flat object keyed by node id
  // whose values carry a registry patch -- NOT a nested `ids` map.
  function relocationParams(ids, newParentId, position) {
    var params = { parentId: newParentId };
    ids.forEach(function (id) {
      params[id] = { registry: { position: position || {} } };
    });
    return params;
  }

  WebGMEBackend.prototype.moveNodes = function (ids, newParentId, position) {
    this._client.moveMoreNodes(relocationParams(ids, newParentId, position));
  };

  WebGMEBackend.prototype.copyNodes = function (ids, newParentId, position) {
    this._client.copyMoreNodes(relocationParams(ids, newParentId, position));
  };

  /* * * * * * * * * *  selection  * * * * * * * * * */

  WebGMEBackend.prototype.setActiveSelection = function (ids, invoker) {
    if (this._global && this._global.State) {
      this._global.State.registerActiveSelection(ids.slice(0), { invoker: invoker });
    }
  };

  return function (client, getNodes, webgmeGlobal) {
    return ModelBackend.assertImplements(
      new WebGMEBackend(client, getNodes, webgmeGlobal), 'WebGMEBackend');
  };
});
