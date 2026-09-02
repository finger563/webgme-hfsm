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

  /**
   * Attributes that hold C++ rather than a value.
   *
   * The metamodel calls all of them 'string', because to the model
   * they are; but a one-line input for an Entry block is the reason
   * editing a machine through a property grid is miserable. This is
   * exactly the set the generator emits as a code block, each behind
   * a `//::::<path>::::<attribute>::::` marker -- so it is also the
   * set whose text can be located in the generated file.
   */
  var CODE_ATTRIBUTES = [
    'Action', 'Declarations', 'Definitions', 'Entry', 'Exit', 'Guard',
    'Includes', 'Initialization', 'Tick',
  ];

  /**
   * Attributes that must be a C++ identifier, so the generator can
   * name something after them. Checked as they are typed, rather than
   * left to fail at generation -- or, for an event name, to reach the
   * simulator, which says so with a modal.
   */
  var IDENTIFIER_ATTRIBUTES = ['name', 'Event'];

  /**
   * Whether the diagram labels this by its EVENT rather than by its
   * name -- which is what a transition is, connection or not: an
   * Internal Transition is a child rather than an edge, and still
   * reads `EVENT [guard]`.
   *
   * @param what  a descriptor ({type, isConnection}) or a schema
   *              ({name, isConnection})
   */
  function labelledByEvent(what) {
    if (!what) return false;
    return !!what.isConnection ||
      what.type === 'Internal Transition' || what.name === 'Internal Transition';
  }

  function isTransition(desc) {
    return labelledByEvent(desc);
  }

  return {
    ROOT_TYPES: ROOT_TYPES,
    NON_GRAPH_TYPES: NON_GRAPH_TYPES,
    CODE_ATTRIBUTES: CODE_ATTRIBUTES,
    IDENTIFIER_ATTRIBUTES: IDENTIFIER_ATTRIBUTES,

    /**
     * Which input an attribute wants, from its declared type and its
     * name. One answer for every form -- the create dialog and the
     * inspector have to agree, or the same attribute is a textarea in
     * one and a one-line input in the other.
     *
     * @param attr  { name, type } from a schema
     * @return 'checkbox' | 'number' | 'code' | 'text'
     */
    fieldKind: function (attr) {
      if (!attr) return 'text';
      if (attr.type === 'boolean') return 'checkbox';
      if (attr.type === 'float' || attr.type === 'integer') return 'number';
      if (CODE_ATTRIBUTES.indexOf(attr.name) > -1) return 'code';
      return 'text';
    },

    labelledByEvent: labelledByEvent,

    /**
     * The attributes worth putting in front of someone editing a node
     * of this type, in the order to show them.
     *
     * A transition's `name` is left out. It is bookkeeping: the
     * generator never emits it -- rename every transition in a model
     * and the generated code is byte for byte the same -- and the
     * diagram labels a transition `EVENT [guard]`, so nothing shows
     * it either. A field that looks like it matters and changes
     * nothing is worse than no field.
     *
     * @param schema  from getNodeSchema / getChildTypeSchemas
     */
    editableAttributes: function (schema) {
      var attributes = (schema && schema.attributes) || [];
      if (labelledByEvent(schema)) {
        attributes = attributes.filter(function (a) { return a.name !== 'name'; });
      }
      return this.fieldOrder(attributes);
    },

    /**
     * The order to show attributes in: what the machine DOES first,
     * then its name, then the rest. A property grid sorted
     * alphabetically buries Entry under Declarations and Definitions.
     */
    fieldOrder: function (attributes) {
      var rank = function (a) {
        if (a.name === 'name') return 0;
        if (a.name === 'Event') return 1;
        if (a.name === 'Guard') return 2;
        if (a.name === 'Action') return 3;
        if (['Entry', 'Exit', 'Tick'].indexOf(a.name) > -1) return 4;
        if (CODE_ATTRIBUTES.indexOf(a.name) > -1) return 6;
        return 5;
      };
      return (attributes || []).slice().sort(function (a, b) {
        var d = rank(a) - rank(b);
        return d !== 0 ? d : (a.name < b.name ? -1 : 1);
      });
    },

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
