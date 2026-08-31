#!/usr/bin/env node
/**
 * Verify the assembled static playground.
 *
 * The playground's value rests on one property: it runs the SAME
 * generator as the CLI, so its output cannot drift. This checks that
 * by loading the modules *out of the build output* and regenerating
 * every fixture, comparing against the committed goldens -- the same
 * files test/generator.spec.js checks.
 *
 * It also asserts the build is self-contained (no CDN / absolute
 * references), because "works offline / hosts anywhere" is the whole
 * point of shipping it this way.
 *
 * Usage: node scripts/verify-web-build.js [dist/web]
 */
'use strict';

var fs = require('fs');
var path = require('path');

var repoRoot = path.resolve(__dirname, '..');
var dist = process.argv[2] || path.join(repoRoot, 'dist', 'web');
var goldenDir = path.join(repoRoot, 'test', 'goldens');
var NAMESPACE = 'state_machine';
var IGNORED = ['hfsm_metadata.json'];

function fail(msg) {
  console.error('verify-web-build: ' + msg);
  process.exit(1);
}

function must(file) {
  var p = path.join(dist, file);
  if (!fs.existsSync(p)) fail('missing from build: ' + file);
  return p;
}

// ---- 1. structure -------------------------------------------------
['index.html', 'app.js', 'app.css',
 'vendor/require.js', 'vendor/text.js',
 'vendor/handlebars.min.js', 'vendor/underscore-umd.js',
 // CodeMirror: the mode files resolve '../../lib/codemirror'
 // relative to themselves, so this layout must be preserved
 'vendor/codemirror/lib/codemirror.js', 'vendor/codemirror/lib/codemirror.css',
 'vendor/codemirror/mode/javascript/javascript.js',
 'vendor/codemirror/mode/clike/clike.js',
 'vendor/codemirror/mode/xml/xml.js',
 'vendor/codemirror/mode/shell/shell.js',
 'src/common/resolveModel.js', 'src/common/processor.js',
 'src/common/checkModel.js', 'src/common/declParser.js',
 'src/common/exporters.js',
 'src/plugins/SoftwareGenerator/templates/MetaTemplates.js',
 'src/plugins/SoftwareGenerator/templates/uml/Templates.js',
 'src/plugins/SoftwareGenerator/templates/uml/static/magic_enum.hpp',
].forEach(must);

// ---- 2. self-contained -------------------------------------------
var html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
// only ASSET references matter here: an <a href> to the repo is fine,
// a <script src> or <link href> pointing at a CDN is not
var assetRefs = html.match(
  /<(?:script|img)\b[^>]*\bsrc\s*=\s*"[^"]*"|<link\b[^>]*\bhref\s*=\s*"[^"]*"/gi) || [];
var remote = assetRefs.filter(function (ref) {
  return /["'](https?:)?\/\//.test(ref.replace(/^[^"]*"/, '"'));
});
if (remote.length) {
  fail('index.html loads remote assets (the build must work ' +
       'offline): ' + remote.join(', '));
}

// ---- 3. the copied generator matches the source -------------------
fs.readdirSync(path.join(repoRoot, 'src', 'common'))
  .filter(function (f) { return f.slice(-3) === '.js'; })
  .forEach(function (f) {
    var a = fs.readFileSync(path.join(repoRoot, 'src', 'common', f), 'utf8');
    var b = fs.readFileSync(path.join(dist, 'src', 'common', f), 'utf8');
    if (a !== b) fail('src/common/' + f + ' differs from the build copy');
  });

// ---- 4. same output as the CLI / goldens --------------------------
var requirejs = require('requirejs');
requirejs.config({
  baseUrl: dist,
  nodeRequire: require,
  paths: {
    'bower/handlebars/handlebars.min': path.join(dist, 'vendor/handlebars.min'),
    'underscore': path.join(dist, 'vendor/underscore-umd'),
    // from the BUILD, not node_modules: the point is to exercise the
    // artifacts the browser will actually load
    'text': path.join(dist, 'vendor/text'),
    'hfsm': path.join(dist, 'src/common'),
    'templates': path.join(dist, 'src/plugins/SoftwareGenerator/templates'),
  },
});

requirejs([
  'hfsm/resolveModel', 'hfsm/processor', 'hfsm/exporters',
  'templates/MetaTemplates',
], function (resolveModel, processor, exporters, MetaTemplates) {
  var fixtures = fs.readdirSync(path.join(dist, 'examples'))
      .filter(function (f) { return f.slice(-5) === '.json'; });
  if (!fixtures.length) fail('no example models were bundled');

  var checked = 0;
  fixtures.forEach(function (file) {
    var name = file.slice(0, -5);
    var golden = path.join(goldenDir, name);
    if (!fs.existsSync(golden)) {
      console.log('  (no goldens for ' + name + ', skipping output check)');
      return;
    }
    var model = JSON.parse(
      fs.readFileSync(path.join(dist, 'examples', file), 'utf8'));
    resolveModel.resolve(model);
    processor.processModel(model);

    var artifacts = {};
    Object.assign(artifacts, MetaTemplates.renderHFSM(model, NAMESPACE));
    Object.assign(artifacts, MetaTemplates.renderTestCode(model, NAMESPACE));
    Object.keys(model.objects).sort().forEach(function (p) {
      var obj = model.objects[p];
      // State Machine AND Library -- hfsm-gen and web/app.js export
      // both, so this must too or it could miss drift
      if (obj.type === 'State Machine' || obj.type === 'Library') {
        artifacts[obj.sanitizedName + '.mmd'] = exporters.toMermaid(model, p);
        artifacts[obj.sanitizedName + '.puml'] = exporters.toPlantUML(model, p);
        artifacts[obj.sanitizedName + '.scxml'] = exporters.toSCXML(model, p);
      }
    });

    fs.readdirSync(golden).forEach(function (gf) {
      if (IGNORED.indexOf(gf) > -1) return;
      var expected = fs.readFileSync(path.join(golden, gf), 'utf8');
      if (artifacts[gf] === undefined) {
        fail(name + ': the build did not generate ' + gf);
      }
      if (artifacts[gf] !== expected) {
        fail(name + ': ' + gf + ' generated from the build differs from ' +
             'the golden -- the playground has drifted from the CLI');
      }
      checked++;
    });
  });

  console.log('verify-web-build: OK (' + fixtures.length + ' models, ' +
              checked + ' files identical to the goldens)');
}, function (err) {
  fail('could not load the generator from the build: ' + err.message);
});
