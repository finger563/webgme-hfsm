/**
 * The CLI has to work when this package is INSTALLED, not just when it
 * is cloned. Those are different code paths and the suite could not
 * tell them apart: every other test runs from the checkout, where the
 * repo's own node_modules happens to hold everything.
 *
 * From `npm install webgme-hfsm`, `hfsm-gen` failed outright with
 * "cannot find underscore", because npm hoists dependencies into the
 * CONSUMER's node_modules and the loader only looked under its own
 * repoRoot. These tests pin the two halves of that: the loader finds
 * hoisted packages, and the tarball actually contains what it loads.
 */
'use strict';

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var repoRoot = path.resolve(__dirname, '..');
var pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

describe('packaging', function() {

  // Traced by instrumenting fs.readFileSync during a real generate,
  // rather than read off the define([...]) lists -- templates are
  // loaded through the text! plugin and would not show up there.
  var CLI_NEEDS = [
    'bin/amd-loader.js',
    'bin/hfsm-gen.js',
    'bin/hfsm-diff.js',
    'src/common/checkModel.js',
    'src/common/declParser.js',
    'src/common/exporters.js',
    'src/common/meta.js',
    'src/common/metaRules.js',
    'src/common/processor.js',
    'src/common/resolveModel.js',
    'src/common/viz/describe.js',
    'src/plugins/SoftwareGenerator/templates/MetaTemplates.js',
    'src/plugins/SoftwareGenerator/templates/uml/GeneratedStates.cpp',
    'src/plugins/SoftwareGenerator/templates/uml/static/state_base.hpp',
    'src/plugins/SoftwareGenerator/templates/uml/static/magic_enum.hpp',
  ];

  it('ships every file the CLI loads', function() {
    var listed = childProcess.execSync('npm pack --dry-run --json', {
      cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    var files = JSON.parse(listed)[0].files.map(function(f) { return f.path; });
    CLI_NEEDS.forEach(function(needed) {
      assert.include(files, needed,
        needed + ' is loaded by the CLI but is not in the published package');
    });
  });

  it('does not make the WebGME server a dependency of the CLI', function() {
    // webgme drags in ~420 packages and half a gigabyte. Only `npm
    // start` needs it, so it is an OPTIONAL peer: npm does not install
    // optional peers, which is the whole point.
    var deps = Object.keys(pkg.dependencies || {});
    // every optional peer, not a sample of them: one left off the list
    // is one that can quietly become a hard dependency again
    ['webgme', 'webgme-codeeditor', 'webgme-to-json', 'webgme-ui-replay',
     'codemirror'].forEach(
      function(heavy) {
        assert.notInclude(deps, heavy, heavy + ' must not be a hard dependency');
        assert.property(pkg.peerDependenciesMeta || {}, heavy,
          heavy + ' should be declared an optional peer');
        assert.isTrue((pkg.peerDependenciesMeta[heavy] || {}).optional,
          heavy + ' peer must be marked optional or npm will install it');
      });
  });

  it('installs nothing on postinstall', function() {
    // `bower install` used to run in the consumer's tree on every
    // install, and only worked because webgme happened to depend on
    // bower. Without webgme it would simply fail.
    assert.notProperty(pkg.scripts, 'postinstall');
  });

  it('says what to install when the editor server cannot start', function() {
    // The guard has to come before every other require. 
    // pulls in , so loading config first
    // crashed with a bare MODULE_NOT_FOUND and the message never
    // printed -- and a check that stubs only the exact id 'webgme'
    // does not notice, because the subpath is what actually fails.
    var script = [
      "var Module = require('module'), orig = Module._resolveFilename;",
      "Module._resolveFilename = function (r) {",
      "  if (/^webgme(\\/|$)/.test(r)) {",
      "    var e = new Error(r); e.code = 'MODULE_NOT_FOUND'; throw e;",
      "  }",
      "  return orig.apply(this, arguments);",
      "};",
      "require('" + path.join(repoRoot, "app.js").replace(/\\/g, "/") + "');",
    ].join("\n");
    var run = childProcess.spawnSync(process.execPath, ["-e", script],
                                     { encoding: "utf8" });
    assert.include(run.stderr, "npm install webgme",
      "app.js should say what to install; it printed: " +
      (run.stderr || run.stdout).split("\n")[0]);
    assert.notInclude(run.stderr, "MODULE_NOT_FOUND");
  });

  it('resolves its AMD libraries from wherever npm put them', function() {
    // The loader's own candidate list must not be repoRoot-only.
    var loader = fs.readFileSync(path.join(repoRoot, 'bin/amd-loader.js'), 'utf8');
    assert.match(loader, /require\.resolve/,
      'amd-loader must fall back to node resolution for hoisted installs');
    ['underscore', 'handlebars', 'requirejs-text'].forEach(function(lib) {
      assert.match(loader, new RegExp("inPkg\\('" + lib + "'"),
        lib + ' has no hoisted-install fallback');
    });
  });
});
