/**
 * The last step of turning a model node into the descriptor the
 * visualizer draws.
 *
 * A ModelBackend reports what a node IS; this adds what the graph
 * needs to DISPLAY it -- the edge/label text, and the fact that a
 * machine at the top has no parent to nest inside. Both hosts finish
 * their descriptors here so the two graphs read identically: a
 * transition labelled `EVENT [guard]` in WebGME is labelled the same
 * in the playground, without either side keeping its own copy of the
 * rule.
 */
define(['../metaRules'], function (metaRules) {
  'use strict';

  // a machine or a library is the top of a diagram; nothing draws
  // around it, so it must not report a parent to nest inside
  var ROOT_TYPES = ['State Machine', 'Library'];

  // tracked for the simulator (event payload definitions) but never
  // drawn in the graph
  var NON_GRAPH_TYPES = ['Event', 'Field'];

  // what a diagram can be dropped ONTO: a state, or the machine /
  // library at the top of it
  var CONTAINER_TYPES = ['State', 'State Machine', 'Library'];

  function isTransition(desc) {
    return desc.isConnection || desc.type === 'Internal Transition';
  }

  return {
    ROOT_TYPES: ROOT_TYPES,
    NON_GRAPH_TYPES: NON_GRAPH_TYPES,

    /**
     * The types a palette may offer for dropping onto the diagram.
     *
     * Three things disqualify a type, and all three produce the same
     * useless result -- a part that can be picked up and dropped and
     * then is not there:
     *
     *  - it is not a child of anything the diagram draws INTO. Only
     *    a state, a machine or a library is a container here, so a
     *    Language (which nests only in another Language) has nowhere
     *    to land.
     *  - the graph does not draw it. An Event or a Field belongs to
     *    the simulator's panels; dropped on the canvas it vanishes,
     *    and a new Event is named "Event", which is a reserved name
     *    the simulator warns about with a modal the moment it appears.
     *  - it is the top of a diagram, or a connection. A machine is
     *    what you are drawing IN, and a transition is drawn between
     *    two states with the handle, not dropped onto one.
     *
     * Derived from the metamodel rather than listed, so a type added
     * to meta.json shows up without anyone remembering to add it.
     */
    creatableTypes: function () {
      var offered = {};
      CONTAINER_TYPES.forEach(function (container) {
        Object.keys(metaRules.childRules(container)).forEach(function (type) {
          offered[type] = true;
        });
      });
      return Object.keys(offered).filter(function (type) {
        return !metaRules.isConnection(type) &&
          NON_GRAPH_TYPES.indexOf(type) === -1 &&
          ROOT_TYPES.indexOf(type) === -1;
      }).sort();
    },

    /**
     * @param desc  a descriptor from a ModelBackend, or null
     * @return the same object, finished (mutated in place, as the
     *         callers already own it)
     */
    finish: function (desc) {
      if (!desc) return desc;

      // An exported model wraps everything in a Project node. That is
      // a container for the FILE, not part of any machine -- the
      // metamodel does not describe it, and WebGME never feeds it
      // because the visualizer opens on the machine itself. Drawn, it
      // is a stray empty box floating beside the diagram. Anything
      // else the metamodel has no rules for is dropped for the same
      // reason: the graph has nothing to say about it.
      if (!metaRules.types[desc.type]) return null;

      // a transition shows its trigger, not its name
      if (isTransition(desc)) {
        desc.LABEL = desc.Event;
        if (desc.Guard) {
          desc.LABEL += ' [' + desc.Guard + ']';
        }
      } else {
        desc.LABEL = desc.name;
      }

      if (ROOT_TYPES.indexOf(desc.type) > -1) {
        desc.parentId = null;
      }
      return desc;
    },
  };
});
