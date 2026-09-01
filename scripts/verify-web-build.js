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
 // the visualizer and the contracts it runs on
 'viz.js',
 'src/common/viz/ModelBackend.js', 'src/common/viz/HostServices.js',
 'src/common/viz/LocalBackend.js', 'src/common/viz/describe.js',
 'src/visualizers/widgets/HFSMViz/HFSMVizWidget.js',
 'src/visualizers/widgets/HFSMViz/Simulator/Simulator.js',
 'src/decorators/UMLStateMachineDecorator/DiagramDesigner/UMLStateMachineDecorator.DiagramDesignerWidget.css',
 'vendor/jquery.min.js', 'vendor/bootstrap.min.js', 'vendor/css.min.js',
 'vendor/q.js',
 'vendor/bower/cytoscape/dist/cytoscape.min.js',
 'vendor/bower/cytoscape-cose-bilkent/cytoscape-cose-bilkent.js',
 'vendor/bower/cytoscape-edgehandles/cytoscape-edgehandles.js',
 'vendor/bower/cytoscape-context-menus/cytoscape-context-menus.js',
 'vendor/bower/cytoscape-panzoom/cytoscape-panzoom.js',
 'vendor/bower/mustache.js/mustache.min.js',
].forEach(must);

// The WebGME adapters must NOT ship: nothing here can load them, and
// their absence is what makes "the playground contains no WebGME"
// checkable rather than merely intended.
['src/visualizers/widgets/HFSMViz/WebGMEBackend.js',
 'src/visualizers/widgets/HFSMViz/WebGMEHost.js',
].forEach(function (rel) {
  if (fs.existsSync(path.join(dist, rel))) {
    fail(rel + ' was shipped; it is WebGME-only and nothing can load it here');
  }
});

