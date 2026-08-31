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
define(['hfsm/viz/ModelBackend'], function (ModelBackend) {
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

  WebGMEBackend.prototype.moveNodes = function (ids, newParentId, position) {
    var map = {};
    ids.forEach(function (id) { map[id] = position || {}; });
    this._client.moveMoreNodes({ parentId: newParentId, ids: map });
  };

  WebGMEBackend.prototype.copyNodes = function (ids, newParentId, position) {
    var map = {};
    ids.forEach(function (id) { map[id] = position || {}; });
    this._client.copyMoreNodes(Object.assign({ parentId: newParentId }, map));
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
