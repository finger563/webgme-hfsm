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
      'hfsm/viz/describe', 'hfsm/checkModel',
    ]).then(function (loaded) {
      mods.palette = loaded[0];
      mods.PlaygroundHost = loaded[1];
      mods.metaRules = loaded[2];
      mods.LocalBackend = loaded[3];
      mods.resolveModel = loaded[4];
      mods.describe = loaded[5];
      mods.checkModel = loaded[6];
    });
  });

  describe('the palette', function () {

    it('offers exactly what can be drawn inside a state', function () {
      // Anything else is a part that can be picked up and dropped and
      // then is not there -- see describe.creatableTypes for why each
      // kind of exclusion matters.
      assert.deepStrictEqual(mods.palette.creatableTypes(), [
        'Choice Pseudostate',
        'Deep History Pseudostate',
        'Documentation',
        'End State',
        'Initial',
        'Internal Transition',
        'Shallow History Pseudostate',
        'State',
      ]);
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

    it('leaves out what the graph does not draw', function () {
      // An Event or a Field belongs to the simulator's panels, not to
      // the canvas: dropped on the diagram it simply vanishes. Worse,
      // a new Event is named "Event", which is a reserved name -- the
      // simulator then warns about it with a MODAL, on every refresh,
      // and the page cannot be used until it is dismissed.
      var offered = mods.palette.creatableTypes();
      mods.describe.NON_GRAPH_TYPES.forEach(function (type) {
        assert.ok(offered.indexOf(type) === -1,
                  type + ' is not drawn and must not be offered');
      });
      assert.strictEqual(mods.checkModel.isValidString('Event'), false,
                         'the reason Event is dangerous: the default ' +
                         'name a new one gets is reserved');
    });

    it('leaves out what has nowhere to land', function () {
      // The diagram draws INTO a state, a machine or a library. A
      // Language nests only inside another Language, and a machine or
      // a library is the thing being drawn rather than something to
      // drop into it.
      var offered = mods.palette.creatableTypes();
      ['Language', 'Library', 'State Machine'].forEach(function (type) {
        assert.ok(offered.indexOf(type) === -1,
                  type + ' cannot be a child of anything drawable');
      });
    });

    it('offers only what a state or a machine will actually accept',
       function () {
         // the drop is validated against the metamodel, so anything
         // offered that no container allows is a guaranteed refusal
         var containers = ['State', 'State Machine', 'Library'];
         mods.palette.creatableTypes().forEach(function (type) {
           var fits = containers.some(function (c) {
             return !!mods.metaRules.childRules(c)[type];
           });
           assert.ok(fits, type + ' is offered but nothing can contain it');
         });
       });
  });

  describe('what the diagram draws', function () {

    it('drops the Project wrapper an export puts around the model',
       function () {
         // it is a container for the file, not part of the machine:
         // WebGME never feeds it, because the visualizer opens on the
         // machine itself, so drawing it is a stray empty box beside
         // the diagram
         assert.strictEqual(
           mods.describe.finish({ id: '/p', name: 'FixtureProject',
                                  type: 'Project' }),
           null);
       });

    it('keeps everything the metamodel does describe', function () {
      Object.keys(mods.metaRules.types).forEach(function (type) {
        var desc = mods.describe.finish({ id: '/x', name: 'n', type: type });
        assert.ok(desc, type + ' is in the metamodel and must be kept');
      });
    });

    it('still gives a machine no parent to nest inside', function () {
      var desc = mods.describe.finish({ id: '/p/m', name: 'M',
                                        type: 'State Machine',
                                        parentId: '/p' });
      assert.strictEqual(desc.parentId, null);
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

    it('refuses an id that is not a string', function () {
      // The drag carries a LIST of items, and handing the whole list
      // over as one id used to "work": every lookup coerced it to a
      // string and every `==` comparison passed, so the node was
      // created with an array for its type and drew with the wrong
      // shape. Answering only for strings makes that a refusal
      // instead of a wrong answer.
      var backend = machine();
      [['State'], ['/p/m/A'], null, undefined, 42, {}].forEach(function (bad) {
        assert.strictEqual(backend.getNodeInfo(bad), null,
                           JSON.stringify(bad) + ' is not an id');
      });
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
