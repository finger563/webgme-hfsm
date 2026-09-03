'use strict';

/**
 * Comparing two state machines.
 *
 * The cases that matter are the ones a text diff gets wrong -- a
 * moved node, a renamed state, a model rebuilt with different ids --
 * so most of this works on the real examples rather than on toys.
 */

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var repoRoot = path.resolve(__dirname, '..');

function example(name) {
  return JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'examples', name + '.json'), 'utf8'));
}

/** a deep copy, so a test can edit one side without touching the other */
function copy(model) {
  return JSON.parse(JSON.stringify(model));
}

describe('comparing two state machines', function () {

  var diffModel, resolveModel, describe;

  before(function () {
    this.timeout(10000);
    var requirejs = require('requirejs');
    var req = requirejs.config({
      context: 'diff-model',
      baseUrl: repoRoot,
      nodeRequire: require,
      paths: { hfsm: path.join(repoRoot, 'src/common') },
    });
    return new Promise(function (resolve, reject) {
      req(['hfsm/diffModel', 'hfsm/resolveModel', 'hfsm/viz/describe'],
          function (m, r, d) {
            diffModel = m;
            resolveModel = r;
            describe = d;
            resolve();
          }, reject);
    });
  });

  function entryFor(diff, p) {
    return diff.entries.filter(function (e) { return e.path === p; })[0];
  }

  it('finds nothing between a model and itself', function () {
    var diff = diffModel.diff(example('Simple'), example('Simple'));
    assert.strictEqual(diff.summary.added, 0);
    assert.strictEqual(diff.summary.removed, 0);
    assert.strictEqual(diff.summary.changed, 0);
    assert.strictEqual(diff.summary.moved, 0);
    assert.strictEqual(diffModel.describeSummary(diff.summary), 'identical');
  });

  it('does not call a dragged state a change', function () {
    // the whole reason a text diff is useless here: forty moved nodes
    // burying the one guard that really changed
    var after = copy(example('Simple'));
    Object.keys(after.objects).forEach(function (p) {
      if (after.objects[p].position) after.objects[p].position.x += 40;
    });
    var diff = diffModel.diff(example('Simple'), after);
    assert.strictEqual(diff.summary.changed, 0, 'nothing changed');
    assert.ok(diff.summary.moved > 0, 'but things moved');
    assert.ok(/identical, except/.test(diffModel.describeSummary(diff.summary)));
  });

  it('reports a changed guard as a change to that transition', function () {
    var after = copy(example('Simple'));
    var transition = Object.keys(after.objects).filter(function (p) {
      return after.objects[p].Guard;
    })[0];
    assert.ok(transition, 'the Simple example should have a guarded transition');
    after.objects[transition].Guard = 'false';

    var diff = diffModel.diff(example('Simple'), after);
    assert.strictEqual(diff.summary.changed, 1);
    var entry = entryFor(diff, transition);
    assert.strictEqual(entry.status, 'changed');
    assert.deepStrictEqual(entry.changes.map(function (c) { return c.attribute; }),
                           ['Guard']);
    assert.strictEqual(entry.changes[0].after, 'false');
  });

  it('treats a rename as the same object, renamed', function () {
    var after = copy(example('Simple'));
    var state = Object.keys(after.objects).filter(function (p) {
      return after.objects[p].type === 'State';
    })[0];
    var was = after.objects[state].name;
    after.objects[state].name = 'Renamed';

    var diff = diffModel.diff(example('Simple'), after);
    var entry = entryFor(diff, state);
    assert.strictEqual(entry.status, 'changed', 'not removed and added');
    assert.ok(entry.renamed);
    assert.strictEqual(diff.summary.added, 0);
    assert.strictEqual(diff.summary.removed, 0);
    assert.deepStrictEqual(entry.changes[0], { attribute: 'name',
                                               before: was, after: 'Renamed' });
  });

  it('reports an added state as added and nothing else', function () {
    var after = copy(example('Simple'));
    after.objects['/9/NEW'] = { name: 'Extra', type: 'State',
                                position: { x: 10, y: 10 } };
    var diff = diffModel.diff(example('Simple'), after);
    assert.strictEqual(diff.summary.added, 1);
    assert.strictEqual(diff.summary.removed, 0);
    assert.strictEqual(diff.summary.changed, 0);
    assert.strictEqual(entryFor(diff, '/9/NEW').status, 'added');
  });

  it('reports a removed state as removed', function () {
    var before = example('Simple');
    var after = copy(before);
    var leaf = Object.keys(after.objects).filter(function (p) {
      return after.objects[p].type === 'State' &&
        !Object.keys(after.objects).some(function (q) {
          return q !== p && q.indexOf(p + '/') === 0;
        });
    }).pop();
    // and whatever pointed at it, or the model is unresolvable
    Object.keys(after.objects).forEach(function (p) {
      var ptr = after.objects[p].pointers || {};
      if (ptr.src === leaf || ptr.dst === leaf) delete after.objects[p];
    });
    delete after.objects[leaf];

    var diff = diffModel.diff(before, after);
    assert.ok(diff.summary.removed >= 1);
    assert.strictEqual(entryFor(diff, leaf).status, 'removed');
    assert.strictEqual(entryFor(diff, leaf).afterPath, null);
  });

  it('notices a transition that now goes somewhere else', function () {
    var after = copy(example('Simple'));
    var edge = Object.keys(after.objects).filter(function (p) {
      var ptr = after.objects[p].pointers;
      return ptr && ptr.dst;
    })[0];
    var states = Object.keys(after.objects).filter(function (p) {
      return after.objects[p].type === 'State';
    });
    var elsewhere = states.filter(function (s) {
      return s !== after.objects[edge].pointers.dst;
    })[0];
    after.objects[edge].pointers.dst = elsewhere;

    var diff = diffModel.diff(example('Simple'), after);
    var entry = entryFor(diff, edge);
    assert.strictEqual(entry.status, 'changed');
    var change = entry.changes.filter(function (c) { return c.isPointer; })[0];
    assert.ok(change, 'a re-pointed transition is a pointer change');
    assert.strictEqual(change.attribute, 'dst');
    assert.strictEqual(change.after, elsewhere);
  });

  it('matches by name when the ids are different', function () {
    // two models built separately from the same design share no ids;
    // without this every object in both is added AND removed
    var before = example('Simple');
    var after = { root: '/R', namespace: before.namespace, objects: {} };
    var remap = { };
    remap[before.root] = '/R';
    Object.keys(before.objects).forEach(function (p) {
      if (p === before.root) return;
      remap[p] = '/R' + p.slice(before.root.length).replace(/\//g, '/x');
    });
    Object.keys(before.objects).forEach(function (p) {
      var obj = JSON.parse(JSON.stringify(before.objects[p]));
      if (obj.pointers) {
        Object.keys(obj.pointers).forEach(function (k) {
          obj.pointers[k] = remap[obj.pointers[k]] || obj.pointers[k];
        });
      }
      after.objects[remap[p]] = obj;
    });

    var diff = diffModel.diff(before, after);
    assert.strictEqual(diff.summary.added, 0,
                       'the same machine under different ids is the same machine');
    assert.strictEqual(diff.summary.removed, 0);
    assert.strictEqual(diff.summary.changed, 0);
    // and it knows they live somewhere else now
    assert.ok(diff.entries.some(function (e) { return e.rehomed; }));
  });

  it('matches transitions by what they connect, not what they are called',
     function () {
       // every transition in a model is called "External Transition"
       // until someone renames it, and nobody does -- the diagram
       // labels them by event. Matching them by name pairs them at
       // random, which reads as two transitions re-pointed.
       var before = { root: '/r', objects: {
         '/r': { name: 'M', type: 'State Machine' },
         '/r/a': { name: 'A', type: 'State' },
         '/r/b': { name: 'B', type: 'State' },
         '/r/1': { name: 'External Transition', type: 'External Transition',
                   Event: 'GO', pointers: { src: '/r/a', dst: '/r/b' } },
         '/r/2': { name: 'External Transition', type: 'External Transition',
                   Event: 'BACK', pointers: { src: '/r/b', dst: '/r/a' } },
       } };
       // the same machine, rebuilt: different ids, transitions in the
       // other order
       var after = { root: '/R', objects: {
         '/R': { name: 'M', type: 'State Machine' },
         '/R/x': { name: 'A', type: 'State' },
         '/R/y': { name: 'B', type: 'State' },
         '/R/9': { name: 'External Transition', type: 'External Transition',
                   Event: 'BACK', pointers: { src: '/R/y', dst: '/R/x' } },
         '/R/8': { name: 'External Transition', type: 'External Transition',
                   Event: 'GO', pointers: { src: '/R/x', dst: '/R/y' } },
       } };

       var diff = diffModel.diff(before, after);
       assert.strictEqual(diffModel.describeSummary(diff.summary), 'identical');
     });

  it('still recognises a transition whose endpoint moved', function () {
    // the endpoints no longer match, so the event is what is left to
    // go on -- and it is the change worth reporting, not an add and a
    // remove of two unrelated things
    var before = { root: '/r', objects: {
      '/r': { name: 'M', type: 'State Machine' },
      '/r/a': { name: 'A', type: 'State' },
      '/r/b': { name: 'B', type: 'State' },
      '/r/c': { name: 'C', type: 'State' },
      '/r/1': { name: 'External Transition', type: 'External Transition',
                Event: 'GO', pointers: { src: '/r/a', dst: '/r/b' } },
    } };
    var after = { root: '/R', objects: {
      '/R': { name: 'M', type: 'State Machine' },
      '/R/x': { name: 'A', type: 'State' },
      '/R/y': { name: 'B', type: 'State' },
      '/R/z': { name: 'C', type: 'State' },
      '/R/1': { name: 'External Transition', type: 'External Transition',
                Event: 'GO', pointers: { src: '/R/x', dst: '/R/z' } },
    } };

    var diff = diffModel.diff(before, after);
    assert.strictEqual(diff.summary.added, 0);
    assert.strictEqual(diff.summary.removed, 0);
    assert.strictEqual(diff.summary.changed, 1);
    var change = diff.entries.filter(function (e) {
      return e.status === 'changed';
    })[0].changes.filter(function (c) { return c.isPointer; });
    assert.deepStrictEqual(change.map(function (c) { return c.attribute; }),
                           ['dst']);
  });

  it('does not call a pointer changed just because the id did', function () {
    // src still points at the state called A; only the path spelling
    // it is different
    var before = { root: '/r', objects: {
      '/r': { name: 'M', type: 'State Machine' },
      '/r/a': { name: 'A', type: 'State' },
      '/r/1': { name: 't', type: 'Internal Transition', Event: 'GO' },
    } };
    var after = { root: '/R', objects: {
      '/R': { name: 'M', type: 'State Machine' },
      '/R/q': { name: 'A', type: 'State' },
      '/R/1': { name: 't', type: 'Internal Transition', Event: 'GO' },
    } };
    var diff = diffModel.diff(before, after);
    assert.strictEqual(diff.summary.changed, 0);
    assert.ok(diff.entries.some(function (e) { return e.rehomed; }),
              'but it does know they are at different paths');
  });

  it('leaves an ambiguous match alone rather than guessing', function () {
    // two states with the same name under the same parent: pairing
    // one of them with one of the others would be a coin toss, and a
    // wrong pairing reads as a change that never happened
    var before = { root: '/r', objects: {
      '/r': { name: 'M', type: 'State Machine' },
      '/r/a': { name: 'Twin', type: 'State' },
      '/r/b': { name: 'Twin', type: 'State' },
    } };
    var after = { root: '/r', objects: {
      '/r': { name: 'M', type: 'State Machine' },
      '/r/c': { name: 'Twin', type: 'State' },
      '/r/d': { name: 'Twin', type: 'State' },
    } };
    var diff = diffModel.diff(before, after);
    assert.strictEqual(diff.summary.added, 2);
    assert.strictEqual(diff.summary.removed, 2);
    assert.strictEqual(diff.summary.changed, 0);
  });

  it('carries what a transition should be called', function () {
    // Every transition is named "External Transition"; a change list
    // of six of those names nothing. describe.labelFor is the one
    // rule, so the playground panel and the CLI agree.
    var before = example('Simple');
    var after = copy(before);
    var edge = Object.keys(after.objects).filter(function (p) {
      return after.objects[p].Guard;
    })[0];
    var event = after.objects[edge].Event;
    assert.ok(event, 'the fixture transition should carry an event');
    after.objects[edge].Guard = 'somethingElse';

    var entry = diffModel.diff(before, after).entries.filter(function (e) {
      return e.path === edge;
    })[0];
    assert.strictEqual(entry.event, event, 'the entry knows its event');
    assert.strictEqual(describe.labelFor(entry),
                       entry.type + ' ' + event);
    // and a state is still called by its name
    var state = diffModel.diff(before, after).entries.filter(function (e) {
      return e.type === 'State';
    })[0];
    assert.strictEqual(describe.labelFor(state), state.name);
  });

  it('knows a transition from its type alone', function () {
    // a diff entry has no isConnection flag; without asking the
    // metamodel, every external transition was labelled by the name
    // it shares with every other one
    assert.ok(describe.labelledByEvent({ type: 'External Transition' }));
    assert.ok(describe.labelledByEvent({ type: 'Local Transition' }));
    assert.ok(describe.labelledByEvent({ type: 'Internal Transition' }));
    assert.ok(!describe.labelledByEvent({ type: 'State' }));
    assert.ok(!describe.labelledByEvent({ type: 'Made Up' }));
    assert.ok(!describe.labelledByEvent(null));
  });

  it('is stable: the same pair always reads the same way', function () {
    var a = diffModel.diff(example('Medium'), example('Complex'));
    var b = diffModel.diff(example('Medium'), example('Complex'));
    assert.deepStrictEqual(a.entries, b.entries);
    var paths = a.entries.map(function (e) { return e.path; });
    assert.deepStrictEqual(paths.slice().sort(), paths, 'sorted by path');
  });

  it('says both sides in one drawable model', function () {
    var before = example('Medium');
    var after = copy(before);
    // remove a leaf state, and whatever pointed at it
    var leaf = Object.keys(after.objects).filter(function (p) {
      return after.objects[p].type === 'State' &&
        !Object.keys(after.objects).some(function (q) {
          return q !== p && q.indexOf(p + '/') === 0;
        });
    }).pop();
    Object.keys(after.objects).forEach(function (p) {
      var ptr = after.objects[p].pointers || {};
      if (ptr.src === leaf || ptr.dst === leaf) delete after.objects[p];
    });
    delete after.objects[leaf];
    after.objects['/o/NEW'] = { name: 'Fresh', type: 'State',
                                position: { x: 5, y: 5 } };

    var diff = diffModel.diff(before, after);
    var union = diffModel.union(before, after, diff);
    assert.ok(union.model.objects[leaf], 'the removed state is still drawable');
    assert.ok(union.model.objects['/o/NEW'], 'and so is the added one');
    assert.strictEqual(union.model.root, after.root);
  });

  it('re-homes a removed object under whatever its parent became',
     function () {
       // Comparing two unrelated machines pairs their roots, so the
       // removed side's children keep paths that no longer resolve:
       // '/9/x' under a union rooted at '/o' is unreachable, and
       // resolveModel throws. This is how that was found.
       var before = { root: '/9', objects: {
         '/9': { name: 'Old', type: 'State Machine' },
         '/9/a': { name: 'Gone', type: 'State' },
       } };
       var after = { root: '/o', objects: {
         '/o': { name: 'New', type: 'State Machine' },
         '/o/b': { name: 'Kept', type: 'State' },
       } };
       var diff = diffModel.diff(before, after);
       var union = diffModel.union(before, after, diff);

       assert.strictEqual(union.model.root, '/o');
       assert.ok(union.model.objects['/o/a'],
                 'the removed state sits under the surviving root');
       assert.ok(!union.model.objects['/9/a'], 'and not where it used to');
       Object.keys(union.model.objects).forEach(function (path) {
         var parent = path.slice(0, path.lastIndexOf('/'));
         if (!parent) return;
         assert.ok(union.model.objects[parent],
                   path + ' should have a parent in the union');
       });
       // and the entry says where to find it
       var entry = diff.entries.filter(function (e) {
         return e.beforePath === '/9/a';
       })[0];
       assert.strictEqual(entry.unionPath, '/o/a');
     });

  it('rewrites a removed edge to point at where things ended up',
     function () {
       var before = { root: '/9', objects: {
         '/9': { name: 'M', type: 'State Machine' },
         '/9/a': { name: 'A', type: 'State' },
         '/9/b': { name: 'B', type: 'State' },
         '/9/t': { name: 't', type: 'External Transition', Event: 'GO',
                   pointers: { src: '/9/a', dst: '/9/b' } },
       } };
       // A survives under a different id; B and the transition are gone
       var after = { root: '/o', objects: {
         '/o': { name: 'M', type: 'State Machine' },
         '/o/x': { name: 'A', type: 'State' },
       } };
       var diff = diffModel.diff(before, after);
       var union = diffModel.union(before, after, diff);

       assert.deepStrictEqual(union.dropped, [],
                              'nothing should be undrawable here');
       var edge = union.model.objects['/o/t'];
       assert.ok(edge, 'the removed transition is in the union');
       assert.strictEqual(edge.pointers.src, '/o/x',
                          'pointing at the state that survived, by its new id');
       assert.strictEqual(edge.pointers.dst, '/o/b',
                          'and at the removed one, where it was put back');
     });

  it('keeps a removed name that collides with a surviving path',
     function () {
       var before = { root: '/r', objects: {
         '/r': { name: 'M', type: 'State Machine' },
         '/r/a': { name: 'Old', type: 'State' },
       } };
       var after = { root: '/r', objects: {
         '/r': { name: 'M', type: 'State Machine' },
         '/r/a': { name: 'New', type: 'Initial' },   // different type: not a match
       } };
       var diff = diffModel.diff(before, after);
       var union = diffModel.union(before, after, diff);
       assert.strictEqual(union.model.objects['/r/a'].name, 'New',
                          'the surviving object keeps its path');
       var moved = Object.keys(union.model.objects).filter(function (k) {
         return union.model.objects[k].name === 'Old';
       });
       assert.strictEqual(moved.length, 1, 'and the removed one is still there');
       assert.notStrictEqual(moved[0], '/r/a', 'somewhere else');
     });

  it('drops an edge it cannot draw, and says which', function () {
    // an edge whose endpoint is in neither model cannot be drawn --
    // resolveModel throws on it -- so it goes, but not silently
    var before = { root: '/r', objects: {
      '/r': { name: 'M', type: 'State Machine' },
      '/r/a': { name: 'A', type: 'State' },
      '/r/t': { name: 't', type: 'External Transition',
                pointers: { src: '/r/a', dst: '/r/gone' } },
    } };
    var after = { root: '/r', objects: {
      '/r': { name: 'M', type: 'State Machine' },
      '/r/a': { name: 'A', type: 'State' },
    } };
    var diff = diffModel.diff(before, after);
    var union = diffModel.union(before, after, diff);
    assert.deepStrictEqual(union.dropped, ['/r/t']);
    assert.ok(!union.model.objects['/r/t']);
  });

  it('gives every union object a status to colour it by', function () {
    var before = example('Simple');
    var after = copy(before);
    after.objects['/9/NEW'] = { name: 'Extra', type: 'State',
                                position: { x: 1, y: 1 } };
    var diff = diffModel.diff(before, after);
    var union = diffModel.union(before, after, diff);
    Object.keys(union.model.objects).forEach(function (p) {
      assert.ok(union.status[p], p + ' should have a status');
    });
  });

  it('produces a union that resolves, for every pair of examples',
     function () {
       // THE invariant. A union whose objects cannot all be reached
       // from the root is not a drawable model -- resolveModel
       // throws, and the comparison dies in the page rather than in
       // a test. Every pair, both ways round, including a model
       // against itself.
       var names = ['Simple', 'Medium', 'Complex'];
       names.forEach(function (a) {
         names.forEach(function (b) {
           var before = example(a), after = example(b);
           var diff = diffModel.diff(before, after);
           var union = diffModel.union(before, after, diff);
           try {
             resolveModel.resolve(union.model);
           } catch (err) {
             assert.fail(a + ' vs ' + b + ': the union does not resolve: ' +
                         (typeof err === 'string' ? err : err.message));
           }
         });
       });
     });

  it('reads the same whichever form the model arrives in', function () {
    // raw, or already put through toPortable: the exporter is the
    // canonicaliser either way
    var raw = example('Simple');
    var portable = JSON.parse(JSON.stringify(raw));
    assert.deepStrictEqual(diffModel.diff(raw, portable).summary,
                           diffModel.diff(raw, raw).summary);
  });
});
