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
define([], function () {
  'use strict';

  // a machine or a library is the top of a diagram; nothing draws
  // around it, so it must not report a parent to nest inside
  var ROOT_TYPES = ['State Machine', 'Library'];

  function isTransition(desc) {
    return desc.isConnection || desc.type === 'Internal Transition';
  }

  return {
    ROOT_TYPES: ROOT_TYPES,

    /**
     * @param desc  a descriptor from a ModelBackend, or null
     * @return the same object, finished (mutated in place, as the
     *         callers already own it)
     */
    finish: function (desc) {
      if (!desc) return desc;

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
