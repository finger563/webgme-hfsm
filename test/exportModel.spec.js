'use strict';

/**
 * Exporting a model has one job: what comes back in must be the same
 * machine that went out, layout included.
 *
 * The layout part is the reason this exists. Arranging a state chart
 * so it reads well is real work, and a format that drops it makes
 * that work disposable -- and makes the same model draw differently
 * in the editor and in the playground.
 */

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var amdLoader = require('../bin/amd-loader');

var mods = {};
var repoRoot = path.resolve(__dirname, '..');

function fixture(name) {
  return JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'test/fixtures', name + '.json'), 'utf8'));
}

describe('exportModel', function() {

  before(function() {
    return amdLoader.load([
      'src/common/exportModel',
      'src/common/resolveModel',
      'src/common/processor',
      'src/common/meta',
    ]).then(function(loaded) {
      mods.exportModel = loaded[0];
      mods.resolveModel = loaded[1];
      mods.processor = loaded[2];
      mods.meta = loaded[3];
    });
  });

  it('keeps positions, rounded to whole pixels', function() {
    var model = fixture('basic');
    model.objects['/p/m/Idle'].position = { x: 120.4, y: 40.6 };
    mods.resolveModel.resolve(model);

    var out = mods.exportModel.toPortable(model);
    assert.deepStrictEqual(out.objects['/p/m/Idle'].position, { x: 120, y: 41 });
  });

  it('omits a position rather than inventing one', function() {
    var model = fixture('basic');
    mods.resolveModel.resolve(model);
    var out = mods.exportModel.toPortable(model);
    assert.ok(!('position' in out.objects['/p/m/Idle']),
              'a model without a layout should not gain a made-up one');
  });

  it('keeps attributes the author set, wherever they wrote them', function() {
    // basic.json writes attributes at the top level; webgme-to-json
    // nests them under `attributes`. Both must survive.
    var model = fixture('basic');
    mods.resolveModel.resolve(model);
    var out = mods.exportModel.toPortable(model);
    assert.strictEqual(out.objects['/p/m'].Includes, '#include <cstdio>');
    assert.strictEqual(out.objects['/p/m'].Declarations, 'int startCount = 0;');

    var nested = fixture('basic');
    var idle = nested.objects['/p/m/Idle'];
    nested.objects['/p/m/Idle'] = {
      name: idle.name, type: idle.type,
      attributes: { Entry: idle.Entry, 'Timer Period': idle['Timer Period'] },
    };
    mods.resolveModel.resolve(nested);
    var out2 = mods.exportModel.toPortable(nested);
    assert.strictEqual(out2.objects['/p/m/Idle'].Entry, idle.Entry);
  });

  it('drops attributes still at their metamodel default', function() {
    var model = fixture('basic');
    mods.resolveModel.resolve(model);   // fills in every default
    var out = mods.exportModel.toPortable(model);
    // Enabled defaults to true, so a plain transition should not
    // carry it; otherwise every export grows every default
    assert.ok(!('Enabled' in out.objects['/p/m/tStart']),
              'a default-valued attribute should not be written out');
    assert.strictEqual(mods.meta.types['External Transition']
                       .attributes.Enabled.default, true);
  });

  it('drops derived fields the processor adds', function() {
    var model = fixture('features');
    mods.resolveModel.resolve(model);
    mods.processor.processModel(model);   // adds Substates, *_list, ...
    var out = mods.exportModel.toPortable(model);
    Object.keys(out.objects).forEach(function(p) {
      Object.keys(out.objects[p]).forEach(function(key) {
        assert.ok(!/(_list|Substates|sanitizedName|LABEL|childPaths|parentPath)/.test(key),
                  p + ' exported a derived field: ' + key);
      });
    });
  });

  it('round-trips: the export generates the same code as the original',
     function() {
       // the guarantee that matters -- a model can go out and come
       // back without becoming a different machine
       ['basic', 'features', 'payloads'].forEach(function(name) {
         var original = fixture(name);
         mods.resolveModel.resolve(original);
         mods.processor.processModel(original);

         var exported = fixture(name);
         mods.resolveModel.resolve(exported);
         var text = mods.exportModel.toJSON(exported);
         var reimported = JSON.parse(text);
         mods.resolveModel.resolve(reimported);
         mods.processor.processModel(reimported);

         // compare what the templates actually consume
         assert.deepStrictEqual(
           Object.keys(reimported.objects).sort(),
           Object.keys(original.objects).sort(),
           name + ': the object set changed');
         Object.keys(original.objects).forEach(function(p) {
           var a = original.objects[p], b = reimported.objects[p];
           assert.strictEqual(b.type, a.type, name + ' ' + p + ': type');
           assert.strictEqual(b.name, a.name, name + ' ' + p + ': name');
           assert.deepStrictEqual(b.pointers, a.pointers,
                                  name + ' ' + p + ': pointers');
         });
       });
     });

  it('survives a second export unchanged', function() {
    // exporting an export must be a no-op, or every save would churn
    var model = fixture('features');
    mods.resolveModel.resolve(model);
    var once = mods.exportModel.toJSON(model);

    var again = JSON.parse(once);
    mods.resolveModel.resolve(again);
    assert.strictEqual(mods.exportModel.toJSON(again), once,
                       'a second export should be byte-identical');
  });
});
