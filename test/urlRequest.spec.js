'use strict';

/**
 * The query string the playground answers to: ?example=, ?model=,
 * ?view= and ?embed=. This is the surface another site links to --
 * espp's docs pointing at a machine, as a link or in an iframe -- so
 * it is also the surface a link can lie about.
 *
 * `web/app.js` is an IIFE rather than a module, so these lift the
 * functions out of the shipped source and exercise them directly.
 * Testing a copy would only prove the copy works; the browser covers
 * the parts that need a DOM.
 */

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

var repoRoot = path.resolve(__dirname, '..');
var source = fs.readFileSync(path.join(repoRoot, 'web/app.js'), 'utf8');

/** pull one top-level `function name(...) {...}` out of the IIFE */
function lift(name) {
  var start = source.indexOf('\n  function ' + name + '(');
  assert.notStrictEqual(start, -1, 'web/app.js no longer defines ' + name);
  var open = source.indexOf('{', start);
  var depth = 0;
  for (var i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) {
      /* jshint evil:true */
      return new Function('window', 'EXAMPLES',
        source.slice(start, i + 1) + '\nreturn ' + name + ';')(
        { location: { href: 'https://finger563.github.io/webgme-hfsm/' } },
        [
          { label: 'Simple', file: 'examples/Simple.json' },
          { label: 'Complex', file: 'examples/Complex.json' },
          { label: 'Basic', file: 'examples/basic.json' },
        ]);
    }
  }
  throw new Error('unbalanced braces reading ' + name);
}

describe('what the URL asks the playground for', function() {

  describe('safeModelUrl', function() {
    var safeModelUrl = lift('safeModelUrl');

    it('takes an http(s) model from anywhere', function() {
      // the point of the parameter: espp's docs linking at a model
      // that lives in espp's repo, not in this one
      assert.strictEqual(
        safeModelUrl('https://esp-cpp.github.io/espp/hfsm/Complex.json'),
        'https://esp-cpp.github.io/espp/hfsm/Complex.json');
      assert.strictEqual(safeModelUrl('http://localhost:8080/m.json'),
                         'http://localhost:8080/m.json');
    });

    it('resolves a relative model against the page', function() {
      assert.strictEqual(safeModelUrl('examples/Simple.json'),
                         'https://finger563.github.io/webgme-hfsm/examples/Simple.json');
    });

    it('refuses anything that is not http(s)', function() {
      // A link is the one part of this an attacker writes. `javascript:`
      // and `data:` would turn "open this diagram" into "run this".
      ['javascript:alert(1)',
       'JaVaScRiPt:alert(1)',
       'data:application/json,{}',
       'file:///etc/passwd',
       'vbscript:msgbox(1)',
      ].forEach(function(bad) {
        assert.isNull(safeModelUrl(bad), bad + ' must be refused');
      });
    });

    it('refuses what does not parse', function() {
      assert.isNull(safeModelUrl('http://['));
    });
  });

  describe('exampleNamed', function() {
    var exampleNamed = lift('exampleNamed');

    it('finds a bundled example by name', function() {
      assert.strictEqual(exampleNamed('Complex').file, 'examples/Complex.json');
    });

    it('does not care about case or a .json suffix', function() {
      // ?example=complex and ?example=Complex.json are the same ask,
      // and a link that guesses wrong is a link that looks broken
      assert.strictEqual(exampleNamed('complex').file, 'examples/Complex.json');
      assert.strictEqual(exampleNamed('COMPLEX').file, 'examples/Complex.json');
      assert.strictEqual(exampleNamed('Complex.json').file, 'examples/Complex.json');
    });

    it('is null for one that is not bundled', function() {
      assert.isNull(exampleNamed('NotAThing'));
      assert.isNull(exampleNamed('../../etc/passwd'));
    });
  });
});
