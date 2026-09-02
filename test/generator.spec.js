/**
 * Generator test suite (no WebGME server required).
 *
 * - checkModel regression tests: one test per model-validation bug
 *   fixed in checkModel.js / processor.js, ensuring each check
 *   actually fires (several silently never fired before).
 * - golden generation tests: run the full resolve -> process ->
 *   render pipeline over test/fixtures/*.json and compare against
 *   the committed golden outputs in test/goldens/<fixture>/.
 *
 *   To regenerate goldens after an intentional template change:
 *     UPDATE_GOLDENS=1 npm test
 */
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var amdLoader = require('../bin/amd-loader');

var FIXTURE_DIR = path.join(__dirname, 'fixtures');
var GOLDEN_DIR = path.join(__dirname, 'goldens');
// The showcase models the playground offers, hand-laid-out and
// exported from WebGME. They are generated from and compared against
// goldens exactly as the fixtures are: the playground refuses to
// bundle an example nothing verifies, and an example that has drifted
// from the generator is worse than no example.
var EXAMPLE_DIR = path.join(__dirname, '..', 'examples');
var NAMESPACE = 'state_machine';

// files whose content is run-dependent and not golden-compared
var IGNORED_ARTIFACTS = ['hfsm_metadata.json'];

var mods = {}; // filled in before()

/** where a model of this name lives -- a fixture, or a shipped example */
function modelPath(name) {
  var asFixture = path.join(FIXTURE_DIR, name + '.json');
  return fs.existsSync(asFixture) ? asFixture
    : path.join(EXAMPLE_DIR, name + '.json');
}

function loadFixture(name) {
  // deep copy so each test gets a fresh model
  return JSON.parse(fs.readFileSync(modelPath(name), 'utf8'));
}

/** every model the goldens cover: the fixtures and the examples */
function generatedModelNames() {
  function jsonIn(dir) {
    return fs.readdirSync(dir)
      .filter(function(f) { return f.slice(-5) === '.json'; })
      .map(function(f) { return f.slice(0, -5); });
  }
  return jsonIn(FIXTURE_DIR).concat(jsonIn(EXAMPLE_DIR)).sort();
}

function processFixture(name) {
  var model = loadFixture(name);
  mods.resolveModel.resolve(model);
  mods.processor.processModel(model);
  return model;
}

function generateArtifacts(name) {
  var model = processFixture(name);
  var artifacts = {};
  Object.assign(artifacts, mods.MetaTemplates.renderHFSM(model, NAMESPACE));
  Object.assign(artifacts, mods.MetaTemplates.renderTestCode(model, NAMESPACE));
  // interop exports
  Object.keys(model.objects).sort().forEach(function(p) {
    var obj = model.objects[p];
    if (obj.type === 'State Machine') {
      artifacts[obj.sanitizedName + '.mmd'] = mods.exporters.toMermaid(model, p);
      artifacts[obj.sanitizedName + '.puml'] = mods.exporters.toPlantUML(model, p);
      artifacts[obj.sanitizedName + '.scxml'] = mods.exporters.toSCXML(model, p);
    }
  });
  return artifacts;
}

/** mutate a copy of the given fixture, expect processModel to throw */
function expectModelError(fixtureName, mutate, errRegex) {
  var model = loadFixture(fixtureName);
  mutate(model.objects);
  mods.resolveModel.resolve(model);
  assert.throws(function() {
    mods.processor.processModel(model);
  }, function(err) {
    var msg = typeof err === 'string' ? err : String(err && err.message || err);
    return errRegex.test(msg);
  }, 'expected error matching ' + errRegex);
}

// metamodel violations are rejected by resolveModel, before the
// checker ever runs, so they need their own expectation helper
function expectResolveError(fixtureName, mutate, errRegex) {
  var model = loadFixture(fixtureName);
  mutate(model.objects);
  assert.throws(function() {
    mods.resolveModel.resolve(model);
  }, function(err) {
    var msg = typeof err === 'string' ? err : String(err && err.message || err);
    return errRegex.test(msg);
  }, 'expected error matching ' + errRegex);
}



