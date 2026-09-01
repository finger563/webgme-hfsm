/**
 * HostServices over the WebGME client UI.
 *
 * This and WebGMEBackend are the only files under HFSMViz/ that know
 * about WebGME: the backend for the model, this for the surrounding
 * application. Everything WebGME-only that used to be a top-level
 * dependency of the widget -- its context menu, its document editor,
 * its part-browser drag and drop -- lives here, which is what lets
 * the widget itself load in a host that has none of them.
 *
 * See src/common/viz/HostServices.js for the contract.
 */
define([
  'hfsm/viz/HostServices',
  'js/Constants',
  'js/Controls/ContextMenu',
  'js/DragDrop/DropTarget',
  'js/DragDrop/DragConstants',
  'decorators/DocumentDecorator/DiagramDesigner/DocumentEditorDialog',
], function (HostServices, CONSTANTS, ContextMenu, dropTarget,
             DROP_CONSTANTS, DocumentEditorDialog) {
  'use strict';

  /**
   * @param client        the WebGME client, for branch events
   * @param webgmeGlobal  WebGMEGlobal, for the shared selection state
   */
  function WebGMEHost(client, webgmeGlobal) {
    this._client = client;
    this._global = webgmeGlobal;
  }

  WebGMEHost.prototype.contextMenu = function (items, onSelect, position) {
    var menu = new ContextMenu({
      items: items,
      callback: function (key) {
        if (onSelect) onSelect(key);
      },
    });
    menu.show(position || { x: 200, y: 200 });
  };

  WebGMEHost.prototype.editDocument = function (text, onSave) {
    var dialog = new DocumentEditorDialog();
    dialog.initialize(text, onSave);
    dialog.show();
  };

  // WebGME's drag payload keys its lists by constants; the widget is
  // given the plain { items, effects } the contract promises
  function normalize(dragInfo) {
    if (!dragInfo) return { items: [], effects: [] };
    return {
      items: dragInfo[DROP_CONSTANTS.DRAG_ITEMS] || [],
      effects: dragInfo[DROP_CONSTANTS.DRAG_EFFECTS] || [],
    };
  }

  WebGMEHost.prototype.makeDroppable = function (element, handlers) {
    dropTarget.makeDroppable(element, {
      over: function (event, dragInfo) {
        if (handlers.over) handlers.over(event, normalize(dragInfo));
      },
      out: function (event, dragInfo) {
        if (handlers.out) handlers.out(event, normalize(dragInfo));
      },
      drop: function (event, dragInfo) {
        if (handlers.drop) handlers.drop(event, normalize(dragInfo));
      },
    });
    return function () {
      dropTarget.destroyDroppable(element);
    };
  };

  /**
   * Optional in the contract: branch changes and the shared
   * active-selection state are properties of the WebGME application,
   * not of the model. A host without either simply does not provide
   * this, and the widget skips it.
   *
   * @return a function that unsubscribes everything
   */
  WebGMEHost.prototype.observe = function (handlers) {
    var self = this;
    var client = this._client;
    var selectionEvent = 'change:' + CONSTANTS.STATE_ACTIVE_SELECTION;
    var onSelection = function (model, selection, opts) {
      if (handlers.selectionChanged) handlers.selectionChanged(model, selection, opts);
    };
    var onBranch = function (args) {
      if (handlers.branchChanged) handlers.branchChanged(args);
    };
    var onBranchStatus = function (args) {
      if (handlers.branchStatusChanged) handlers.branchStatusChanged(args);
    };

    if (this._global && this._global.State) {
      this._global.State.on(selectionEvent, onSelection, this);
    }
    if (client) {
      client.addEventListener(client.CONSTANTS.BRANCH_CHANGED, onBranch);
      client.addEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, onBranchStatus);
    }

    return function () {
      if (self._global && self._global.State) {
        self._global.State.off(selectionEvent, onSelection, self);
      }
      if (client) {
        client.removeEventListener(client.CONSTANTS.BRANCH_CHANGED, onBranch);
        client.removeEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, onBranchStatus);
      }
    };
  };

  return function (client, webgmeGlobal) {
    return HostServices.assertImplements(
      new WebGMEHost(client, webgmeGlobal), 'WebGMEHost');
  };
});
