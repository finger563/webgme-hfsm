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
 * getNodeInfo(id) vs getNode(id)
 * -----------------------------
 * `getNode` returns a descriptor from what the view currently holds.
 * `getNodeInfo` answers `{id, name, type, typeId}` for ANY id the store
 * knows -- including nodes outside the view, such as the palette
 * entries WebGME's part browser drags in. Drag-and-drop needs the
 * latter; everything else should prefer the former.
 *
 * `typeId` is an opaque token identifying the type itself -- the same
 * token `getValidChildTypes` maps a type NAME onto. Backends whose
 * types are just names may return the name; the only requirement is
 * that the two agree, so a dragged node can be matched against what
 * its would-be parent accepts.
 *
 * getChildTypeSchemas(parentId)
 * ----------------------------
 * Everything a "create a child here" form needs, in one read:
 *
 *   [{ name, typeId, isConnection,
 *      attributes: [{ name, type, defaultValue }] }]
 *
 * The dialog decides what to show from this; it never sees a meta
 * node. `type` is the attribute's declared type ('string', 'boolean',
 * 'float', ...) so a form can pick an input widget for it, and
 * `defaultValue` is what a newly created node of that type starts
 * with -- a form must SHOW it, or every field the user leaves alone
 * gets written back as empty over the default.
 *
 * getNodeSchema(id)
 * -----------------
 * The same shape, for the type a node ALREADY has:
 *
 *   { name, typeId, isConnection,
 *     attributes: [{ name, type, defaultValue }] }
 *
 * `getChildTypeSchemas` cannot answer this. It is scoped to a parent
 * and filtered by cardinality, so the schema of the one Initial a
 * state is allowed has already been excluded from its parent's list
 * by the time that Initial exists. Editing an existing node needs to
 * know what attributes it has -- and their declared types -- without
 * asking whether another one could be created.
 *
 * Returns null for an id the store does not know.
 *
 * getAttribute(id, name) reads one attribute off a node -- the escape
 * hatch for the few callers that need a value the descriptors do not
 * carry (e.g. comparing a form field against what a node already has
 * before writing it).
 *
 * MUTATIONS
 * ---------
 * Every change goes through `transact(message, fn, onComplete)`. The
 * backend is free to batch the calls made inside `fn` into one unit
 * (WebGME does; a local backend can emit a single change event).
 *
 * A backend SHOULD apply either all of the operations or none.
 * LocalBackend does, by snapshotting. WebGMEBackend cannot: the
 * WebGME client has no way to abort an open transaction, so if the
 * body throws, whatever it had already done is committed (and stays
 * undoable by the user). Both report the failure through
 * `onComplete`, so a caller can tell success from a partial edit
 * even where it cannot be prevented.
 *
 * `transact` returns whatever `fn` returned, and the ids in it are
 * usable at once. Whether the change was actually PERSISTED may only
 * be known later, so `onComplete(err)` is optional and called when
 * the store has settled: pass it when a caller must not commit UI
 * state (clearing a pending-edit buffer, closing a dialog) to a
 * change the store went on to reject.
 *
 * `createInstances` exists because WebGME can create a node that
 * INHERITS from an existing one. A store without prototypal
 * inheritance may implement it as a deep copy -- callers must not
 * assume the result stays linked to its base.
 */
define([], function () {
  'use strict';

  var REQUIRED = [
    // reads
    'getNode', 'getChildren', 'getNodeInfo', 'getValidChildTypes',
    'getValidConnectionTypes', 'getChildTypeSchemas', 'getNodeSchema',
    'getAttribute', 'isReadOnly',
    // mutations
    'transact', 'createChild', 'createInstances', 'setAttribute',
    'setPointer', 'setPosition', 'deleteNodes', 'moveNodes', 'copyNodes',
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
