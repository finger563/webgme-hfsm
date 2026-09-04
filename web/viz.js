/**
 * Mounts the HFSM visualizer -- the SAME widget and simulator WebGME
 * runs -- over a plain JSON model in the playground.
 *
 * There is no WebGME here: no client, no territories, no server. The
 * widget takes its model through a ModelBackend and its UI services
 * through HostServices, so all this supplies is a LocalBackend over
 * the parsed JSON and a host built out of plain DOM.
 *
 * The node feed mirrors what the WebGME control does: build a
 * descriptor per object and hand each to the widget, which sorts out
 * the ordering itself through its own dependency tracking. Where the
 * control is told exactly what changed by a territory, here the
 * difference is worked out after each committed transaction -- see
 * `sync`.
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
  'hfsm/viz/describe',
  'hfsm/exportModel',
  'hfsm/diffModel',
  'widgets/HFSMViz/HFSMVizWidget',
  './host',
  './palette',
  // the dialogs are bootstrap modals; nothing imports it, so it is
  // listed here to guarantee it is on the page before one opens
  'bootstrap',
], function ($, _, cytoscape, coseBilkent, edgehandles, contextMenus, panzoom,
             resolveModel, LocalBackend, describe, exportModel, diffModel,
             HFSMVizWidget, PlaygroundHost, palette) {
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
  var host = null;
  var removePalette = null;
  // what the widget was last told about each object, so a change can
  // be turned into the add / update / remove calls it expects
  var shown = {};
  var onModelEdited = null;
  var onSplitChanged = null;
  var generated = null;

  function destroy() {
    if (removePalette) {
      try { removePalette(); } catch (e) { console.error(e); }
      removePalette = null;
    }
    if (host) {
      try { host.destroy(); } catch (e) { console.error(e); }
      host = null;
    }
    if (widget) {
      try { widget.destroy(); } catch (e) { console.error(e); }
    }
    shown = {};
    // cleared whatever happened above, and whether or not a widget
    // was ever built: `mount` sets the backend before the widget, so
    // a constructor that throws part-way would otherwise leave this
    // module holding a model nothing is showing.
    widget = null;
    backend = null;
    model = null;
  }

  /**
   * Bring the graph in line with the model.
   *
   * WebGME's control is told exactly which nodes loaded, changed or
   * went away, by the territory it opened. A LocalBackend transaction
   * only reports THAT something committed, so the difference is
   * worked out here by comparing each object's descriptor against
   * what the widget was last given. At the size of a state machine
   * that costs nothing, and it means both hosts drive the widget
   * through the same three calls rather than editing needing a
   * second update path of its own.
   *
   * @return how many drawable objects have no position, which is what
   *         decides whether a freshly loaded model gets laid out
   */
  function sync(opts) {
    if (!widget || !backend) return 0;
    var quiet = !!(opts && opts.quiet);
    var unpositioned = 0;
    var present = {};

    Object.keys(model.objects).sort().forEach(function (path) {
      var desc = describe.finish(backend.getNode(path));
      if (!desc) return;
      present[path] = true;
      // an edge is drawn from its endpoints, so only the boxes need a
      // position of their own
      if (!desc.isConnection && !model.objects[path].position) {
        unpositioned++;
      }
      var current = JSON.stringify(desc);
      if (!(path in shown)) {
        shown[path] = current;
        widget.addNode(desc);
      } else if (shown[path] !== current) {
        shown[path] = current;
        widget.updateNode(desc);
      }
    });

    Object.keys(shown).forEach(function (path) {
      if (present[path]) return;
      delete shown[path];
      widget.removeNode(path);
    });

    if (!quiet && onModelEdited) onModelEdited();
    return unpositioned;
  }

  /**
   * @param container  the element to draw into
   * @param rawModel   the model as parsed from the editor; resolved
   *                   here so the diagram shows exactly what the
   *                   generator would consume, ill-typed models
   *                   included -- they throw, and the caller reports
   * @return the LocalBackend, so callers can read the model back
   */
  /**
   * @param opts  { readOnly } -- a comparison is read-only, because
   *              what is drawn is a UNION of two machines and an edit
   *              would land in neither of them
   */
  function mount(container, rawModel, opts) {
    opts = opts || {};
    destroy();

    // resolve a COPY: resolveModel fills in parents, defaults and
    // childPaths in place, and the caller's object is the user's
    model = JSON.parse(JSON.stringify(rawModel));
    resolveModel.resolve(model);

    host = PlaygroundHost();
    host.setGenerated(generated);
    // the backend reports every committed transaction; that is the
    // only notice the graph gets that the model has been edited
    backend = LocalBackend(model, sync);
    if (opts.readOnly) backend.setReadOnly(true);

    // The palette sits above the diagram, and the widget gets a
    // container of its own: it draws into an absolutely positioned
    // element filling whatever it is given, so it cannot share a box
    // with anything else.
    var root = $(container).empty();
    // No palette while comparing: the parts would drop into a union
    // of two machines that is not either of them, and a backend that
    // refuses the edit leaves a part that can be picked up and not
    // put down. Offering nothing is clearer than offering something
    // that cannot work.
    if (!opts.readOnly) removePalette = palette.build(root, host);
    var widgetHost = $('<div class="viz-host"></div>').appendTo(root);

    widget = new HFSMVizWidget(
      makeLogger('HFSMViz'), widgetHost, null,
      function () { return backend; },
      host
    );
    widget.onSplitChanged(function () {
      if (onSplitChanged) onSplitChanged();
    });

    // A state machine reads as a flow from its initial state, so
    // breadthfirst suits it. The toolbar offers every other layout the
    // page has registered, cose-bilkent included -- see
    // `layoutInput` for why that one needs the local transitions kept
    // out of its input before it will run at all.
    widget.setLayoutOptions({
      name: 'breadthfirst',
      directed: true,
      spacingFactor: 1.1,
      animate: false,
      fit: true,
      padding: 30,
    });

    // The same toolbar WebGME's panel installs -- print the graph to
    // a PNG, zoom to fit, run the auto-layout. The widget builds the
    // buttons and wires them; all a host does is say where they go,
    // so there is no second copy of any of it here.
    var toolbar = $('<div class="viz-toolbar"></div>');
    $(container).find('#hfsmVizRight').first().append(toolbar);
    widget._addSplitPanelToolbarBtns(toolbar);

    // Feed the graph. Order does not matter: the widget defers any
    // node whose parent or endpoints have not arrived yet.
    var unpositioned = sync({ quiet: true });

    // A model authored by hand -- or exported by the CLI -- carries no
    // layout, so every node would sit at (0, 0) in a heap. WebGME
    // models have positions because the editor saved them; here we
    // compute one instead. If every drawable node carries a position
    // it is the author's, and it is left alone.
    //
    // A PARTIALLY positioned model is arranged too, rather than only
    // when nothing is placed: cytoscape's layouts move everything
    // they are handed, so there is no placing just the nodes that are
    // missing coordinates. Of the two whole-graph answers, arranging
    // it all at least produces a readable diagram, where honouring a
    // partial layout would leave the rest stacked on top of each
    // other at (0, 0).
    if (unpositioned) {
      widget.reLayout();
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
    //
    // Serialized from a COPY, and through the widget's own
    // conversion. This used to write `node.position()` -- cytoscape's
    // CENTRE -- straight into the mounted model, which means the
    // TOP-LEFT and is the model the widget is running on. So every
    // save moved every node by half its own size, and the page saves
    // after each edit: the model then disagreed with the graph by
    // that much, and the NEXT drag saw the difference and
    // "corrected" it. The first drag looked right and the second
    // shifted the whole diagram.
    var out = JSON.parse(JSON.stringify(model));
    widget._cy.nodes().forEach(function (node) {
      var object = out.objects[node.id()];
      if (!object) return;
      var p = widget.cyPosition(node);   // top-left, as the model means it
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        object.position = { x: p.x, y: p.y };
      }
    });

    return exportModel.toJSON(out, {});
  }

  return {
    mount: mount,
    destroy: destroy,

    /**
     * Where the diagram's two draggable splits sit, and how to put
     * them back -- the page remembers them, the widget just reports
     * them. Null before anything is mounted.
     */
    splitSizes: function () {
      return widget ? widget.getSplitSizes() : null;
    },
    setSplitSizes: function (sizes) {
      if (widget) widget.setSplitSizes(sizes);
    },
    /** called when the user finishes dragging either of them */
    onSplitChanged: function (fn) { onSplitChanged = fn; },

    /**
     * Draw two machines at once: the newer one, with whatever the
     * older one had and it does not, marked up.
     *
     * Read-only on purpose. The model being drawn belongs to neither
     * side -- it is a union built for the picture -- so an edit would
     * be written somewhere nobody can save from.
     *
     * @return {
     *   summary  { added, removed, changed, moved, same }
     *   entries  one per object, each carrying a `unionPath`: where
     *            it ended up in the drawing, which is what a change
     *            list must use to point the diagram at it
     *   status   { '<union path>': '<status>' }, what the diagram was
     *            coloured by
     *   dropped  paths of edges too broken to draw -- said out loud
     *            rather than silently left out
     * }
     */
    compare: function (container, beforeModel, afterModel) {
      var diff = diffModel.diff(beforeModel, afterModel);
      var union = diffModel.union(beforeModel, afterModel, diff);
      mount(container, union.model, { readOnly: true });
      if (widget) widget.setDiff(union.status);
      return { summary: diff.summary, entries: diff.entries,
               dropped: union.dropped, status: union.status };
    },

    /** put the marks back after anything that rebuilt the elements */
    reapplyDiff: function (status) {
      if (widget) widget.setDiff(status);
    },

    comparing: function () { return !!(widget && widget.hasDiff()); },

    /** fit the graph into whatever the page has not covered up */
    fitClearOf: function (cover) {
      if (widget) widget.fitClearOf(cover);
    },

    /**
     * Bring an element to the middle of the view and select it, so a
     * change list can be clicked through.
     */
    reveal: function (path) {
      return widget ? widget.reveal(path) : false;
    },

    /**
     * How the code editor gets generated code to frame a snippet
     * with. A FUNCTION, called when a snippet is opened, so the page
     * can answer for the model as it stands at that moment rather
     * than as it stood when Generate was last pressed.
     *
     * Kept across mounts, since it does not belong to any one of them.
     *
     * @param provider  () => { files, model } | { problem } | null
     */
    setGenerated: function (provider) {
      generated = (typeof provider === 'function') ? provider : null;
      if (host) host.setGenerated(generated);
    },

    /**
     * Called after every committed edit, so the page can write the
     * model back into the editor. The diagram is an editor now, and
     * the text beside it has to say the same thing.
     */
    onModelEdited: function (fn) { onModelEdited = fn; },
    resize: resize,
    currentModelJSON: currentModelJSON,
    /** the mounted widget, for the page to resize / refresh */
    current: function () { return widget; },
  };
});
