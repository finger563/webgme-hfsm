'use strict';

/**
 * Every code attribute a model can set must either REACH the
 * generated output or be REFUSED. The third option -- accepted,
 * stored, and silently dropped -- is the one this file exists to
 * stop, because nothing else could see it.
 *
 * `State . Initialization` was in exactly that state. A state
 * inherits the attribute from State Machine Base, no template ever
 * rendered it, and no rule rejected it: code typed into it was saved
 * in the model, generated nothing, and said nothing. The inspector
 * even reported the truth -- "not emitted in the generated code" --
 * which read as a bug in the inspector rather than in the generator.
 *
 * The sweep below finds that class of fault rather than that one
 * instance of it.
 */

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

var amdLoader = require('../bin/amd-loader');
var repoRoot = path.resolve(__dirname, '..');

// identifiers and numbers: constrained elsewhere, and stamping a
// comment into them is not a meaningful question
var NOT_CODE = ['name', 'Event', 'namespace', 'Timer Period'];

describe('what a model can set, the generator must use or refuse', function() {
  var mods = {};
  var meta;

  before(function() {
    meta = JSON.parse(fs.readFileSync(
      path.join(repoRoot, 'src/common/meta.json'), 'utf8'));
    return amdLoader.load([
      'src/common/resolveModel',
      'src/common/processor',
      'src/common/checkModel',
      'src/plugins/SoftwareGenerator/templates/MetaTemplates',
    ]).then(function(loaded) {
      mods.resolveModel = loaded[0];
      mods.processor = loaded[1];
      mods.checkModel = loaded[2];
      mods.MetaTemplates = loaded[3];
    });
  });

  /**
   * Generate, or report why the model was refused.
   *
   * Only a MODEL error counts as a refusal. An earlier version of this
   * caught everything, so a typo in the harness (resolveModel.resolve
   * is not resolveModel.resolveModel) made every model look refused
   * and the sweep passed without ever generating anything.
   */
  function render(model) {
    var copy = JSON.parse(JSON.stringify(model));
    try {
      mods.resolveModel.resolve(copy);
      mods.processor.processModel(copy);
    } catch (e) {
      var text = (e && e.message) || String(e);
      if (e instanceof TypeError || /is not a function/.test(text)) throw e;
      return { refused: text };
    }
    var out = {};
    Object.assign(out, mods.MetaTemplates.renderHFSM(copy, 'test_ns'));
    Object.assign(out, mods.MetaTemplates.renderTestCode(copy, 'test_ns'));
    return { text: Object.keys(out).map(function(f) { return out[f]; }).join('\n') };
  }

  var FIXTURE = 'examples/Complex.json';

  it('leaves no code attribute both accepted and unused', function() {
    var base = JSON.parse(fs.readFileSync(path.join(repoRoot, FIXTURE), 'utf8'));
    var types = meta.types || meta;

    // every (type, attribute) this fixture can actually exercise
    var pairs = {};
    Object.keys(base.objects).forEach(function(objPath) {
      var obj = base.objects[objPath];
      var declared = (types[obj.type] || {}).attributes || {};
      Object.keys(declared).forEach(function(attribute) {
        if (declared[attribute].type !== 'string') return;
        if (NOT_CODE.indexOf(attribute) > -1) return;
        var key = obj.type + '|' + attribute;
        (pairs[key] = pairs[key] || []).push(objPath);
      });
    });
    assert.isAbove(Object.keys(pairs).length, 10,
      'the fixture should cover a good spread of attributes');

    var dropped = [];
    Object.keys(pairs).sort().forEach(function(key) {
      var parts = key.split('|'), attribute = parts[1];
      var model = JSON.parse(JSON.stringify(base));
      var stamp = 'ZQ' + attribute.replace(/[^A-Za-z]/g, '') + 'ZQ';
      pairs[key].forEach(function(objPath) {
        var obj = model.objects[objPath];
        var had = typeof obj[attribute] === 'string' && obj[attribute].trim();
        obj[attribute] = (had ? obj[attribute] + '\n' : '') + '// ' + stamp;
      });

      var result = render(model);
      if (result.refused) return;                    // refused: said so
      if (result.text.indexOf(stamp) > -1) return;   // emitted: used
      dropped.push(key.replace('|', ' . '));
    });

    assert.deepEqual(dropped, [],
      'these are accepted by the checker and never reach the generated ' +
      'code, so anything written in them runs nowhere: ' + dropped.join(', '));
  });
});
