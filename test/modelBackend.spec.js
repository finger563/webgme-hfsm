'use strict';

/**
 * The ModelBackend contract is what keeps the visualizer and the
 * simulator honest: they may only use methods listed here, so any
 * backend implementing all of them can drive them (the WebGME client
 * today, a plain in-memory JSON model in the browser next).
 *
 * These tests pin the contract itself -- a method silently dropped
 * from an implementation must fail loudly, not at click time.
 */

var assert = require('assert');
var amdLoader = require('../bin/amd-loader');

var ModelBackend;

function completeBackend() {
  var backend = {};
  ModelBackend.REQUIRED.forEach(function(name) {
    backend[name] = function() {};
  });
  return backend;
}

describe('ModelBackend', function() {

  before(function() {
    return amdLoader.load(['src/common/viz/ModelBackend']).then(function(mods) {
      ModelBackend = mods[0];
    });
  });

  it('accepts an implementation with every required method', function() {
    var backend = completeBackend();
    assert.strictEqual(ModelBackend.assertImplements(backend, 'Complete'), backend);
  });

  it('names the implementation and every missing method', function() {
    var backend = completeBackend();
    delete backend.transact;
    delete backend.deleteNodes;
    assert.throws(function() {
      ModelBackend.assertImplements(backend, 'Partial');
    }, function(err) {
      assert.ok(/Partial/.test(err.message), 'names the implementation: ' + err.message);
      assert.ok(/transact/.test(err.message), 'names transact: ' + err.message);
      assert.ok(/deleteNodes/.test(err.message), 'names deleteNodes: ' + err.message);
      return true;
    });
  });

  it('rejects a non-function standing in for a method', function() {
    var backend = completeBackend();
    backend.getNode = 'not callable';
    assert.throws(function() {
      ModelBackend.assertImplements(backend, 'Bogus');
    }, /getNode/);
  });

  it('requires reads, mutations and selection', function() {
    // a spot check that the contract still covers each area, so
    // trimming it is a deliberate edit rather than an accident
    ['getNode', 'getChildren', 'getNodeInfo', 'getValidChildTypes',
     'getValidConnectionTypes', 'getChildTypeSchemas', 'getAttribute',
     'isReadOnly',
     'transact', 'createChild', 'createInstances', 'setAttribute',
     'setPointer', 'setPosition', 'deleteNodes', 'moveNodes', 'copyNodes',
     'setActiveSelection'].forEach(function(name) {
       assert.ok(ModelBackend.REQUIRED.indexOf(name) !== -1,
                 'contract still requires ' + name);
     });
  });
});
