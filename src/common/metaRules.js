/**
 * The metamodel, resolved into the questions callers actually ask.
 *
 * meta.json is generated from WebGME (scripts/gen-meta.js) and states
 * rules the way WebGME stores them: naming abstract types, and
 * carrying min/max per containment rule. Every consumer needs the
 * same three things out of that -- what may go inside what, how many
 * of them, and what a connection may join -- so the derivation lives
 * here once instead of in each of them.
 *
 * That matters beyond tidiness: resolveModel enforces these rules on
 * a finished model and LocalBackend enforces them while editing one.
 * If those two derived the rules separately they could disagree, and
 * the editor would let you build something the resolver then refuses.
 */
define(['./meta'], function (meta) {
  'use strict';

  var TYPES = meta.types;

  function isAbstract(name) {
    return !!(TYPES[name] && TYPES[name].isAbstract);
  }

  function baseChainContains(candidate, ancestor) {
    for (var cur = candidate; cur; cur = TYPES[cur] && TYPES[cur].base) {
      if (cur === ancestor) return true;
    }
    return false;
  }

  // a rule naming an abstract type applies to its concrete descendants
  function concreteDescendants(name) {
    return Object.keys(TYPES).filter(function (candidate) {
      return !isAbstract(candidate) && baseChainContains(candidate, name);
    }).sort();
  }

  // -1 means unbounded, and unbounded wins if two rules expand onto
  // the same concrete type
  function loosest(a, b) {
    if (a === undefined) return b;
    if (a === -1 || b === -1) return -1;
    return Math.max(a, b);
  }

  var childRulesByType = {};
  var endpointsByType = {};

  Object.keys(TYPES).forEach(function (name) {
    var rules = {};
    var declared = TYPES[name].children;
    Object.keys(declared).forEach(function (child) {
      concreteDescendants(child).forEach(function (concrete) {
        var existing = rules[concrete];
        rules[concrete] = {
          min: existing ? loosest(existing.min, declared[child].min) : declared[child].min,
          max: existing ? loosest(existing.max, declared[child].max) : declared[child].max,
        };
      });
    });
    childRulesByType[name] = rules;

    var endpoints = {};
    var pointers = TYPES[name].pointers;
    Object.keys(pointers).forEach(function (ptr) {
      var targets = {};
      pointers[ptr].targets.forEach(function (target) {
        concreteDescendants(target).forEach(function (concrete) {
          targets[concrete] = true;
        });
      });
      endpoints[ptr] = targets;
    });
    endpointsByType[name] = endpoints;
  });

  return {
    /** the raw generated metamodel, for callers that need the rest */
    types: TYPES,

    isAbstract: isAbstract,

    /** every type that can actually be instantiated */
    concreteTypes: function () {
      return Object.keys(TYPES).filter(function (name) {
        return !isAbstract(name);
      }).sort();
    },

    concreteDescendants: concreteDescendants,

    /**
     * { childType: { min, max } } for a parent type, abstract rules
     * already expanded. max === -1 means unbounded.
     */
    childRules: function (parentType) {
      return childRulesByType[parentType] || {};
    },

    /**
     * Whether one more `childType` fits under a parent that already
     * has `existingCount` of them. Types the metamodel does not
     * describe (the exported 'Project' wrapper) constrain nothing.
     */
    canContainMore: function (parentType, childType, existingCount) {
      var rules = childRulesByType[parentType];
      if (!rules || !Object.keys(rules).length) return true;
      var rule = rules[childType];
      if (!rule) return false;
      return rule.max === -1 || existingCount < rule.max;
    },

    /** { src: {Type: true}, dst: {...} } for a connection type */
    endpointTypes: function (connectionType) {
      return endpointsByType[connectionType] || {};
    },

    isConnection: function (name) {
      return !!(TYPES[name] && TYPES[name].isConnection);
    },
  };
});
