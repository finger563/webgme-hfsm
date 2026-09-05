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
var os = require('os');

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
        // BOTH halves. npm reads peerDependenciesMeta only for names
        // that are also in peerDependencies, so metadata on its own
        // declares nothing -- dropping the peer entry and leaving the
        // metadata behind would look fine here and change the install.
        assert.property(pkg.peerDependencies || {}, heavy,
          heavy + ' should be declared a peer dependency');
        assert.property(pkg.peerDependenciesMeta || {}, heavy,
          heavy + ' should have peerDependenciesMeta');
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

  it('names every package the editor server is missing', function() {
    // Two failures this pins.
    //
    // The guard has to come before every other require: `./config`
    // pulls in `webgme/config/validator`, so loading config first
    // crashed with a bare MODULE_NOT_FOUND and the message never
    // printed. A check that stubs only the exact id 'webgme' does not
    // notice, because the subpath is what actually fails.
    //
    // And it has to name ALL of them. config.default reaches
    // config.webgme, which points at webgme-codeeditor and
    // webgme-ui-replay, and adds webgme-to-json and codemirror -- so
    // saying "npm install webgme" alone walks somebody straight into
    // the next failure. Three of the four have no main entry, hence
    // the fs.existsSync half of the stub below: they are found on
    // disk, not by require.
    var appPath = path.join(repoRoot, 'app.js').replace(/\\/g, '/');
    var script = [
      "var fs = require('fs'), realExists = fs.existsSync;",
      "var Module = require('module'), orig = Module._resolveFilename;",
      "Module._resolveFilename = function (r) {",
      "  if (/^(webgme|codemirror)(\\/|$)/.test(r)) {",
      "    var e = new Error(r); e.code = 'MODULE_NOT_FOUND'; throw e;",
      "  }",
      "  return orig.apply(this, arguments);",
      "};",
      "fs.existsSync = function (p) {",
      "  if (/node_modules[\\\\/](webgme-|codemirror)/.test(p)) { return false; }",
      "  return realExists.apply(fs, arguments);",
      "};",
      "require('" + appPath + "');",
    ].join('\n');

    var run = childProcess.spawnSync(process.execPath, ['-e', script],
                                     { encoding: 'utf8' });
    var said = run.stderr || run.stdout;

    assert.notInclude(said, 'MODULE_NOT_FOUND',
      'the guard ran too late and node reported the failure instead');
    ['webgme', 'webgme-codeeditor', 'webgme-to-json', 'webgme-ui-replay',
     'codemirror'].forEach(function(peer) {
      assert.include(said, peer,
        'the message should name ' + peer + '; it said: ' + said.split('\n')[3]);
    });
  });

  it('does not tell an installed copy to run an install that cannot work',
     function() {
    // npm puts the editor packages BESIDE webgme-hfsm; the config
    // looks for them INSIDE it. So in a packaged layout the check can
    // never be satisfied, and naming `npm install webgme-codeeditor`
    // would send somebody round a loop that reports the same four
    // missing every time. The server is a checkout workflow, and the
    // message has to say so rather than suggest a fix that is not one.
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'hfsm-packaged-'));
    var pkg = path.join(root, 'node_modules', 'webgme-hfsm');
    fs.mkdirSync(pkg, { recursive: true });
    fs.copyFileSync(path.join(repoRoot, 'app.js'), path.join(pkg, 'app.js'));

    // every peer present, installed the way npm actually installs them
    ['webgme', 'webgme-codeeditor', 'webgme-to-json', 'webgme-ui-replay',
     'codemirror'].forEach(function(peer) {
      var dir = path.join(root, 'node_modules', peer);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'package.json'),
        JSON.stringify({ name: peer, version: '1.0.0', main: 'index.js' }));
      fs.writeFileSync(path.join(dir, 'index.js'), 'module.exports = {};');
    });

    var run = childProcess.spawnSync(process.execPath,
                                     [path.join(pkg, 'app.js')],
                                     { encoding: 'utf8', cwd: root });
    var said = run.stderr || run.stdout;

    assert.notMatch(said, /npm install webgme-codeeditor/,
      'suggested an install that cannot satisfy this layout: ' + said);
    assert.match(said, /git clone|CHECKOUT/,
      'should point at a checkout instead; it said: ' + said);
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
