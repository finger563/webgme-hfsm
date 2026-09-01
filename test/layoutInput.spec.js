'use strict';

/**
 * A local transition -- a state with a transition into its own
 * substate -- used to make the auto-layout button do nothing at all,
 * for the WHOLE machine, in both WebGME and the playground.
 * cose-bilkent classes an edge between a node and its own descendant
 * as invalid and abandons the layout without an error, so the button
 * looked like it had worked and nothing had moved.
 *
 * Nothing here can catch that end to end -- it takes cytoscape and a
 * canvas -- but the rule that keeps those edges out of the layout is
 * plain data, and this pins it down.
 */

var assert = require('assert');
var amdLoader = require('../bin/amd-loader');

var layoutInput;

describe('layout input', function() {

  before(function() {
    return amdLoader.load(['src/common/viz/layoutInput'])
      .then(function(loaded) { layoutInput = loaded[0]; });
  });

  it('excludes a transition from a state into its own substate', function() {
    var excluded = layoutInput.excludedEdges({
      nodes: [
        { id: 'A', parent: null },
        { id: 'A/1', parent: 'A' },
        { id: 'A/2', parent: 'A' },
      ],
      edges: [
        { id: 'local', source: 'A', target: 'A/2' },
        { id: 'sibling', source: 'A/1', target: 'A/2' },
      ],
    });
    assert.deepStrictEqual(excluded, ['local']);
  });

  it('excludes one pointing the other way, out of a substate', function() {
    var excluded = layoutInput.excludedEdges({
      nodes: [{ id: 'A', parent: null }, { id: 'A/1', parent: 'A' }],
      edges: [{ id: 'up', source: 'A/1', target: 'A' }],
    });
    assert.deepStrictEqual(excluded, ['up']);
  });

  it('excludes across more than one level of nesting', function() {
    // the ancestor need not be the immediate parent
    var excluded = layoutInput.excludedEdges({
      nodes: [
        { id: 'A', parent: null },
        { id: 'A/B', parent: 'A' },
        { id: 'A/B/C', parent: 'A/B' },
      ],
      edges: [{ id: 'deep', source: 'A', target: 'A/B/C' }],
    });
    assert.deepStrictEqual(excluded, ['deep']);
  });

  it('keeps every edge a layout can actually use', function() {
    // cousins, siblings and top-level states all inform the layout,
    // and dropping them would change where things land
    var excluded = layoutInput.excludedEdges({
      nodes: [
        { id: 'A', parent: null },
        { id: 'B', parent: null },
        { id: 'A/1', parent: 'A' },
        { id: 'B/1', parent: 'B' },
      ],
      edges: [
        { id: 'e1', source: 'A', target: 'B' },
        { id: 'e2', source: 'A/1', target: 'B/1' },
        { id: 'e3', source: 'A/1', target: 'B' },
      ],
    });
    assert.deepStrictEqual(excluded, []);
  });

  it('copes with a graph that has nothing in it', function() {
    assert.deepStrictEqual(layoutInput.excludedEdges({}), []);
    assert.deepStrictEqual(
      layoutInput.excludedEdges({ nodes: [], edges: [] }), []);
  });
});
