'use strict';

/**
 * The "Add child..." dialog.
 *
 * It builds a form for a node that does not exist yet, which makes it
 * the one place where a bad value can be stopped before anything is
 * created. It is also the place most likely to drift: it renders its
 * own markup, so nothing forces it to agree with the inspector about
 * which attributes a type has, what order they go in, or whether an
 * Entry block is a one-line input.
 *
 * Nothing here touches a DOM. The dialog's prototype methods are
 * called against a stand-in object with the two things they read --
 * the schemas and the selected type -- so what is under test is the
 * RULES it applies, not jQuery.
 */

var assert = require('assert');
var path = require('path');

var repoRoot = path.resolve(__dirname, '..');

function dialogContext(name) {
  var requirejs = require('requirejs');
  return requirejs.config({
    context: name,
    baseUrl: repoRoot,
    nodeRequire: require,
    paths: {
      hfsm: path.join(repoRoot, 'src/common'),
      // the dialog renders markup, so this one has to substitute --
      // see the note in the stub
      'bower/mustache.js/mustache.min': 'test/stubs/mustache-render',
    },
    map: {
      '*': {
        text: 'test/stubs/text',
        css: 'test/stubs/css',
      },
    },
  });
}

describe('the create dialog', function () {

  var Dialog, describeMod, metaRules;

  before(function () {
    this.timeout(10000);
    var req = dialogContext('create-dialog');
    return new Promise(function (resolve, reject) {
      req(['src/visualizers/widgets/HFSMViz/Dialog/Dialog',
           'hfsm/viz/describe', 'hfsm/metaRules'],
          function (D, d, m) {
            Dialog = D;
            describeMod = d;
            metaRules = m;
            resolve();
          }, reject);
    });
  });

  /** the attributes the metamodel declares for a type */
  function attrs(type) {
    var declared = metaRules.types[type].attributes;
    return Object.keys(declared).map(function (name) {
      return { name: name, type: declared[name].type };
    });
  }

  /**
   * A dialog with a type selected, and no DOM behind it: the form
   * rules are all that is being asked about.
   */
  function forType(type) {
    var dialog = Object.create(Dialog.prototype);
    dialog._schemas = {};
    dialog._schemas[type] = {
      name: type,
      isConnection: metaRules.isConnection(type),
      attributes: attrs(type),
    };
    dialog.getSelectedChildType = function () { return type; };
    return dialog;
  }

  function names(list) {
    return list.map(function (a) { return a.name; });
  }

  it('does not offer to name a transition', function () {
    // The fix this test exists for: the dialog listed schema.attributes
    // verbatim, so it offered a `name` the generator never emits --
    // while the inspector, on the same node a moment later, did not.
    ['Internal Transition'].concat(
      Object.keys(metaRules.types).filter(function (t) {
        return !metaRules.isAbstract(t) && metaRules.isConnection(t);
      })
    ).forEach(function (type) {
      assert.ok(names(forType(type).getCurrentAttributes()).indexOf('name') === -1,
                type + ' should not offer a name');
    });
  });

  it('keeps the name on everything else', function () {
    assert.ok(names(forType('State').getCurrentAttributes()).indexOf('name') > -1);
  });

  it('asks describe which attributes to show, and in what order', function () {
    // not "the same list" by coincidence -- the same call
    Object.keys(metaRules.types).forEach(function (type) {
      if (metaRules.isAbstract(type)) return;
      var dialog = forType(type);
      assert.deepStrictEqual(
        dialog.getCurrentAttributes(),
        describeMod.editableAttributes(dialog.getCurrentSchema()),
        type + ': the form is what describe says it is');
    });
  });

  it('gives code and prose room, and a one-line input to everything else',
     function () {
       var dialog = forType('State');
       dialog.getCurrentAttributes().forEach(function (a) {
         var html = dialog.renderAttributeForm(a);
         var kind = describeMod.fieldKind(a);
         if (kind === 'code' || kind === 'prose') {
           assert.ok(html.indexOf('<textarea') > -1,
                     a.name + ' (' + kind + ') should be a textarea');
           assert.ok(html.indexOf('dialog-' + kind) > -1,
                     a.name + ' should say which of the two it is');
         } else {
           assert.ok(html.indexOf('<input') > -1,
                     a.name + ' (' + kind + ') should be an input');
         }
       });
     });

  it('spell-checks prose and leaves C++ alone', function () {
    var dialog = forType('State');
    var code = dialog.renderAttributeForm({ name: 'Entry', type: 'string' });
    var prose = dialog.renderAttributeForm({ name: 'documentation', type: 'string' });
    assert.ok(code.indexOf('spellcheck="false"') > -1,
              'an identifier is not a misspelt word');
    assert.ok(prose.indexOf('spellcheck="true"') > -1);
  });

  it('maps checkbox and number onto real input types', function () {
    var dialog = forType('State');
    assert.ok(dialog.renderAttributeForm({ name: 'isComplete', type: 'boolean' })
              .indexOf('type="checkbox"') > -1);
    assert.ok(dialog.renderAttributeForm({ name: 'Timer Period', type: 'float' })
              .indexOf('type="number"') > -1);
    assert.ok(dialog.renderAttributeForm({ name: 'name', type: 'string' })
              .indexOf('type="text"') > -1);
  });

  it('ties each error message to the field it is about', function () {
    // A refusal only a sighted user can find is not a refusal: it is
    // a form that will not submit for no visible reason.
    var dialog = forType('State');
    [{ name: 'name', type: 'string' },        // an input
     { name: 'Entry', type: 'string' }        // a textarea
    ].forEach(function (a) {
      var html = dialog.renderAttributeForm(a);
      assert.ok(html.indexOf('aria-describedby="e' + a.name + '"') > -1,
                a.name + ': the field should point at its message');
      assert.ok(/id="e[^"]*" role="alert"/.test(html),
                a.name + ': and the message should be announced');
    });
  });

  it('refuses a name the generator could not use', function () {
    var dialog = forType('State');
    var name = { name: 'name', type: 'string' };
    assert.ok(dialog.problem(name, ''), 'a state needs a name');
    assert.ok(dialog.problem(name, '1State'), 'not a C++ identifier');
    assert.strictEqual(dialog.problem(name, 'Idle'), null);
    // sanitized, exactly as checkModel allows elsewhere -- this form
    // must not be stricter than the checker, or it refuses names the
    // model already contains
    assert.strictEqual(dialog.problem(name, 'State 1'), null);
  });

  it('checks the value it would store, not the one that was typed', function () {
    var dialog = forType('External Transition');
    var event = { name: 'Event', type: 'string' };
    assert.strictEqual(dialog.normalize(event, '  GO  '), 'GO',
                       'the space was never meant');
    // and a non-identifier attribute is left exactly as typed: leading
    // space in an Entry block is indentation
    assert.strictEqual(dialog.normalize({ name: 'Entry', type: 'string' },
                                        '  int x = 1;'),
                       '  int x = 1;');
  });

  it('leaves a value with no identifier rule alone', function () {
    var dialog = forType('State');
    assert.strictEqual(dialog.problem({ name: 'Entry', type: 'string' },
                                      'not; valid; c++ ('), null,
                       'code is checked by the compiler, not by this form');
  });
});