// ... and nothing that DID ship may reach for a WebGME module
walkFiles(path.join(dist, 'src'), function (file) {
  if (file.slice(-3) !== '.js') return;
  var text = fs.readFileSync(file, 'utf8');
  var hit = text.match(/['"](js\/[^'"]*|client\/[^'"]*)['"]|\bWebGMEGlobal\b/);
  if (hit) {
    fail(path.relative(dist, file) + ' references WebGME-only ' + hit[0]);
  }
});

function walkFiles(dir, fn) {
  fs.readdirSync(dir).forEach(function (entry) {
    var full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walkFiles(full, fn);
    else fn(full);
  });
}

// ---- 2. self-contained -------------------------------------------
var html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
// Only ASSET references matter here: an <a href> to the repo is fine,
// a <script src> or <link href> pointing at a CDN is not. All three
// quoting forms HTML allows are checked -- src='...', src="..." and
// bare src=... -- or the guard would be trivially bypassable.
var ATTR = '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))';
var assetRe = new RegExp(
  '<(?:script|img)\\b[^>]*?\\bsrc' + ATTR +
  '|<link\\b[^>]*?\\bhref' + ATTR, 'gi');
var remote = [];
var m;
while ((m = assetRe.exec(html)) !== null) {
  // whichever quoting form matched
  var url = [m[1], m[2], m[3], m[4], m[5], m[6]].filter(function (v) {
    return v !== undefined;
  })[0] || '';
  if (/^(?:https?:)?\/\//i.test(url.trim())) {
    remote.push(m[0]);
  }
}
if (remote.length) {
  fail('index.html loads remote assets (the build must work ' +
       'offline): ' + remote.join(', '));
}

// ---- 3a. vendored assets match their sources ----------------------
// The node test loader cannot execute the browser build of
// require.js, so validate the artifact itself: a truncated, stale or
// swapped vendor file would otherwise pass every output check while
// the published page fails to load.
function firstExisting(candidates) {
  for (var i = 0; i < candidates.length; i++) {
    if (fs.existsSync(candidates[i])) return candidates[i];
  }
  return null;
}
[
  ['vendor/require.js', ['node_modules/requirejs/require.js']],
  ['vendor/text.js', ['node_modules/requirejs-text/text.js']],
  ['vendor/handlebars.min.js', ['bower_components/handlebars/handlebars.min.js',
                                'node_modules/handlebars/dist/handlebars.min.js']],
  ['vendor/underscore-umd.js', ['node_modules/underscore/underscore-umd.js',
                                'node_modules/underscore/underscore.js']],
  ['vendor/codemirror/lib/codemirror.js', ['node_modules/codemirror/lib/codemirror.js']],
  ['vendor/codemirror/lib/codemirror.css', ['node_modules/codemirror/lib/codemirror.css']],
  ['vendor/codemirror/mode/javascript/javascript.js',
   ['node_modules/codemirror/mode/javascript/javascript.js']],
  ['vendor/codemirror/mode/clike/clike.js', ['node_modules/codemirror/mode/clike/clike.js']],
  ['vendor/codemirror/mode/xml/xml.js', ['node_modules/codemirror/mode/xml/xml.js']],
  ['vendor/codemirror/mode/shell/shell.js', ['node_modules/codemirror/mode/shell/shell.js']],
].forEach(function (pair) {
  var built = path.join(dist, pair[0]);
  var source = firstExisting(pair[1].map(function (p) {
    return path.join(repoRoot, p);
  }));
  if (!source) {
    console.log('  (source for ' + pair[0] + ' not installed, skipping compare)');
    return;
  }
  if (fs.readFileSync(built).compare(fs.readFileSync(source)) !== 0) {
    fail(pair[0] + ' differs from its source (' +
         path.relative(repoRoot, source) + ') -- the shipped asset is ' +
         'not what the build intended');
  }
});

// ---- 3. every copied source matches the original ------------------
// The playground must run the SAME code as WebGME and the CLI, so
// nothing may be edited on its way into the build -- and nothing may
// go MISSING either. The widget loads its markup through `text!` and
// its styles through `css!`, so a lost .html or .css breaks the
// Diagram tab exactly as a lost .js would, and a check that skipped
// them (or that treated "not copied" as "fine") would pass over it.
//
// Hence: compare the whole copied tree, and name the only two files
// allowed to be absent.
var NOT_SHIPPED = [
  // WebGME-only adapters; their absence is asserted above
  'src/visualizers/widgets/HFSMViz/WebGMEBackend.js',
  'src/visualizers/widgets/HFSMViz/WebGMEHost.js',
];

function relPath(full) {
  return path.relative(repoRoot, full).split(path.sep).join('/');
}

/** every file under `dir`, recursively, compared byte for byte */
function verifyCopiedTree(dir) {
  walkFiles(path.join(repoRoot, dir), function (source) {
    verifyCopied(source);
  });
}

/** just the .js directly in `dir` -- what build-web.sh copies there */
function verifyCopiedModules(dir) {
  fs.readdirSync(path.join(repoRoot, dir))
    .filter(function (f) { return f.slice(-3) === '.js'; })
    .forEach(function (f) {
      verifyCopied(path.join(repoRoot, dir, f));
    });
}

function verifyCopied(source) {
  var rel = relPath(source);
  if (NOT_SHIPPED.indexOf(rel) > -1) return;
  var shipped = path.join(dist, rel);
  if (!fs.existsSync(shipped)) {
    fail(rel + ' was not copied into the build -- the playground ' +
         'cannot load what is not there');
  }
  if (fs.readFileSync(source).compare(fs.readFileSync(shipped)) !== 0) {
    fail(rel + ' differs from the build copy');
  }
}

// the generator: build-web.sh copies the .js in these two directories
// (src/common also holds meta.json, a build input the page never
// loads, and a Templates/ tree the playground does not use)
verifyCopiedModules('src/common');
verifyCopiedModules('src/common/viz');
// the visualizer: copied wholesale, so compared wholesale
verifyCopiedTree('src/visualizers/widgets/HFSMViz');

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
      // publishing an example nothing verifies would quietly break
      // the invariant this script exists to enforce
      fail('bundled example "' + name + '" has no goldens in ' +
           path.relative(repoRoot, goldenDir) + ' -- every example ' +
           'must be covered (add a fixture golden, or stop bundling it)');
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

    // compare the file SETS first: an unexpected EXTRA artifact is
    // drift too, and checking only golden -> artifact would miss it
    var goldenNames = fs.readdirSync(golden).filter(function (gf) {
      return IGNORED.indexOf(gf) === -1;
    }).sort();
    var artifactNames = Object.keys(artifacts).filter(function (af) {
      return IGNORED.indexOf(af) === -1;
    }).sort();
    if (goldenNames.join('\n') !== artifactNames.join('\n')) {
      var extra = artifactNames.filter(function (n) {
        return goldenNames.indexOf(n) === -1;
      });
      var missing = goldenNames.filter(function (n) {
        return artifactNames.indexOf(n) === -1;
      });
      fail(name + ': generated file set differs from the goldens' +
           (extra.length ? '; unexpected: ' + extra.join(', ') : '') +
           (missing.length ? '; missing: ' + missing.join(', ') : ''));
    }
    goldenNames.forEach(function (gf) {
      var expected = fs.readFileSync(path.join(golden, gf), 'utf8');
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
