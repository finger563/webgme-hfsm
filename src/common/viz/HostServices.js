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
 *
 * GENERATED CODE (optional)
 * -------------------------
 * `generated()` returns `{ files: { '<name>': '<text>' }, model }`
 * for whatever the host last generated, or null.
 *
 * BOTH, together, on purpose. The code editor uses this to show a
 * snippet inside the function it will be compiled into -- see
 * `codeContext` -- and locating it means knowing what the snippet
 * held WHEN THE CODE WAS GENERATED, not what is being typed now. A
 * host that handed over files and left the model to be fetched
 * separately would eventually pair one with the other's, and a frame
 * measured against the wrong model is worse than no frame.
 *
 * OPTIONAL because where generated code comes from is genuinely a
 * property of the host: the playground generates in the page and has
 * both sitting there, while in WebGME the plugin runs on the server
 * and the visualizer has never seen its output. A host that returns
 * null loses the frame and nothing else.
 */
define([], function () {
  'use strict';

  var REQUIRED = ['contextMenu', 'editDocument', 'makeDroppable'];

  // Not in REQUIRED on purpose: a host that cannot answer these is
  // not a broken host, and failing at wiring time over one would
  // stop the widget loading somewhere it otherwise works.
  var OPTIONAL = ['generated'];

  return {
    REQUIRED: REQUIRED,
    OPTIONAL: OPTIONAL,

    /**
     * Ask a host for something optional, without every call site
     * having to check whether it is there.
     *
     * @return what the service returned, or `fallback` when the host
     *         does not implement it or the call throws -- a host
     *         failing to produce generated code must not take the
     *         editor down with it
     */
    ask: function (services, method, args, fallback) {
      if (!services || typeof services[method] !== 'function') return fallback;
      try {
        var answer = services[method].apply(services, args || []);
        return answer === undefined || answer === null ? fallback : answer;
      } catch (e) {
        console.error('HostServices.' + method + ' failed: ', e);
        return fallback;
      }
    },

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
        generated: function () { return null; },
      };
    },
  };
});
