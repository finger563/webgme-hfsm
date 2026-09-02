/**
 * Which parts of the graph an automatic layout should be run over.
 *
 * WHY THIS EXISTS
 * ---------------
 * A local transition goes from a state to one of its OWN substates,
 * and drawn as a compound graph that is an edge between a node and its
 * own descendant. cose-bilkent calls such an edge invalid
 * (`LGraphManager.includesInvalidEdge`) and, on finding one, abandons
 * the whole layout -- silently, with no error and no thrown exception:
 * `checkLayoutSuccess()` short-circuits, every node keeps the position
 * it already had, and `layoutstop` still fires as if it had worked.
 * One local transition anywhere in a machine is enough to make the
 * auto-layout button do nothing at all.
 *
 * Leaving those edges out of the layout INPUT fixes it, and costs
 * nothing: an edge to your own descendant carries no positional
 * information anyway -- containment already says where the child goes.
 * The edge is still in the graph and still drawn; it just does not
 * pull.
 *
 * This is kept out of the widget, and free of cytoscape, so it can be
 * tested without a browser.
 */
define([], function () {
  'use strict';

  /**
   * @param graph  { nodes: [{ id, parent }], edges: [{ id, source, target }] }
   * @return the ids of the edges to leave out, in input order
   */
  function excludedEdges(graph) {
    var parentOf = {};
    (graph.nodes || []).forEach(function (node) {
      parentOf[node.id] = node.parent || null;
    });

    function isAncestorOf(maybeAncestor, id) {
      var at = parentOf[id];
      while (at) {
        if (at === maybeAncestor) return true;
        at = parentOf[at];
      }
      return false;
    }

    return (graph.edges || []).filter(function (edge) {
      return isAncestorOf(edge.source, edge.target) ||
             isAncestorOf(edge.target, edge.source);
    }).map(function (edge) {
      return edge.id;
    });
  }

  return {
    excludedEdges: excludedEdges,
  };
});