describe('hfsm generator', function() {

  before(function() {
    return amdLoader.load([
      'src/common/resolveModel',
      'src/common/processor',
      'src/common/checkModel',
      'src/common/exporters',
      'src/plugins/SoftwareGenerator/templates/MetaTemplates',
    ]).then(function(loaded) {
      mods.resolveModel = loaded[0];
      mods.processor = loaded[1];
      mods.checkModel = loaded[2];
      mods.exporters = loaded[3];
      mods.MetaTemplates = loaded[4];
    });
  });

  describe('checkModel', function() {

    it('accepts the basic fixture', function() {
      processFixture('basic');
    });

    it('accepts the features fixture', function() {
      processFixture('features');
    });

    it('accepts single-character state names', function() {
      var model = loadFixture('basic');
      model.objects['/p/m/Idle'].name = 'Q';
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model); // must not throw
    });

    it('rejects state names that are C++ keywords', function() {
      expectModelError('basic', function(objects) {
        objects['/p/m/Idle'].name = 'class';
      }, /invalid name/);
    });

    it('rejects events on transitions out of choice pseudostates', function() {
      expectModelError('features', function(objects) {
        objects['/p/m/c1'].Event = 'SNEAKY';
      }, /choice states cannot have events/i);
    });

    it('rejects a composite state without an Initial state', function() {
      expectModelError('features', function(objects) {
        delete objects['/p/m/A/i'];
        delete objects['/p/m/A/ti'];
      }, /must have an Initial state/i);
    });

    it('rejects two unguarded transitions on the same event', function() {
      expectModelError('basic', function(objects) {
        objects['/p/m/tStart2'] = {
          name: 'startTransition2', type: 'External Transition',
          Event: 'START',
          pointers: { src: '/p/m/Idle', dst: '/p/m/Active' },
        };
      }, /unguarded transitions have the same Event/i);
    });

    it('rejects choice pseudostate cycles', function() {
      // c -> d already exists in the features fixture (guarded);
      // adding d -> c closes a cycle that would overflow the
      // recursive choice template during generation
      expectModelError('features', function(objects) {
        objects['/p/m/d3'] = {
          name: 'choice2BackToChoice1', type: 'External Transition',
          Guard: '_root->count > 7',
          pointers: { src: '/p/m/d', dst: '/p/m/c' },
        };
      }, /cycle detected/i);
      // self-loop
      expectModelError('features', function(objects) {
        objects['/p/m/c4'] = {
          name: 'choiceSelfLoop', type: 'External Transition',
          Guard: '_root->count > 9',
          pointers: { src: '/p/m/c', dst: '/p/m/c' },
        };
      }, /cycle detected/i);
    });

    it('rejects rootless models whose only top-level object is not a root type', function() {
      var model = {
        objects: {
          '/s': { name: 'Lonely', type: 'State', 'Timer Period': 0.1 },
        },
      };
      assert.throws(function() {
        mods.resolveModel.resolve(model);
      }, /cannot determine model root/);
    });

    it('rejects choice pseudostates without exactly one unguarded exit', function() {
      expectModelError('features', function(objects) {
        delete objects['/p/m/c2'];
      }, /exactly 1 unguarded/i);
    });

    it('rejects leaf states with missing or non-numeric timer periods', function() {
      expectModelError('basic', function(objects) {
        objects['/p/m/Idle']['Timer Period'] = 0;
      }, /finite numeric timer period/i);
      // "abc" and "Infinity" compare false to <= 0 but generate
      // uncompilable `return (double)(abc)`
      expectModelError('basic', function(objects) {
        objects['/p/m/Idle']['Timer Period'] = 'abc';
      }, /finite numeric timer period/i);
      expectModelError('basic', function(objects) {
        objects['/p/m/Idle']['Timer Period'] = 'Infinity';
      }, /finite numeric timer period/i);
      // an empty State_list is not a child: still a leaf
      expectModelError('basic', function(objects) {
        objects['/p/m/Idle']['Timer Period'] = 0;
        objects['/p/m/Idle'].State_list = [];
      }, /finite numeric timer period/i);
    });

    it('rejects an object-form root that is not a valid root', function() {
      var model = loadFixture('basic');
      model.root = { path: '/p/m/Idle' }; // leaf State, object form
      assert.throws(function() {
        mods.resolveModel.resolve(model);
      }, /root must be a Project \/ State Machine \/ Library/);
      var model2 = loadFixture('basic');
      model2.root = { bogus: true };
      assert.throws(function() {
        mods.resolveModel.resolve(model2);
      }, /must be a path string/);
    });

    it('rejects an Initial targeting a state outside the composite', function() {
      // type-legal (a State IS a valid transition target), so only
      // the semantic rule can catch it
      expectModelError('features', function(objects) {
        objects['/p/m/A/ti'].pointers.dst = '/p/m/B';
      }, /must be within the parent/i);
    });

    it('rejects similarly-named events differing only by case', function() {
      expectModelError('basic', function(objects) {
        objects['/p/m/tStop'].Event = 'start';
      }, /similar names/i);
    });

    it('converts a non-parent-child Local Transition to External', function() {
      var model = loadFixture('features');
      // point the local transition at a non-child (B1 is not a child of A)
      model.objects['/p/m/lt'].pointers.dst = '/p/m/B/B1';
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      assert.strictEqual(model.objects['/p/m/lt'].type, 'External Transition');
      // the conversion is a semantic change and must be a VISIBLE
      // warning, not console noise
      assert.ok(model.warnings.some(function(w) {
        return /Local Transition \/p\/m\/lt/.test(w) &&
          /exited and re-entered/.test(w);
      }), 'conversion must be surfaced as a model warning');
    });

    it('rejects Event definition names that only sanitize to valid identifiers', function() {
      // 'BUTTON-PRESS' would sanitize to BUTTON_PRESS, but event
      // names are emitted verbatim -- the raw name must be valid
      expectModelError('payloads', function(objects) {
        objects['/p/m/eBtn'].name = 'BUTTON-PRESS';
      }, /invalid name/i);
    });

    it('rejects Field names that only sanitize to valid identifiers', function() {
      expectModelError('payloads', function(objects) {
        objects['/p/m/eBtn/f1'].name = 'button-id';
      }, /invalid name/i);
    });

    it('rejects structural keys inside attributes', function() {
      // attributes.type would bypass the type validation
      var model = loadFixture('basic');
      model.objects['/p/m/Idle'].attributes = { type: 'state' };
      assert.throws(function() {
        mods.resolveModel.resolve(model);
      }, /structural key 'type'/);
    });

    it('rejects an explicit root that is not a root type', function() {
      var model = loadFixture('basic');
      model.root = '/p/m/Idle'; // a leaf State
      assert.throws(function() {
        mods.resolveModel.resolve(model);
      }, /root must be a Project \/ State Machine \/ Library/);
    });

    it('rejects an End State colliding with a sibling State name', function() {
      expectModelError('basic', function(objects) {
        objects['/p/m/EndTwin'] = {
          name: 'End', type: 'State', 'Timer Period': 0.1,
        };
      }, /collides with sibling State/);
    });

    it('rejects unknown object types (typo protection)', function() {
      var model = loadFixture('basic');
      model.objects['/p/m/Idle'].type = 'state'; // lowercase typo
      assert.throws(function() {
        mods.resolveModel.resolve(model);
      }, /unknown type 'state'/);
    });

    it('rejects events named after generated helper identifiers', function() {
      // `namespace detail` and the free functions live in the same
      // scope as the event typedefs
      ['detail', 'event_data_to_string', 'consume_event'].forEach(function(bad) {
        expectModelError('payloads', function(objects) {
          objects['/p/m/eBtn'].name = bad;
        }, /invalid name/i);
      });
    });

    it('rejects an event named Event (generated-type collision)', function() {
      // would generate `typedef Event<EventEventData> Event;` next to
      // the Event<T> class template -- an illegal redeclaration
      expectModelError('payloads', function(objects) {
        objects['/p/m/eBtn'].name = 'Event';
      }, /invalid name/i);
    });

    it('collapses multiline field descriptions into safe comments', function() {
      var model = loadFixture('payloads');
      model.objects['/p/m/eBtn/f1'].Description =
        'first line\nsecond line becomes raw C++ without the fix';
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      var rendered = mods.MetaTemplates.renderHFSM(model, NAMESPACE);
      var hpp = rendered['Payloads_event_data.hpp'];
      assert.ok(hpp.indexOf(
        '// first line second line becomes raw C++ without the fix') > -1,
        'description should be one commented line');
      assert.ok(hpp.indexOf('\nsecond line') === -1,
                'no description line may escape the comment');
    });

    it('rejects two Event definitions with the same name', function() {
      expectModelError('payloads', function(objects) {
        objects['/p/m/eBtn2'] = {
          name: 'BUTTON_PRESS', type: 'Event',
        };
      }, /Event definitions have the same name/i);
    });

    it('allows same-named Event definitions in different machines', function() {
      // definition uniqueness is scoped per machine (separate
      // generated namespaces)
      var model = loadFixture('payloads');
      Object.assign(model.objects, {
        '/p/m2': { name: 'Second', type: 'State Machine' },
        '/p/m2/i': { name: 'Initial', type: 'Initial' },
        '/p/m2/ti': {
          name: 'InitialTransition', type: 'External Transition',
          pointers: { src: '/p/m2/i', dst: '/p/m2/S' },
        },
        '/p/m2/S': { name: 'Solo', type: 'State', 'Timer Period': 0.1 },
        '/p/m2/eBtn': { name: 'BUTTON_PRESS', type: 'Event' },
      });
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model); // must not throw
      assert.ok(model.objects['/p/m2'].eventDefinitions.BUTTON_PRESS);
    });

    it('allows case-variant event names across machines', function() {
      // the case-collision check is per machine: 'stop' in a second
      // machine does not collide with the first machine's 'STOP'
      var model = loadFixture('payloads');
      Object.assign(model.objects, {
        '/p/m2': { name: 'Second', type: 'State Machine' },
        '/p/m2/i': { name: 'Initial', type: 'Initial' },
        '/p/m2/ti': {
          name: 'InitialTransition', type: 'External Transition',
          pointers: { src: '/p/m2/i', dst: '/p/m2/S' },
        },
        '/p/m2/S': { name: 'Solo', type: 'State', 'Timer Period': 0.1 },
        '/p/m2/eStop': { name: 'stop', type: 'Event' },
      });
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model); // must not throw
      // ...while a case-variant within ONE machine still errors
      // (covered by the existing similar-names test)
    });

    it('pads descriptions ending in a backslash (line splicing)', function() {
      var model = loadFixture('payloads');
      model.objects['/p/m/eBtn/f1'].Description = 'see docs\\';
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      var rendered = mods.MetaTemplates.renderHFSM(model, NAMESPACE);
      var hpp = rendered['Payloads_event_data.hpp'];
      // no comment line may end with a bare backslash (which would
      // splice the next declaration into the comment)
      assert.ok(!/\\\n/.test(hpp),
                'no line in the generated header may end with a backslash');
      assert.ok(hpp.indexOf('see docs\\ ') > -1,
                'padded description should be present');
    });

    it('rejects duplicate field names within an Event', function() {
      expectModelError('payloads', function(objects) {
        objects['/p/m/eBtn/f3'] = {
          name: 'button_id', type: 'Field', Type: 'int',
        };
      }, /two fields named/i);
    });

    it('rejects fields named data (payload alias)', function() {
      expectModelError('payloads', function(objects) {
        objects['/p/m/eBtn/f3'] = {
          name: 'data', type: 'Field', Type: 'int',
        };
      }, /cannot be named 'data'/i);
    });

    it('rejects fields with an empty type', function() {
      expectModelError('payloads', function(objects) {
        objects['/p/m/eBtn/f1'].Type = '  ';
      }, /must have a C\+\+ type/i);
    });

    it('rejects an Event definition case-colliding with a used event', function() {
      expectModelError('payloads', function(objects) {
        objects['/p/m/eStop'] = { name: 'stop', type: 'Event' };
      }, /similar names/i);
    });

    it('rejects dangling parents with an auto-detected root', function() {
      // a valid Project root plus one unlinked State used to pass
      // auto-detection (the State was filtered out of the root
      // candidates and never reachability-checked)
      var model = loadFixture('basic');
      delete model.root;
      model.objects['/p/missing/Orphan'] = {
        name: 'Orphan', type: 'State', 'Timer Period': 0.1,
      };
      assert.throws(function() {
        mods.resolveModel.resolve(model);
      }, /does not resolve to an object/);
    });

    it('rejects parentPath disagreeing with the lexical path', function() {
      // exporters / branch computation use path-prefix containment,
      // so an explicit parentPath must match the path's lexical
      // parent (this also makes containment cycles unrepresentable;
      // the reachability walk keeps a cycle guard as defense)
      var model = loadFixture('basic');
      model.objects['/p/m/Stray'] = {
        name: 'Stray', type: 'State', 'Timer Period': 0.1,
        parentPath: '/p',
      };
      assert.throws(function() {
        mods.resolveModel.resolve(model);
      }, /disagrees with its path/);
    });

    it('rejects history pseudostate names that are invalid identifiers', function() {
      expectModelError('features', function(objects) {
        objects['/p/m/B/H'].name = 'bad/name';
      }, /invalid name/i);
    });

    it('rejects siblings whose generated identifiers collide', function() {
      // 'A-B' and 'A B' both generate A_B_OBJ
      expectModelError('basic', function(objects) {
        objects['/p/m/ab1'] = { name: 'A-B', type: 'State', 'Timer Period': 0.1 };
        objects['/p/m/ab2'] = { name: 'A B', type: 'State', 'Timer Period': 0.1 };
      }, /both generate the identifier A_B_OBJ/);
      // 'Foo' and 'foo' both generate FOO_OBJ
      expectModelError('basic', function(objects) {
        objects['/p/m/f1'] = { name: 'Foo', type: 'State', 'Timer Period': 0.1 };
        objects['/p/m/f2'] = { name: 'foo', type: 'State', 'Timer Period': 0.1 };
      }, /both generate the identifier FOO_OBJ/);
    });

    it('suppresses aliases for generated implementation identifiers', function() {
      var model = loadFixture('payloads');
      model.objects['/p/m'].Declarations =
        'int pressCount = 0;\nfloat speed = 0.0f;\nint _activeState = 0;\nint EventType = 0;';
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      var aliases = model.objects['/p/m/Idle'].rootAliases
          .map(function(a) { return a.name; });
      assert.deepStrictEqual(aliases, ['pressCount', 'speed']);
      var joined = model.warnings.join('\n');
      assert.ok(/_activeState/.test(joined) && /EventType/.test(joined),
                'suppressed identifiers must be warned about');
    });

    it('rejects dangling parentPath with an explicit root', function() {
      var model = loadFixture('basic');
      model.objects['/p/missing/Orphan'] = {
        name: 'Orphan', type: 'State', 'Timer Period': 0.1,
      };
      assert.throws(function() {
        mods.resolveModel.resolve(model);
      }, /does not resolve to an object/);
    });

    it('converts child-to-parent Local Transitions to External', function() {
      // local semantics are parent -> direct child only; the old
      // symmetric check kept the reverse direction local
      var model = loadFixture('features');
      model.objects['/p/m/lt'].pointers = { src: '/p/m/A/A2', dst: '/p/m/A' };
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      assert.strictEqual(model.objects['/p/m/lt'].type, 'External Transition');
    });



    it('drops disabled transitions', function() {
      var model = loadFixture('basic');
      model.objects['/p/m/tStop'].Enabled = false;
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      assert.strictEqual(model.objects['/p/m/tStop'], undefined);
    });
  });

  // The metamodel (src/common/meta.json) is generated from the
  // WebGME meta, so these are the same containment and endpoint
  // rules the editor enforces. Before it existed the standalone
  // pipeline happily generated code from any of these.
  describe('metamodel enforcement', function() {

    it('rejects the metamodel\'s own infrastructure types', function() {
      // 'Language' is a concrete meta type but not a MODEL type: the
      // processor has no notion of it, so accepting one would resolve
      // and then be silently dropped from the output
      expectResolveError('basic', function(objects) {
        objects['/p/lang'] = { name: 'HFSM', type: 'Language' };
      }, /unknown type 'Language'/);
    });

    it('rejects a State Machine nested inside a State', function() {
      // used to be generated as a whole second top-level machine
      expectResolveError('basic', function(objects) {
        objects['/p/m/Idle/nested'] = { name: 'Sneaky', type: 'State Machine' };
      }, /'State Machine' inside a 'State'.*metamodel does not allow/);
    });

    it('rejects an Event parented by a State', function() {
      // used to reach the generated event enum
      expectResolveError('basic', function(objects) {
        objects['/p/m/Idle/ev'] = { name: 'STRAY', type: 'Event' };
      }, /'Event' inside a 'State'.*metamodel does not allow/);
    });

    it('rejects a Field outside an Event', function() {
      expectResolveError('payloads', function(objects) {
        objects['/p/m/Idle/f1'] = { name: 'strayField', type: 'Field', Type: 'int' };
      }, /'Field' inside a 'State'.*metamodel does not allow/);
    });

    it('rejects a transition pointing at the machine itself', function() {
      expectResolveError('features', function(objects) {
        objects['/p/m/A/ti'].pointers.dst = '/p/m';
      }, /'dst' points at a 'State Machine'.*metamodel does not allow/);
    });

    it('accepts every endpoint the metamodel allows', function() {
      // a Pseudostate is a legal transition source, a State a legal
      // target: the enforcement must not be blanket-rejecting
      var model = loadFixture('features');
      mods.resolveModel.resolve(model);
      var initial = model.objects['/p/m/ti'];
      assert.strictEqual(model.objects[initial.pointers.src].type, 'Initial');
      assert.strictEqual(model.objects[initial.pointers.dst].type, 'State');
    });

    it('allows Events under a State Machine and Fields under an Event', function() {
      var model = loadFixture('payloads');
      mods.resolveModel.resolve(model);
      var events = Object.keys(model.objects).filter(function(p) {
        return model.objects[p].type === 'Event';
      });
      assert.ok(events.length > 0, 'fixture should define Events');
      events.forEach(function(p) {
        var parent = model.objects[model.objects[p].parentPath];
        assert.ok(['State Machine', 'Library'].indexOf(parent.type) > -1,
                  p + ' should hang off the machine');
      });
    });
  });

  describe('processor', function() {

    it('collects and sorts unique event names', function() {
      var model = processFixture('features');
      assert.deepStrictEqual(model.objects['/p/m'].eventNames,
        ['BACK', 'CHOOSE', 'FINISH', 'GO_DEEP', 'GO_HIST',
         'LOCAL_GO', 'NEXT', 'TOGGLE']);
    });

    it('computes UnhandledEvents per state branch', function() {
      var model = processFixture('basic');
      // Idle handles only START; the root handles nothing itself
      var idle = model.objects['/p/m/Idle'];
      assert.ok(idle.UnhandledEvents.indexOf('STOP') > -1);
      assert.ok(idle.UnhandledEvents.indexOf('START') === -1);
    });

    it('collects event definitions and includes unused defined events', function() {
      var model = processFixture('payloads');
      var machine = model.objects['/p/m'];
      // CALIBRATE is defined but used by no transition; still an event
      assert.deepStrictEqual(machine.eventNames,
        ['BUTTON_PRESS', 'CALIBRATE', 'FINISH', 'SET_SPEED', 'STOP']);
      var byName = {};
      machine.events.forEach(function(e) { byName[e.name] = e; });
      assert.strictEqual(byName.BUTTON_PRESS.hasData, true);
      assert.deepStrictEqual(
        byName.BUTTON_PRESS.fields.map(function(f) { return f.name; }),
        ['button_id', 'long_press']);
      // STOP has no definition -> empty payload
      assert.strictEqual(byName.STOP.hasData, false);
      // state event infos are marked for the payload alias
      var idle = model.objects['/p/m/Idle'];
      assert.strictEqual(idle.InternalEvents[0].hasData, true);
    });

    it('warns when a state declaration shadows a machine variable', function() {
      var model = loadFixture('payloads');
      // machine declares pressCount; make Idle declare it too
      model.objects['/p/m/Idle'].Declarations = 'int pressCount = 5;';
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      assert.strictEqual(model.warnings.length, 1);
      assert.ok(/Idle/.test(model.warnings[0]));
      assert.ok(/pressCount/.test(model.warnings[0]));
      // the shadowed name must not be aliased in that state (but
      // still is in others)
      var idleAliases = model.objects['/p/m/Idle'].rootAliases
          .map(function(a) { return a.name; });
      assert.deepStrictEqual(idleAliases, ['speed']);
      var runningAliases = model.objects['/p/m/Running'].rootAliases
          .map(function(a) { return a.name; });
      assert.deepStrictEqual(runningAliases, ['pressCount', 'speed']);
      // clean models produce no warnings
      var clean = processFixture('payloads');
      assert.deepStrictEqual(clean.warnings, []);
    });

    it('conservatively treats opaque declarations as shadows', function() {
      // `int pressCount[4];` is opaque to the parser; emitting an
      // alias would silently redirect bare references from the state
      // member to the machine member -- so no alias, plus a warning
      var model = loadFixture('payloads');
      model.objects['/p/m/Idle'].Declarations = 'int pressCount[4];';
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      assert.strictEqual(model.warnings.length, 1);
      assert.ok(/unparsed declaration/.test(model.warnings[0]));
      assert.ok(/pressCount/.test(model.warnings[0]));
      var idleAliases = model.objects['/p/m/Idle'].rootAliases
          .map(function(a) { return a.name; });
      assert.deepStrictEqual(idleAliases, ['speed']);
    });

    it('orders guarded transitions before unguarded, by path', function() {
      var model = processFixture('features');
      var choice = model.objects['/p/m/c'];
      var guards = choice.ExternalTransitions.map(function(t) {
        return t.Guard || '';
      });
      assert.deepStrictEqual(guards,
        ['_root->goLeft', '_root->count > 5', '']);
    });
  });

  describe('order independence', function() {
    it('processes models regardless of object serialization order', function() {
      // children serialized before their parents used to be silently
      // dropped (addBasicParams reset the parent's Substates after
      // makeSubstate had linked them)
      var normal = processFixture('features');
      var model = loadFixture('features');
      var reversed = {};
      Object.keys(model.objects).reverse().forEach(function(p) {
        reversed[p] = model.objects[p];
      });
      model.objects = reversed;
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);

      function substatePaths(machine) {
        var paths = [];
        var visit = function(s) {
          paths.push(s.path);
          (s.Substates || []).forEach(visit);
        };
        (machine.Substates || []).forEach(visit);
        return paths.sort();
      }
      assert.deepStrictEqual(substatePaths(model.objects['/p/m']),
                             substatePaths(normal.objects['/p/m']));
      assert.deepStrictEqual(model.objects['/p/m'].eventNames,
                             normal.objects['/p/m'].eventNames);
      // deep nesting must survive: B2b is three levels down
      var rendered = mods.MetaTemplates.renderHFSM(model, NAMESPACE);
      var hpp = rendered['Features_generated_states.hpp'];
      assert.ok(hpp.indexOf('class StateB2b') > -1,
                'deeply nested state missing from generated code');
    });
  });

  describe('prototype-pollution hardening', function() {
    it('handles event names inherited from Object.prototype', function() {
      // 'constructor' / 'toString' are valid C++ identifiers; plain
      // object accumulators used to drop or crash on them
      var model = loadFixture('basic');
      Object.assign(model.objects, {
        '/p/m/eCtor': { name: 'constructor', type: 'Event' },
        '/p/m/eToStr': { name: 'toString', type: 'Event' },
      });
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model); // must not throw
      var names = model.objects['/p/m'].eventNames;
      assert.strictEqual(
        names.filter(function(n) { return n === 'constructor'; }).length, 1);
      assert.strictEqual(
        names.filter(function(n) { return n === 'toString'; }).length, 1);
      // and the generated enum must actually contain them
      var rendered = mods.MetaTemplates.renderHFSM(model, NAMESPACE);
      var hpp = rendered['Basic_generated_states.hpp'];
      assert.ok(hpp.indexOf('spawn_constructor_event') > -1);
      assert.ok(hpp.indexOf('spawn_toString_event') > -1);
    });
  });

  describe('multi-machine and Library generation', function() {
    it('rejects Library names that are reserved or contain path characters', function() {
      // Library names become C++ identifiers AND artifact file names
      expectModelError('basic', function(objects) {
        objects['/p/m'].type = 'Library';
        objects['/p/m'].name = 'class';
      }, /invalid name/i);
      // '../../outside' must not survive into artifact paths
      expectModelError('basic', function(objects) {
        objects['/p/m'].type = 'Library';
        objects['/p/m'].name = '../../outside';
      }, /invalid name/i);
    });

    it('rejects End State names that are invalid C++ identifiers', function() {
      expectModelError('basic', function(objects) {
        objects['/p/m/end'].name = 'class';
      }, /invalid name/i);
      // the conventional default name 'End State' -> End_State is
      // exempt from the reserved-generated-name list
      var model = loadFixture('basic');
      model.objects['/p/m/end'].name = 'End State';
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model); // must not throw
      var artifacts = mods.MetaTemplates.renderHFSM(model, NAMESPACE);
      assert.ok(artifacts['Basic_generated_states.hpp']
                .indexOf('End_State BASIC_OBJ__END_STATE_OBJ;') > -1);
    });

    it('generates code for Library roots', function() {
      var model = loadFixture('basic');
      model.objects['/p/m'].type = 'Library';
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      var artifacts = mods.MetaTemplates.renderHFSM(model, NAMESPACE);
      assert.ok(artifacts['Basic_generated_states.hpp'],
                'Library roots must generate code, not be silently skipped');
    });

    it('generates per-machine Makefiles when a model has several machines', function() {
      var model = loadFixture('basic');
      Object.assign(model.objects, {
        '/p/m2': { name: 'Second', type: 'State Machine' },
        '/p/m2/i': { name: 'Initial', type: 'Initial' },
        '/p/m2/ti': {
          name: 'InitialTransition', type: 'External Transition',
          pointers: { src: '/p/m2/i', dst: '/p/m2/S' },
        },
        '/p/m2/S': { name: 'Solo', type: 'State', 'Timer Period': 0.1 },
      });
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      var artifacts = mods.MetaTemplates.renderTestCode(model, NAMESPACE);
      assert.ok(artifacts['Makefile.Basic'], 'per-machine Makefile.Basic');
      assert.ok(artifacts['Makefile.Second'], 'per-machine Makefile.Second');
      assert.strictEqual(artifacts['Makefile'], undefined,
                         'no ambiguous shared Makefile with several machines');
      // single-machine models keep the conventional name
      var single = generateArtifacts('basic');
      assert.ok(single['Makefile']);
    });

    it('rejects colliding artifact names from same-named machines', function() {
      var model = loadFixture('basic');
      Object.assign(model.objects, {
        '/p/m2': { name: 'Basic', type: 'State Machine' },
        '/p/m2/i': { name: 'Initial', type: 'Initial' },
        '/p/m2/ti': {
          name: 'InitialTransition', type: 'External Transition',
          pointers: { src: '/p/m2/i', dst: '/p/m2/S' },
        },
        '/p/m2/S': { name: 'Solo', type: 'State', 'Timer Period': 0.1 },
      });
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      assert.throws(function() {
        mods.MetaTemplates.renderHFSM(model, NAMESPACE);
      }, /collides with another machine/);
    });

    it('CLI rejects invalid namespaces', function() {
      var execFileSync = require('child_process').execFileSync;
      var out;
      try {
        execFileSync(process.execPath,
                     [path.join(__dirname, '..', 'bin', 'hfsm-gen.js'),
                      path.join(FIXTURE_DIR, 'basic.json'),
                      '-n', 'bad namespace!',
                      '-o', path.join(require('os').tmpdir(), 'hfsm-ns-test')],
                     { encoding: 'utf8', stdio: 'pipe' });
        assert.fail('CLI must reject an invalid namespace');
      } catch (e) {
        assert.notStrictEqual(e.status, 0);
        assert.ok(/invalid C\+\+ namespace/.test(String(e.stderr)),
                  'error must name the invalid namespace');
      }
      // keyword segments pass the shape regex but cannot compile
      try {
        execFileSync(process.execPath,
                     [path.join(__dirname, '..', 'bin', 'hfsm-gen.js'),
                      path.join(FIXTURE_DIR, 'basic.json'),
                      '-n', 'espp::class',
                      '-o', path.join(require('os').tmpdir(), 'hfsm-ns-test')],
                     { encoding: 'utf8', stdio: 'pipe' });
        assert.fail('CLI must reject keyword namespace segments');
      } catch (e2) {
        assert.notStrictEqual(e2.status, 0);
        assert.ok(/are C\+\+ keywords/.test(String(e2.stderr)),
                  'error must name the keyword segment');
      }
    });
  });

  describe('exporters', function() {
    it('emits the history default through the parent initial transition', function() {
      // an unused history falls back via parent.initialize() in the
      // runtime, which runs the initial transition's Action -- SCXML
      // must carry it too
      var model = loadFixture('features');
      model.objects['/p/m/B/ti'].Action = 'printf("init B");';
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      var scxml = mods.exporters.toSCXML(model, '/p/m');
      assert.ok(/<history[^>]*type="shallow">\s*<transition target="[^"]+">\s*<script>printf\(&quot;init B&quot;\);<\/script>\s*<\/transition>\s*<\/history>/.test(scxml),
                'history default must carry the initial transition action');
    });

    it('preserves initial-transition actions in SCXML', function() {
      var model = loadFixture('features');
      // nested initial (StateA's) gets executable content...
      model.objects['/p/m/A/ti'].Action = 'printf("init A");';
      // ...and the ROOT initial's action rides in the hfsm: namespace
      model.objects['/p/m/ti'].Action = 'printf("init root");';
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      var scxml = mods.exporters.toSCXML(model, '/p/m');
      assert.ok(/<initial>\s*<transition target="[^"]+">\s*<script>printf\(&quot;init A&quot;\);<\/script>\s*<\/transition>\s*<\/initial>/.test(scxml),
                'nested initial action must be executable content');
      assert.ok(scxml.indexOf(
        'hfsm:initial-action="printf(&quot;init root&quot;);"') > -1,
                'root initial action must be carried in the hfsm namespace');
    });

    it('generates collision-free ids for similar paths', function() {
      // '/p/m/a-b' and '/p/m/a_b' must not encode to the same id
      var model = loadFixture('basic');
      Object.assign(model.objects, {
        '/p/m/a-b': { name: 'DashState', type: 'State', 'Timer Period': 0.1 },
        '/p/m/a_b': { name: 'UnderState', type: 'State', 'Timer Period': 0.1 },
      });
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model);
      var scxml = mods.exporters.toSCXML(model, '/p/m');
      var dashId = /<state id="([^"]+)" hfsm:name="DashState"/.exec(scxml);
      var underId = /<state id="([^"]+)" hfsm:name="UnderState"/.exec(scxml);
      assert.ok(dashId && underId, 'both states must be exported');
      assert.notStrictEqual(dashId[1], underId[1],
                            'similar paths must get distinct ids');
    });

    it('emits SCXML transitions in runtime priority order', function() {
      // SCXML selects transitions by document order: the guarded
      // internal BUTTON_PRESS transition must precede the unguarded
      // external one within Idle, matching the runtime's
      // internal-first, guarded-before-unguarded semantics
      var artifacts = generateArtifacts('payloads');
      var scxml = artifacts['Payloads.scxml'];
      var internalIdx = scxml.indexOf(
        '<transition event="BUTTON_PRESS" cond=');
      var externalIdx = scxml.indexOf(
        '<transition event="BUTTON_PRESS" target=');
      assert.ok(internalIdx > -1, 'internal BUTTON_PRESS transition missing');
      assert.ok(externalIdx > -1, 'external BUTTON_PRESS transition missing');
      assert.ok(internalIdx < externalIdx,
                'internal transition must precede external (document order = priority)');
    });
  });

  describe('generation goldens', function() {
    generatedModelNames().forEach(function(name) {
      it('matches goldens for: ' + name, function() {
        var artifacts = generateArtifacts(name);
        var goldenDir = path.join(GOLDEN_DIR, name);

        if (process.env.UPDATE_GOLDENS) {
          fs.rmSync(goldenDir, { recursive: true, force: true });
          fs.mkdirSync(goldenDir, { recursive: true });
          Object.keys(artifacts).sort().forEach(function(fname) {
            if (IGNORED_ARTIFACTS.indexOf(fname) > -1) return;
            fs.writeFileSync(path.join(goldenDir, fname), artifacts[fname]);
          });
          return;
        }

        assert.ok(fs.existsSync(goldenDir),
                  'no goldens for ' + name + '; run UPDATE_GOLDENS=1 npm test');
        var goldenFiles = fs.readdirSync(goldenDir).sort();
        var artifactNames = Object.keys(artifacts).filter(function(f) {
          return IGNORED_ARTIFACTS.indexOf(f) === -1;
        }).sort();
        assert.deepStrictEqual(artifactNames, goldenFiles,
                               'generated file list differs from goldens');
        goldenFiles.forEach(function(fname) {
          var expected = fs.readFileSync(path.join(goldenDir, fname), 'utf8');
          assert.strictEqual(artifacts[fname], expected,
                             'generated ' + fname + ' differs from golden');
        });
      });
    });
  });

  describe('checkModel.nameProblem', function() {
    // The editor refuses names through this so that it refuses exactly
    // what the checker refuses. These assertions are the contract
    // between them.

    it('sanitizes most names before judging them', function() {
      assert.strictEqual(mods.checkModel.nameProblem('State', 'State 1'), null);
      assert.strictEqual(mods.checkModel.nameProblem('State', 'Wait-For-Ack'), null);
      assert.ok(mods.checkModel.nameProblem('State', '2fast'));
      assert.ok(mods.checkModel.nameProblem('State', 'class'));
    });

    it('judges an Event or Field name exactly as typed', function() {
      // emitted verbatim, so sanitizing here would accept a name the
      // generator cannot use
      assert.ok(mods.checkModel.nameProblem('Event', 'BUTTON-PRESS'));
      assert.strictEqual(mods.checkModel.nameProblem('Event', 'BUTTON_PRESS'), null);
      assert.ok(mods.checkModel.nameProblem('Field', 'val 1'));
      assert.strictEqual(mods.checkModel.nameProblem('Field', 'val_1'), null);
    });

    it('lets an End State be called End State, and nothing else be',
       function() {
         assert.strictEqual(mods.checkModel.nameProblem('End State', 'End State'), null);
         assert.strictEqual(mods.checkModel.nameProblem('End State', 'End_State'), null);
         assert.ok(mods.checkModel.nameProblem('State', 'End State'),
                   'a State may not generate the reserved End_State');
         assert.ok(mods.checkModel.nameProblem('End State', 'class'));
       });

    it('agrees with the checks the checker actually runs', function() {
      // every name in every fixture passes, or the fixtures would not
      // generate
      ['basic', 'features', 'payloads'].forEach(function(name) {
        var model = processFixture(name);
        Object.keys(model.objects).forEach(function(p) {
          var obj = model.objects[p];
          if (!obj.name || obj.type === 'Project') return;
          assert.strictEqual(mods.checkModel.nameProblem(obj.type, obj.name), null,
                             name + ' ' + p + ' (' + obj.type + ') named "' +
                             obj.name + '" should be accepted');
        });
      });
    });
  });
});
