'use strict';

/**
 * LocalBackend is the ModelBackend implementation that does NOT have
 * WebGME behind it, so nothing else can vouch for its meta answers.
 * These tests pin them against the generated metamodel, and check
 * that a model edited through it stays something the checker and the
 * generator will still accept.
 */

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var amdLoader = require('../bin/amd-loader');

var LocalBackend, resolveModel, processor, meta;

function emptyModel() {
  return {
    root: '/p',
    objects: {
      '/p': { path: '/p', name: 'P', type: 'Project', parentPath: '' },
      '/p/m': {
        path: '/p/m', name: 'M', type: 'State Machine', parentPath: '/p',
        pointers: {},
      },
    },
  };
}

describe('LocalBackend', function() {

  before(function() {
    return amdLoader.load([
      'src/common/viz/LocalBackend',
      'src/common/resolveModel',
      'src/common/processor',
      'src/common/meta',
    ]).then(function(mods) {
      LocalBackend = mods[0];
      resolveModel = mods[1];
      processor = mods[2];
      meta = mods[3];
    });
  });

  describe('metamodel answers', function() {

    it('offers under a State Machine exactly what the metamodel allows', function() {
      var backend = LocalBackend(emptyModel());
      var offered = Object.keys(backend.getValidChildTypes('/p/m')).sort();
      assert.deepStrictEqual(offered, [
        'Choice Pseudostate', 'Deep History Pseudostate', 'Documentation',
        'End State', 'Event', 'External Transition', 'Initial',
        'Local Transition', 'Shallow History Pseudostate', 'State',
      ]);
      // the holes the standalone pipeline used to have
      assert.ok(offered.indexOf('State Machine') === -1,
                'a machine must not be offered inside a machine');
      assert.ok(offered.indexOf('Field') === -1,
                'a Field belongs to an Event, not a machine');
    });

    it('offers Field only under an Event', function() {
      var model = emptyModel();
      var backend = LocalBackend(model);
      var ev = backend.transact('add event', function() {
        return backend.createChild('/p/m', 'Event');
      });
      assert.deepStrictEqual(Object.keys(backend.getValidChildTypes(ev)).sort(),
                             ['Documentation', 'Field']);
      assert.strictEqual(backend.getValidChildTypes('/p/m').Field, undefined);
    });

    it('never offers an abstract type', function() {
      var backend = LocalBackend(emptyModel());
      var abstract = Object.keys(meta.types).filter(function(n) {
        return meta.types[n].isAbstract;
      });
      assert.ok(abstract.length > 0, 'the metamodel should have abstract types');
      var offered = Object.keys(backend.getValidChildTypes('/p/m'));
      abstract.forEach(function(name) {
        assert.ok(offered.indexOf(name) === -1, name + ' must not be offered');
      });
    });

    it('expands an abstract endpoint rule to its concrete types', function() {
      // External Transition's src is declared as Pseudostate | State
      var model = emptyModel();
      var backend = LocalBackend(model);
      var ids = backend.transact('build', function() {
        return {
          initial: backend.createChild('/p/m', 'Initial'),
          state: backend.createChild('/p/m', 'State'),
          event: backend.createChild('/p/m', 'Event'),
        };
      });
      // Initial is a concrete Pseudostate, so it is a legal source
      var fromInitial = backend.getValidConnectionTypes(ids.initial, ids.state, '/p/m');
      assert.deepStrictEqual(fromInitial.map(function(c) { return c.name; }),
                             ['External Transition']);
      // an Event is neither, so nothing may connect it
      assert.deepStrictEqual(
        backend.getValidConnectionTypes(ids.event, ids.state, '/p/m'), []);
    });

    it('describes a type well enough to build a form for it', function() {
      var backend = LocalBackend(emptyModel());
      var schemas = backend.getChildTypeSchemas('/p/m');
      var state = schemas.filter(function(s) { return s.name === 'State'; })[0];
      assert.ok(state, 'State should be creatable under a machine');
      assert.strictEqual(state.isConnection, false);
      var byName = {};
      state.attributes.forEach(function(a) { byName[a.name] = a.type; });
      assert.strictEqual(byName.Entry, 'string');
      assert.strictEqual(byName['Timer Period'], 'float');
      assert.strictEqual(byName.isComplete, 'boolean');

      var transition = schemas.filter(function(s) {
        return s.name === 'External Transition';
      })[0];
      assert.strictEqual(transition.isConnection, true);
    });

    it('reports each attribute default, so a form can show it', function() {
      // a form rendered from this must not write '' over a default it
      // never displayed
      var backend = LocalBackend(emptyModel());
      var schemas = backend.getChildTypeSchemas('/p/m');
      var byType = {};
      schemas.forEach(function(s) { byType[s.name] = s; });
      function defaultOf(typeName, attr) {
        return byType[typeName].attributes.filter(function(a) {
          return a.name === attr;
        })[0].defaultValue;
      }
      assert.strictEqual(defaultOf('State', 'isComplete'), true);
      assert.strictEqual(defaultOf('State', 'Timer Period'), 0);
      assert.strictEqual(defaultOf('External Transition', 'Enabled'), true);

      var event = backend.transact('e', function() {
        return backend.createChild('/p/m', 'Event');
      });
      var field = backend.getChildTypeSchemas(event).filter(function(s) {
        return s.name === 'Field';
      })[0];
      assert.strictEqual(field.attributes.filter(function(a) {
        return a.name === 'Type';
      })[0].defaultValue, 'int');
    });

    it('names connection types by name, since typeId is opaque', function() {
      // the widget builds an edge from getValidConnectionTypes().name;
      // resolving the accompanying typeId as a node id only ever
      // worked against WebGME
      var model = emptyModel();
      var backend = LocalBackend(model);
      var ids = backend.transact('build', function() {
        return {
          initial: backend.createChild('/p/m', 'Initial'),
          state: backend.createChild('/p/m', 'State'),
        };
      });
      var conns = backend.getValidConnectionTypes(ids.initial, ids.state, '/p/m');
      assert.deepStrictEqual(conns.map(function(c) { return c.name; }),
                             ['External Transition']);
      // the name is what createChild accepts
      var edge = backend.transact('edge', function() {
        return backend.createChild('/p/m', conns[0].name);
      });
      assert.strictEqual(model.objects[edge].type, 'External Transition');
    });
  });

  describe('editing', function() {

    it('refuses a child the metamodel does not allow', function() {
      var backend = LocalBackend(emptyModel());
      assert.throws(function() {
        backend.transact('bad', function() {
          backend.createChild('/p/m', 'State Machine');
        });
      }, /not a valid child type/);
    });

    it('starts a new node from the metamodel defaults', function() {
      var model = emptyModel();
      var backend = LocalBackend(model);
      var id = backend.transact('add', function() {
        return backend.createChild('/p/m', 'State');
      });
      var node = model.objects[id];
      assert.strictEqual(node.Entry, '');
      assert.strictEqual(node['Timer Period'], 0);
      assert.strictEqual(node.isComplete, true);
    });

    it('deletes a subtree, not just the node', function() {
      var model = emptyModel();
      var backend = LocalBackend(model);
      var inner = backend.transact('build', function() {
        var outer = backend.createChild('/p/m', 'State');
        return backend.createChild(outer, 'State');
      });
      var outer = model.objects[inner].parentPath;
      backend.transact('delete', function() { backend.deleteNodes([outer]); });
      assert.strictEqual(model.objects[outer], undefined);
      assert.strictEqual(model.objects[inner], undefined,
                         'the child should go with its parent');
    });

    it('moves a subtree and repoints transitions into it', function() {
      var model = emptyModel();
      var backend = LocalBackend(model);
      var built = backend.transact('build', function() {
        var outer = backend.createChild('/p/m', 'State');
        var inner = backend.createChild(outer, 'State');
        var initial = backend.createChild(outer, 'Initial');
        var trans = backend.createChild(outer, 'External Transition');
        backend.setPointer(trans, 'src', initial);
        backend.setPointer(trans, 'dst', inner);
        return { outer: outer, inner: inner, trans: trans };
      });
      var host = backend.transact('host', function() {
        return backend.createChild('/p/m', 'State');
      });

      var moved = backend.transact('move', function() {
        return backend.moveNodes([built.outer], host, { x: 5, y: 6 });
      })[0];

      assert.strictEqual(model.objects[built.outer], undefined);
      assert.strictEqual(model.objects[moved].parentPath, host);
      assert.deepStrictEqual(model.objects[moved].position, { x: 5, y: 6 });

      // the transition moved with it and still names real endpoints
      var newTrans = moved + built.trans.slice(built.outer.length);
      var pointers = model.objects[newTrans].pointers;
      assert.ok(model.objects[pointers.src], 'src should resolve after the move');
      assert.ok(model.objects[pointers.dst], 'dst should resolve after the move');
      assert.strictEqual(pointers.dst, moved + built.inner.slice(built.outer.length));
    });

    it('refuses to reparent a node into its own subtree', function() {
      var model = emptyModel();
      var backend = LocalBackend(model);
      var built = backend.transact('build', function() {
        var outer = backend.createChild('/p/m', 'State');
        return { outer: outer, inner: backend.createChild(outer, 'State') };
      });
      assert.throws(function() {
        backend.transact('move', function() {
          backend.moveNodes([built.outer], built.inner);
        });
      }, /own subtree/);
    });

    it('copies without disturbing the original', function() {
      var model = emptyModel();
      var backend = LocalBackend(model);
      var source = backend.transact('build', function() {
        var s = backend.createChild('/p/m', 'State');
        backend.setAttribute(s, 'Entry', 'tick();');
        return s;
      });
      var host = backend.transact('host', function() {
        return backend.createChild('/p/m', 'State');
      });
      var copy = backend.transact('copy', function() {
        return backend.copyNodes([source], host);
      })[0];
      assert.ok(model.objects[source], 'the original survives a copy');
      assert.strictEqual(model.objects[copy].Entry, 'tick();');
      assert.notStrictEqual(copy, source);
    });

    it('rolls the model back when a transaction throws', function() {
      var model = emptyModel();
      var backend = LocalBackend(model);
      var before = JSON.stringify(model.objects);
      assert.throws(function() {
        backend.transact('half an edit', function() {
          backend.createChild('/p/m', 'State');
          backend.createChild('/p/m', 'Initial');
          throw new Error('boom');
        });
      }, /boom/);
      assert.strictEqual(JSON.stringify(model.objects), before,
                         'a failed transaction must leave nothing behind');
    });

    it('rolls back the whole outer transaction, not just the inner one', function() {
      var model = emptyModel();
      var backend = LocalBackend(model);
      var before = JSON.stringify(model.objects);
      assert.throws(function() {
        backend.transact('outer', function() {
          backend.createChild('/p/m', 'State');
          backend.transact('inner', function() {
            backend.createChild('/p/m', 'Initial');
            throw new Error('inner boom');
          });
        });
      }, /inner boom/);
      assert.strictEqual(JSON.stringify(model.objects), before);
    });

    it('stops offering a type once its maximum is reached', function() {
      var model = emptyModel();
      var backend = LocalBackend(model);
      // the metamodel allows at most one Initial under a machine
      assert.strictEqual(meta.types['State Machine'].children.Initial.max, 1);
      assert.ok(backend.getValidChildTypes('/p/m').Initial);
      backend.transact('add', function() { backend.createChild('/p/m', 'Initial'); });
      assert.strictEqual(backend.getValidChildTypes('/p/m').Initial, undefined,
                         'a second Initial must not be offered');
      assert.ok(backend.getValidChildTypes('/p/m').State,
                'unbounded types stay on offer');
      // and the form must not offer it either
      var offered = backend.getChildTypeSchemas('/p/m').map(function(s) {
        return s.name;
      });
      assert.ok(offered.indexOf('Initial') === -1);
      assert.throws(function() {
        backend.transact('one too many', function() {
          backend.createChild('/p/m', 'Initial');
        });
      }, /not a valid child type/);
    });

    it('rewrites only the copy\'s own pointers, leaving the source alone', function() {
      var model = emptyModel();
      var backend = LocalBackend(model);
      var built = backend.transact('build', function() {
        var outer = backend.createChild('/p/m', 'State');
        var inner = backend.createChild(outer, 'State');
        var initial = backend.createChild(outer, 'Initial');
        var trans = backend.createChild(outer, 'External Transition');
        backend.setPointer(trans, 'src', initial);
        backend.setPointer(trans, 'dst', inner);
        return { outer: outer, inner: inner, trans: trans };
      });
      var host = backend.transact('host', function() {
        return backend.createChild('/p/m', 'State');
      });

      var copy = backend.transact('copy', function() {
        return backend.copyNodes([built.outer], host);
      })[0];

      // the copy's transition must point INSIDE the copy, not back at
      // the original -- otherwise deleting the source dangles it
      var copiedTrans = copy + built.trans.slice(built.outer.length);
      var copied = model.objects[copiedTrans].pointers;
      assert.strictEqual(copied.dst, copy + built.inner.slice(built.outer.length));
      assert.ok(copied.dst.indexOf(copy) === 0, 'dst should live in the copy');
      assert.ok(copied.src.indexOf(copy) === 0, 'src should live in the copy');

      // ... and the original is untouched
      var original = model.objects[built.trans].pointers;
      assert.strictEqual(original.dst, built.inner);

      // deleting the source must not dangle the copy
      backend.transact('drop source', function() {
        backend.deleteNodes([built.outer]);
      });
      assert.ok(model.objects[copied.dst], 'the copy still resolves');
      assert.ok(model.objects[copied.src], 'the copy still resolves');
    });

    it('honors read-only', function() {
      var backend = LocalBackend(emptyModel());
      backend.setReadOnly(true);
      assert.strictEqual(backend.isReadOnly(), true);
      assert.throws(function() {
        backend.transact('nope', function() {
          backend.createChild('/p/m', 'State');
        });
      }, /read-only/);
    });

    it('reports the change once per outermost transaction', function() {
      var changes = [];
      var backend = LocalBackend(emptyModel(), function(msg) { changes.push(msg); });
      backend.transact('outer', function() {
        backend.createChild('/p/m', 'State');
        backend.transact('inner', function() {
          backend.createChild('/p/m', 'State');
        });
      });
      assert.deepStrictEqual(changes, ['outer']);
    });

    it('reports a failed transaction through onComplete and rethrows', function() {
      var backend = LocalBackend(emptyModel());
      var seen = null;
      assert.throws(function() {
        backend.transact('bad', function() {
          throw new Error('boom');
        }, function(err) { seen = err; });
      }, /boom/);
      assert.ok(seen && /boom/.test(seen.message),
                'onComplete should receive the error');
    });
  });

  describe('interop with the rest of the pipeline', function() {

    it('builds a model the resolver and processor accept', function() {
      var model = emptyModel();
      var backend = LocalBackend(model);
      backend.transact('build a machine', function() {
        var initial = backend.createChild('/p/m', 'Initial');
        var idle = backend.createChild('/p/m', 'State');
        backend.setAttribute(idle, 'name', 'Idle');
        // a leaf state needs a real timer period (checkModel's rule);
        // the metamodel's default of 0 is only a starting point
        backend.setAttribute(idle, 'Timer Period', 0.1);
        var trans = backend.createChild('/p/m', 'External Transition');
        backend.setPointer(trans, 'src', initial);
        backend.setPointer(trans, 'dst', idle);
      });

      // the model the backend produced goes straight into the
      // existing pipeline -- no translation step
      resolveModel.resolve(model);
      processor.processModel(model);
      assert.strictEqual(model.root.type, 'Project');
    });

    it('cannot build a model the resolver would reject as ill-typed', function() {
      // the two enforcement points agree: whatever the backend lets
      // you create, resolveModel accepts
      var model = emptyModel();
      var backend = LocalBackend(model);
      var offered = Object.keys(backend.getValidChildTypes('/p/m'));
      offered.forEach(function(typeName) {
        backend.transact('add ' + typeName, function() {
          backend.createChild('/p/m', typeName);
        });
      });
      // Documentation and the pseudostates need no wiring to resolve
      assert.doesNotThrow(function() {
        resolveModel.resolve(JSON.parse(JSON.stringify(model)));
      });
    });
  });

  it('ships to the playground build', function() {
    // the browser gets the metamodel as an AMD module, so a plain
    // `cp src/common/*.js` carries it; meta.json stays the reviewable
    // artifact. Guard the pair against being split up.
    var repoRoot = path.resolve(__dirname, '..');
    assert.ok(fs.existsSync(path.join(repoRoot, 'src/common/meta.js')),
              'meta.js must exist for the browser');
    assert.ok(fs.existsSync(path.join(repoRoot, 'src/common/meta.json')),
              'meta.json must exist as the reviewable artifact');
    var json = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'src/common/meta.json'), 'utf8'));
    assert.deepStrictEqual(meta, json,
                           'meta.js and meta.json must carry the same data');
  });
});
