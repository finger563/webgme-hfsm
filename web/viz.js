/**
 * Mounts the HFSM visualizer -- the SAME widget and simulator WebGME
 * runs -- over a plain JSON model in the playground.
 *
 * There is no WebGME here: no client, no territories, no server. The
 * widget takes its model through a ModelBackend and its UI services
 * through HostServices, so all this has to supply is a LocalBackend
 * over the parsed JSON and a host that offers nothing (the playground
 * is read-only for now -- editing is the next step).
 *
 * The node feed mirrors what the WebGME control does: build a
 * descriptor per object and hand each to the widget, which sorts out
 * the ordering itself through its own dependency tracking.
 */
define([
  'jquery',
  'underscore',
  'bower/cytoscape/dist/cytoscape.min',
  'bower/cytoscape-cose-bilkent/cytoscape-cose-bilkent',
  'cytoscape-edgehandles',
  'cytoscape-context-menus',
  'cytoscape-panzoom',
  'hfsm/resolveModel',
  'hfsm/viz/LocalBackend',
  'hfsm/viz/HostServices',
  'hfsm/viz/describe',
  'hfsm/exportModel',
  'widgets/HFSMViz/HFSMVizWidget',
  // the dialogs are bootstrap modals; nothing imports it, so it is
  // listed here to guarantee it is on the page before one opens
  'bootstrap',
], function ($, _, cytoscape, coseBilkent, edgehandles, contextMenus, panzoom,
             resolveModel, LocalBackend, HostServices, describe, exportModel,
             HFSMVizWidget) {
  'use strict';

  // Cytoscape's extensions are UMD bundles that EXPORT a register
  // function and self-register only against a global `cytoscape`.
  // Loaded as AMD modules there is no global, so nothing registers
  // them. WebGME gets away without this because cytoscape is a global
  // there.
  //
  // Each register function takes DIFFERENT arguments, and they fail
  // quietly when they do not get them -- edgehandles without its
  // debounce/throttle leaves a drag that never ends, so a click picks
  // a node up and never puts it down. Getting these wrong costs an
  // afternoon, so they are spelled out one at a time rather than
  // looped over.
  coseBilkent(cytoscape);
  edgehandles(cytoscape, _.debounce.bind(_), _.throttle.bind(_));
  contextMenus(cytoscape, $);
  panzoom(cytoscape, $);

  // The widget forks a logger; console is close enough for a page
  // with no logging framework behind it.
  function makeLogger(name) {
    function noop() {}
    return {
      fork: function (child) { return makeLogger(name + ':' + child); },
      debug: noop,
      info: noop,
      warn: function () { console.warn.apply(console, arguments); },
      error: function () { console.error.apply(console, arguments); },
    };
  }

  var widget = null;
  var backend = null;
  var model = null;

  function destroy() {
    if (widget) {
      try { widget.destroy(); } catch (e) { console.error(e); }
      widget = null;
      backend = null;
      model = null;
    }
  }

  /**
   * @param container  the element to draw into
   * @param rawModel   the model as parsed from the editor; resolved
   *                   here so the diagram shows exactly what the
   *                   generator would consume, ill-typed models
   *                   included -- they throw, and the caller reports
   * @return the LocalBackend, so callers can read the model back
   */
  function mount(container, rawModel) {
    destroy();

    // resolve a COPY: resolveModel fills in parents, defaults and
    // childPaths in place, and the caller's object is the user's
    model = JSON.parse(JSON.stringify(rawModel));
    resolveModel.resolve(model);

    backend = LocalBackend(model);
    widget = new HFSMVizWidget(
      makeLogger('HFSMViz'), $(container), null,
      function () { return backend; },
      HostServices.none()
    );

    // Feed the graph. Order does not matter: the widget defers any
    // node whose parent or endpoints have not arrived yet.
    var anyPositions = false;
    Object.keys(model.objects).sort().forEach(function (path) {
      if (model.objects[path].position) anyPositions = true;
      var desc = describe.finish(backend.getNode(path));
      if (desc) widget.addNode(desc);
    });

    // A model authored by hand -- or exported by the CLI -- carries no
    // layout, so every node would sit at (0, 0) in a heap. WebGME
    // models have positions because the editor saved them; here we
    // compute one instead. If the model DOES carry positions they are
    // the author's and are left alone.
    if (!anyPositions) {
      // breadthfirst, not the toolbar's cose-bilkent: a state machine
      // reads as a flow from its initial state, and the force-directed
      // layout has nothing but edges to go on, so it piles the nested
      // compound boxes on top of each other.
      widget.reLayout({
        name: 'breadthfirst',
        directed: true,
        spacingFactor: 1.1,
        animate: false,
        fit: true,
        padding: 30,
      });
    }

    // the feed is over, so the warnings it produced along the way --
    // about a model that was still arriving -- are no longer true
    widget.clearSimulationLog();

    return backend;
  }

  /**
   * Re-measure after the container changed size. Cytoscape draws on a
   * canvas sized at creation, so without this the graph keeps the
   * dimensions it had when the pane was a different width.
   */
  function resize() {
    if (widget && widget._cy) {
      widget._cy.resize();
    }
  }

  /**
   * The model as it now stands, positions included -- dragging a
   * state writes straight through the backend, so this is how that
   * work gets back out to somewhere it can be saved.
   */
  function currentModelJSON() {
    if (!backend || !widget || !widget._cy) return null;

    // Take the positions from the GRAPH, not just from whatever was
    // dragged. A model that arrived without a layout was arranged
    // automatically, and that arrangement is just as much "how the
    // diagram looks" as a drag is -- saving only the drags would
    // leave the next load to arrange it all over again, differently.
    widget._cy.nodes().forEach(function (node) {
      var object = model.objects[node.id()];
      if (!object) return;
      var p = node.position();
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        object.position = { x: p.x, y: p.y };
      }
    });

    return exportModel.toJSON(model, {});
  }

  return {
    mount: mount,
    destroy: destroy,
    resize: resize,
    currentModelJSON: currentModelJSON,
    /** the mounted widget, for the page to resize / refresh */
    current: function () { return widget; },
  };
});
