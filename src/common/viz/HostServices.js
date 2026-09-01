/**
 * The UI services the visualizer needs from whatever application is
 * hosting it -- the counterpart to ModelBackend.
 *
 * ModelBackend abstracts the MODEL: what the nodes are and how they
 * change. This abstracts the HOST: how to pop a context menu, how to
 * edit a block of documentation, and where dragged items come from.
 * Those are the last things in the widget that only WebGME could
 * provide, and they are the reason it could not be loaded anywhere
 * else -- a top-level dependency on `js/Controls/ContextMenu` fails
 * to resolve long before any of it runs.
 *
 * CONTEXT MENU
 * ------------
 * `contextMenu(items, onSelect, position)` where `items` is
 *
 *   { '<key>': { name: 'Move Here', icon: false }, ... }
 *
 * and `onSelect(key)` fires for the chosen entry. Insertion order is
 * the display order.
 *
 * DOCUMENTATION
 * -------------
 * `editDocument(text, onSave)` opens whatever rich-text editing the
 * host offers and calls `onSave(newText)` if the user commits. A host
 * with nothing better can fall back to a plain textarea; the widget
 * only cares that it gets the new text.
 *
 * DRAG AND DROP
 * -------------
 * `makeDroppable(element, handlers)` registers `element` as a drop
 * target for the host's palette, and returns a function that undoes
 * it (or undefined when the host has no palette to drag from -- the
 * playground draws its own).
 *
 * `handlers` are called with a NORMALIZED descriptor
 *
 *   { items: ['<node id>', ...], effects: ['<effect>', ...] }
 *
 * so the widget never sees the host's own drag payload format. The
 * ids are the host's model ids, which is what makes them meaningful
 * to the ModelBackend the widget is paired with.
 */
define([], function () {
  'use strict';

  var REQUIRED = ['contextMenu', 'editDocument', 'makeDroppable'];

  return {
    REQUIRED: REQUIRED,

    /**
     * Throw unless `services` implements the whole contract, so a
     * partial host fails at wiring time rather than the first time
     * someone right-clicks.
     */
    assertImplements: function (services, label) {
      var missing = REQUIRED.filter(function (m) {
        return typeof services[m] !== 'function';
      });
      if (missing.length) {
        throw new Error((label || 'HostServices') +
                        ' is missing: ' + missing.join(', '));
      }
      return services;
    },

    /**
     * A host that offers none of this: menus and documentation
     * editing simply do not happen, and nothing can be dragged in.
     * Useful for a read-only view, and it keeps every call site free
     * of null checks.
     */
    none: function () {
      return {
        contextMenu: function () {},
        editDocument: function () {},
        makeDroppable: function () { return undefined; },
      };
    },
  };
});
