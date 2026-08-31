/**
 * ModelBackend -- the contract the HFSM visualizer and simulator use
 * to read and change a model.
 *
 * Today the only implementation talks to WebGME's client. The point
 * of the interface is that a second one can talk to a plain JSON
 * model in the browser, so the visualizer and simulator can run in
 * the static playground with no server.
 *
 * DESIGN NOTE -- the operations are phrased as INTENT ("create a
 * child of this type", "move these nodes here"), not as a mirror of
 * WebGME's API. Mirroring it would drag WebGME concepts (meta node
 * ids, registries, territories) into every implementation; naming the
 * intent instead lets the WebGME backend do the meta lookup and lets
 * a local backend simply mint a path and set a `type`.
 *
 * NODE DESCRIPTORS
 * ----------------
 * Reads return plain descriptors -- never live model objects -- so
 * consumers never depend on a particular model store:
 *
 *   {
 *     id:           '/9/Y',        // stable node identifier
 *     type:         'State',       // META TYPE NAME, already resolved
 *     parentId:     '/9',
 *     childrenIds:  ['/9/Y/a'],
 *     isConnection: false,
 *     position:     {x, y},        // may be undefined
 *     src, dst:     '/9/Y'         // connections only
 *     ...attributes                // flattened: Event, Guard, name, ...
 *   }
 *
 * `type` being the resolved meta-type NAME is what lets consumers
 * avoid meta lookups entirely on read paths.
 *
 * MUTATIONS
 * ---------
 * Every change goes through `transact(message, fn)`. The backend is
 * free to batch the calls made inside `fn` into one undoable unit
 * (WebGME does; a local backend can emit a single change event).
 * Backends must apply either all of the operations or none.
 */
define([], function () {
  'use strict';

  var REQUIRED = [
    // reads
    'getNode', 'getChildren', 'getValidChildTypes', 'isReadOnly',
    // mutations
    'transact', 'createChild', 'setAttribute', 'setPointer',
    'setPosition', 'deleteNodes', 'moveNodes', 'copyNodes',
    // selection
    'setActiveSelection',
  ];

  return {
    /** Method names every backend must provide. */
    REQUIRED: REQUIRED,

    /**
     * Throw unless `backend` implements the whole contract. Called
     * when a backend is installed so a partial implementation fails
     * loudly at wiring time rather than mid-interaction.
     */
    assertImplements: function (backend, label) {
      var missing = REQUIRED.filter(function (m) {
        return typeof backend[m] !== 'function';
      });
      if (missing.length) {
        throw new Error((label || 'ModelBackend') +
                        ' is missing: ' + missing.join(', '));
      }
      return backend;
    },
  };
});
