/**
 * The playground's part palette.
 *
 * WebGME has a part browser fed by the project's meta aspect. Here
 * the metamodel is `src/common/meta.json`, generated from the same
 * WebGME project (scripts/gen-meta.js) and already the thing that
 * decides what LocalBackend will let you create -- so the palette is
 * derived from it rather than listed by hand. A type added to the
 * metamodel shows up here without anyone remembering to add it.
 *
 * A palette entry is dragged onto the graph, and what identifies it
 * is the TYPE NAME: the widget hands that straight to
 * `backend.getNodeInfo`, which answers for type names as well as for
 * objects. Nothing here needs to know how a node gets created.
 */
define(['jquery', 'hfsm/viz/describe'], function ($, describe) {
  'use strict';

  // What may be offered is a display rule, not a palette rule: it is
  // the same question as "does the diagram draw this", which both
  // hosts have to agree on. `describe` owns it.
  var creatableTypes = describe.creatableTypes;

  /**
   * @param container  where to build it
   * @param host       the PlaygroundHost, which owns the drag
   * @return a function that takes the palette down
   */
  function build(container, host) {
    var root = $('<div class="viz-palette" role="toolbar" ' +
                 'aria-label="Model parts"></div>');
    $('<span class="viz-palette-label">Drag to add:</span>').appendTo(root);

    creatableTypes().forEach(function (type) {
      $('<button type="button" class="viz-part"></button>')
        .text(type)
        .attr('title', 'Drag ' + type + ' onto a state to add one')
        .on('mousedown', function (event) {
          // left button only, and never the browser's own drag
          if (event.which !== 1) return;
          event.preventDefault();
          host.startDrag({ items: [type], effects: [] }, event, type);
        })
        .appendTo(root);
    });

    $(container).append(root);
    return function () { root.remove(); };
  }

  return {
    creatableTypes: creatableTypes,
    build: build,
  };
});
