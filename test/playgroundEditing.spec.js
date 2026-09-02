'use strict';

/**
 * Editing in the playground.
 *
 * The palette hands the widget a TYPE NAME and nothing else; the
 * widget hands that to `backend.getNodeInfo` and creates whatever
 * comes back. That handover is the whole contract between the two,
 * and it is the part that can silently rot -- a type the palette
 * offers but the backend will not resolve produces a drag that lands
 * and does nothing, with no error anywhere.
 *
 * The DOM half (menus, the drag itself) is verified in a browser: a
 * fake DOM here could only confirm that the fake behaves like the
 * fake.
 */

var assert = require('assert');
var path = require('path');

var repoRoot = path.resolve(__dirname, '..');

function playgroundContext(name) {
  var requirejs = require('requirejs');
  return requirejs.config({
    context: name,
    baseUrl: repoRoot,
    nodeRequire: require,
    paths: {
      hfsm: path.join(repoRoot, 'src/common'),
      // vendored in the build; see test/stubs/jquery.js
      jquery: 'test/stubs/jquery',
      // the page loads these as siblings of viz.js
      host: 'web/host',
      palette: 'web/palette',
    },
  });
}

function load(name, ids) {
  var req = playgroundContext(name);
  return new Promise(function (resolve, reject) {
    req(ids, function () {
      resolve(Array.prototype.slice.call(arguments));
    }, reject);
  });
}

describe('playground editing', function () {

  var mods = {};

  before(function () {
    this.timeout(10000);
    return load('playground-editing', [
      'palette', 'host',
      'hfsm/metaRules', 'hfsm/viz/LocalBackend', 'hfsm/resolveModel',
    ]).then(function (loaded) {
      mods.palette = loaded[0];
      mods.PlaygroundHost = loaded[1];
      mods.metaRules = loaded[2];
      mods.LocalBackend = loaded[3];
      mods.resolveModel = loaded[4];
    });
  });

  describe('the palette', function () {

    it('offers every type the metamodel can instantiate', function () {
      var offered = mods.palette.creatableTypes();
      mods.metaRules.concreteTypes().forEach(function (type) {
        if (mods.metaRules.isConnection(type)) return;
        assert.ok(offered.indexOf(type) > -1,
                  type + ' can be created but is not in the palette');
      });
    });

    it('offers nothing abstract', function () {
      // dragging one in would produce a node of a type that cannot
      // exist, and the resolver would reject the model afterwards
      mods.palette.creatableTypes().forEach(function (type) {
        assert.ok(!mods.metaRules.isAbstract(type),
                  type + ' is abstract and cannot be instantiated');
      });
    });

    it('leaves the transitions out, since those are drawn', function () {
      // a transition needs two endpoints, so it is made with the edge
      // handle; offering it here would only produce refused drops
      var offered = mods.palette.creatableTypes();
      assert.ok(offered.indexOf('External Transition') === -1);
      assert.ok(offered.indexOf('Local Transition') === -1);
      assert.ok(offered.indexOf('Internal Transition') > -1,
                'an internal transition IS a child, not a connection');
    });
  });

  describe('the host', function () {
    it('satisfies the whole HostServices contract', function () {
      // the factory asserts this itself, so a missing method throws
      // here rather than the first time someone right-clicks
      var host = mods.PlaygroundHost();
      ['contextMenu', 'editDocument', 'makeDroppable'].forEach(function (m) {
        assert.strictEqual(typeof host[m], 'function', m + ' is missing');
      });
    });
  });

  describe('what the palette hands over', function () {

    function machine() {
      var model = {
        root: '/p',
        objects: {
          '/p': { name: 'P', type: 'Project' },
          '/p/m': { name: 'M', type: 'State Machine' },
          '/p/m/i': { name: 'Initial', type: 'Initial' },
          '/p/m/A': { name: 'A', type: 'State' },
          '/p/m/ti': {
            name: 'ti', type: 'External Transition',
            pointers: { src: '/p/m/i', dst: '/p/m/A' },
          },
        },
      };
      mods.resolveModel.resolve(model);
      return mods.LocalBackend(model);
    }

    it('resolves a type name the way the widget asks it to', function () {
      // `_canCreateChild` accepts when
      // getValidChildTypes(parent)[info.type] === info.typeId
      var backend = machine();
      var allowed = backend.getValidChildTypes('/p/m');
      mods.palette.creatableTypes().forEach(function (type) {
        var info = backend.getNodeInfo(type);
        assert.ok(info, 'the backend cannot resolve palette entry ' + type);
        assert.strictEqual(info.type, type);
        if (allowed[type]) {
          assert.strictEqual(allowed[type], info.typeId,
                             type + ' would be refused by the widget');
        }
      });
    });

    it('creates the type that was dragged', function () {
      var backend = machine();
      var created = null;
      backend.transact('drop', function () {
        var info = backend.getNodeInfo('State');   // what the widget does
        created = backend.createChild('/p/m', info.type, { position: { x: 5, y: 6 } });
      });
      var node = backend.getNodeInfo(created);
      assert.strictEqual(node.type, 'State');
    });

    it('answers for a type name only where no object has that id', function () {
      // an object always wins: a model is free to contain a node
      // whose path happens to read like a type name
      var backend = machine();
      assert.strictEqual(backend.getNodeInfo('/p/m/A').type, 'State');
      assert.strictEqual(backend.getNodeInfo('/p/m/A').id, '/p/m/A');
    });

    it('refuses a name that is not a concrete type', function () {
      var backend = machine();
      assert.strictEqual(backend.getNodeInfo('Not A Type'), null);
      // abstract types are in the metamodel but cannot be created
      var abstractTypes = Object.keys(mods.metaRules.types).filter(function (t) {
        return mods.metaRules.isAbstract(t);
      });
      assert.ok(abstractTypes.length, 'expected the metamodel to have some');
      abstractTypes.forEach(function (type) {
        assert.strictEqual(backend.getNodeInfo(type), null,
                           type + ' is abstract and must not resolve');
      });
    });
  });
});
