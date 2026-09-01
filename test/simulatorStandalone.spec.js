'use strict';

/**
 * The simulator is meant to run outside WebGME -- that is the whole
 * point of ModelBackend. This loads it the way a non-WebGME host
 * would: a requirejs context with NO WebGME module paths configured
 * at all, so any lingering `js/...` or `decorators/...` dependency
 * fails to resolve instead of quietly working because WebGME happened
 * to be serving it.
 *
 * `text!` and `css!` are stubbed rather than mapped: a host still has
 * to supply those plugins, but what they load is markup and styling,
 * not WebGME behaviour. The third-party runtime libraries are stubbed
 * for the same reason -- see test/stubs/{text,css,q,mustache,
 * highlight}.js, each of which documents why.
 */

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var repoRoot = path.resolve(__dirname, '..');

function standaloneContext(name) {
  var requirejs = require('requirejs');
  return requirejs.config({
    context: name,
    baseUrl: repoRoot,
    nodeRequire: require,
    paths: {
      // the HFSM modules, exactly as any host maps them
      hfsm: path.join(repoRoot, 'src/common'),

      // Third-party runtime deps, stubbed (one file each -- see the
      // note in test/stubs/q.js). They are vendorable by definition,
      // so whether they happen to be installed says nothing about
      // the question being asked.
      q: 'test/stubs/q',
      'bower/mustache.js/mustache.min': 'test/stubs/mustache',
      'bower/highlightjs/highlight.pack.min': 'test/stubs/highlight',

      // NOTE: deliberately absent -- js/*, client/*, WebGMEGlobal
    },
    map: {
      '*': {
        text: 'test/stubs/text',
        css: 'test/stubs/css',
      },
    },
  });
}

describe('simulator outside WebGME', function() {

  it('loads with no WebGME module paths configured', function() {
    this.timeout(10000);
    var req = standaloneContext('standalone-sim');
    return new Promise(function(resolve, reject) {
      req(['src/visualizers/widgets/HFSMViz/Simulator/Simulator'],
          function(Simulator) {
            assert.strictEqual(typeof Simulator, 'function',
                               'Simulator should be a constructor');
            resolve();
          },
          function(err) {
            reject(new Error('Simulator still depends on something ' +
                             'WebGME-only: ' + err.message));
          });
    });
  });

  it('loads its dialogs the same way', function() {
    this.timeout(10000);
    var req = standaloneContext('standalone-dialogs');
    return new Promise(function(resolve, reject) {
      req(['src/visualizers/widgets/HFSMViz/Simulator/Choice',
           'src/visualizers/widgets/HFSMViz/Simulator/FormDialog',
           'src/visualizers/widgets/HFSMViz/Dialog/Dialog'],
          function(Choice, FormDialog, Dialog) {
            [['Choice', Choice], ['FormDialog', FormDialog],
             ['Dialog', Dialog]].forEach(function(pair) {
               assert.strictEqual(typeof pair[1], 'function',
                                  pair[0] + ' should be a constructor');
             });
            resolve();
          },
          function(err) {
            reject(new Error('a dialog still depends on something ' +
                             'WebGME-only: ' + err.message));
          });
    });
  });

  it('keeps the whole widget dependency closure free of WebGME', function() {
    // The widget itself cannot be loaded here (cytoscape needs a
    // DOM), so this walks the define([...]) lists statically instead:
    // start at the widget and follow every relative / hfsm dependency,
    // asserting no WebGME-only module id appears anywhere in the
    // closure. A single one of those is enough to stop the module
    // loading in a host that is not WebGME, which is the whole point.
    var start = 'src/visualizers/widgets/HFSMViz/HFSMVizWidget.js';
    var seen = {};
    var offenders = [];

    function depsOf(file) {
      var text = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      var body = text.slice(text.indexOf('define('));
      var list = body.slice(0, body.indexOf(']'));
      var ids = [];
      list.replace(/['"]([^'"]+)['"]/g, function(_, id) { ids.push(id); return _; });
      return ids;
    }

    function walk(file) {
      if (seen[file]) return;
      seen[file] = true;
      depsOf(file).forEach(function(id) {
        // strip loader plugins: what they load is markup / styling
        var bare = id.replace(/^(text|css)!/, '');
        // 'js/' and 'client/' are WebGME's own client modules
        if (/^(js|client)\//.test(bare)) {
          offenders.push(file + ' -> ' + id);
          return;
        }
        var next = null;
        if (bare.charAt(0) === '.') {
          next = path.join(path.dirname(file), bare);
        } else if (bare.indexOf('hfsm/') === 0) {
          next = path.join('src/common', bare.slice('hfsm/'.length));
        } else if (bare.indexOf('decorators/') === 0) {
          // 'decorators/' is THIS repo's src/decorators, which a host
          // maps for itself exactly like it maps 'hfsm/'
          next = path.join('src', bare);
        }
        if (!next) return;   // third-party: vendorable, not WebGME
        if (!/\.[a-z]+$/.test(next)) next += '.js';
        if (fs.existsSync(path.join(repoRoot, next))) walk(next);
      });
    }

    walk(start);
    assert.deepStrictEqual(offenders, [],
      'the widget must not reach a WebGME-only module:\n  ' +
      offenders.join('\n  '));
    assert.ok(Object.keys(seen).length > 3,
              'the walk should have followed several modules, saw ' +
              Object.keys(seen).length);
  });

  it('mentions no WebGME module anywhere in its source', function() {
    // Belt and braces. The two tests above only see what they can
    // reach: one loads the modules, the other reads define([...])
    // lists. Neither would notice a lazy require('js/...') or a bare
    // WebGMEGlobal buried in a function body -- least of all in the
    // widget, which is the main thing being decoupled and which the
    // loader test cannot even run (cytoscape needs a DOM).
    var files = [
      'src/visualizers/widgets/HFSMViz/HFSMVizWidget.js',
      'src/visualizers/widgets/HFSMViz/Simulator/Simulator.js',
      'src/visualizers/widgets/HFSMViz/Simulator/Choice.js',
      'src/visualizers/widgets/HFSMViz/Simulator/FormDialog.js',
      'src/visualizers/widgets/HFSMViz/Dialog/Dialog.js',
    ];
    // `decorators/` is this repo's own (src/decorators), so a css!
    // include of it is not a WebGME dependency
    // both quote styles: this file uses single quotes, the widget
    // uses double, and a scan that only saw one would be no scan
    var webgmeOnly = /['"](js\/[^'"]*|client\/[^'"]*)['"]|\bWebGMEGlobal\b/;
    files.forEach(function(file) {
      var text = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      var hit = text.match(webgmeOnly);
      assert.ok(!hit, file + ' references WebGME-only ' + (hit && hit[0]));
    });
  });
});
