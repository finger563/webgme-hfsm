'use strict';

/**
 * Locating a snippet in the generated code.
 *
 * The interesting cases are all in the real output, so this runs
 * against the committed goldens rather than against a hand-written
 * file: a made-up fixture would only prove that the finder agrees
 * with whoever wrote the fixture.
 */

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var repoRoot = path.resolve(__dirname, '..');

function goldenFiles(name) {
  var dir = path.join(repoRoot, 'test/goldens', name);
  var files = {};
  fs.readdirSync(dir).forEach(function (f) {
    if (/\.(cpp|hpp)$/.test(f)) {
      files[f] = fs.readFileSync(path.join(dir, f), 'utf8');
    }
  });
  return files;
}

describe('finding a snippet in the generated code', function () {

  var codeContext, model, files;

  before(function () {
    this.timeout(10000);
    var requirejs = require('requirejs');
    var req = requirejs.config({
      context: 'code-context',
      baseUrl: repoRoot,
      nodeRequire: require,
      paths: { hfsm: path.join(repoRoot, 'src/common') },
    });
    model = JSON.parse(fs.readFileSync(
      path.join(repoRoot, 'examples/Complex.json'), 'utf8'));
    files = goldenFiles('Complex');
    return new Promise(function (resolve, reject) {
      req(['hfsm/viz/codeContext'], function (m) {
        codeContext = m;
        resolve();
      }, reject);
    });
  });

  it('finds a state entry block and the aliases above it', function () {
    var sites = codeContext.sites(files, '/c/T', 'Entry',
                                  model.objects['/c/T'].Entry);
    assert.strictEqual(sites.length, 1, 'a state has one entry function');
    var site = sites[0];
    assert.strictEqual(site.file, 'Complex_generated_states.cpp');
    assert.ok(/void Root::State3::entry/.test(site.before),
              'the signature is the point of the frame');
    // what is in scope is the question this answers
    assert.ok(/auto &someNumber = _root->someNumber/.test(site.before));
    assert.ok(/^\s*}/m.test(site.after), 'and where the function ends');
  });

  it('frames the enclosing function, not the one after it', function () {
    var site = codeContext.sites(files, '/c/T', 'Entry',
                                 model.objects['/c/T'].Entry)[0];
    // starts AT the signature, so the frame is a whole function
    assert.strictEqual(site.before.split('\n')[0].trim(),
                       'void Root::State3::entry ( void ) {');
    // and ends at the brace that closes it
    assert.strictEqual(site.after.split('\n').pop(), '}');
    // the next function's signature is not part of this one's frame
    assert.ok(site.after.indexOf('void Root::State3::exit') === -1,
              'the frame stops where the function does');
  });

  it('falls back to a window when there is no function to anchor to',
     function () {
       // a transition's action lives inside a switch inside a
       // function, with nothing at column 0 within reach
       var site = codeContext.sites(files, '/c/v/z/R', 'Action',
                                    model.objects['/c/v/z/R'].Action)[0];
       assert.ok(site.before.length > 0, 'still gets context');
       var lines = site.before.split('\n');
       assert.ok(lines.length <= codeContext.BEFORE_LINES,
                 'and no more than the budget');
       assert.ok(/^\s+\S/.test(lines[0]), 'all of it indented, mid-function');
     });

  it('reports every place a transition action is generated into', function () {
    // the action of one transition is emitted at each site that can
    // take it -- being told there are six is the useful part
    var sites = codeContext.sites(files, '/c/v/z/R', 'Action',
                                  model.objects['/c/v/z/R'].Action);
    assert.ok(sites.length > 1, 'expected more than one site');
    var lines = sites.map(function (s) { return s.line; });
    assert.deepStrictEqual(lines.slice().sort(function (a, b) { return a - b; }),
                           lines, 'in file order');
    sites.forEach(function (s) {
      assert.ok(s.before.length > 0 || s.after.length > 0);
    });
  });

  it('never shows another snippet inside the frame', function () {
    // a neighbouring Entry block greyed out in an Exit frame reads as
    // scaffolding that cannot be edited, when it can -- elsewhere
    Object.keys(model.objects).forEach(function (p) {
      ['Entry', 'Exit', 'Tick', 'Action', 'Guard'].forEach(function (attr) {
        codeContext.sites(files, p, attr, model.objects[p][attr])
          .forEach(function (site) {
            assert.ok(site.before.indexOf('//::::') === -1,
                      p + '/' + attr + ': a marker above it');
            assert.ok(site.after.indexOf('//::::') === -1,
                      p + '/' + attr + ': a marker below it');
          });
      });
    });
  });

  it('steps over a multi-line snippet rather than into it', function () {
    // /c/Y/t's Action is a loop: the frame below it has to start
    // after the closing brace of that loop, not inside it
    var value = model.objects['/c/Y/t'].Action;
    assert.ok(value.split('\n').length > 2, 'fixture should be several lines');
    var sites = codeContext.sites(files, '/c/Y/t', 'Action', value);
    assert.ok(sites.length, 'and it should be generated somewhere');
    // a bare `}` says nothing -- the frame is full of them. Compare
    // against the lines that could only have come from the snippet.
    var distinctive = value.split('\n')
        .map(function (l) { return l.trim(); })
        .filter(function (l) { return l.replace(/[{}();]/g, '').trim().length > 3; });
    assert.ok(distinctive.length >= 2, 'fixture should have real code in it');
    sites.forEach(function (site) {
      distinctive.forEach(function (line) {
        assert.ok(site.after.indexOf(line) === -1,
                  'the snippet is not in the frame below it: ' + line);
        assert.ok(site.before.indexOf(line) === -1,
                  'nor in the frame above it: ' + line);
      });
    });
  });

  it('measures the snippet from the value it is given', function () {
    // the height is the value's line count, so a stale value slides
    // the frame -- worth stating, because it is what ties the frame
    // to the editor's CURRENT text rather than to the last generation
    var value = model.objects['/c/Y/t'].Action;
    var right = codeContext.sites(files, '/c/Y/t', 'Action', value)[0];
    var short = codeContext.sites(files, '/c/Y/t', 'Action', 'one line')[0];
    assert.strictEqual(right.line, short.line, 'same marker either way');
    assert.notStrictEqual(right.after, short.after,
                          'a shorter value leaves more of the snippet below');
  });

  it('says nothing rather than guessing', function () {
    assert.deepStrictEqual(codeContext.sites(files, '/nope', 'Entry', ''), [],
                           'a node created since the last generation');
    assert.deepStrictEqual(codeContext.sites(null, '/c/T', 'Entry', ''), [],
                           'a host with no generated code');
    assert.deepStrictEqual(codeContext.sites(files, '/c/T', 'Nonsense', ''), []);
    assert.deepStrictEqual(codeContext.sites(files, '', 'Entry', ''), []);
  });

  it('counts an empty snippet as the one line the template emits', function () {
    assert.strictEqual(codeContext.snippetHeight(''), 1);
    assert.strictEqual(codeContext.snippetHeight(undefined), 1);
    assert.strictEqual(codeContext.snippetHeight('a'), 1);
    assert.strictEqual(codeContext.snippetHeight('a\nb'), 2);
  });

  it('spells the marker the way the templates do', function () {
    // if these ever disagree the frame silently stops appearing, so
    // check against the template rather than against a copy of it
    var tmpl = fs.readFileSync(path.join(
      repoRoot,
      'src/plugins/SoftwareGenerator/templates/uml/StateTempl.cpp'), 'utf8');
    assert.ok(tmpl.indexOf('//::::{{{path}}}::::Entry::::') > -1,
              'the template no longer emits the marker this looks for');
    assert.strictEqual(codeContext.markerFor('{{{path}}}', 'Entry'),
                       '//::::{{{path}}}::::Entry::::');
  });
});

/**
 * The inspector's half of it: WHEN to ask for a frame, and what to do
 * when the host cannot answer.
 *
 * No DOM -- the prototype is called against a stand-in holding the
 * one thing the decision reads, which is the host.
 */
describe('asking the host for a frame', function () {

  var Inspector, HostServices, files;

  before(function () {
    this.timeout(10000);
    var requirejs = require('requirejs');
    var req = requirejs.config({
      context: 'inspector-context',
      baseUrl: repoRoot,
      nodeRequire: require,
      paths: { hfsm: path.join(repoRoot, 'src/common') },
      map: { '*': { css: 'test/stubs/css' } },
    });
    files = goldenFiles('Complex');
    return new Promise(function (resolve, reject) {
      req(['src/visualizers/widgets/HFSMViz/Inspector/Inspector',
           'hfsm/viz/HostServices'],
          function (I, H) { Inspector = I; HostServices = H; resolve(); },
          reject);
    });
  });

  function withHost(host) {
    var inspector = Object.create(Inspector.prototype);
    inspector._host = host;
    return inspector;
  }

  var ENTRY = { name: 'Entry', type: 'string' };

  it('asks for code', function () {
    var sites = withHost({ generatedFiles: function () { return files; } })
        ._sites('/c/T', ENTRY, '');
    assert.strictEqual(sites.length, 1);
  });

  it('does not ask for prose', function () {
    // documentation is markdown; it is never compiled into anything,
    // so there is no function to show it inside
    var host = { generatedFiles: function () { return files; } };
    assert.deepStrictEqual(
      withHost(host)._sites('/c/T', { name: 'documentation', type: 'string' }, ''),
      []);
  });

  it('degrades to no frame rather than failing', function () {
    // this is the WebGME case: the plugin runs on the server, so the
    // visualizer has never seen generated code
    assert.deepStrictEqual(withHost(null)._sites('/c/T', ENTRY, ''), []);
    assert.deepStrictEqual(withHost({})._sites('/c/T', ENTRY, ''), []);
    assert.deepStrictEqual(
      withHost({ generatedFiles: function () { return null; } })
        ._sites('/c/T', ENTRY, ''), []);
  });

  it('survives a host that throws', function () {
    // an editor that will not open because generation failed is worse
    // than an editor with no frame
    assert.deepStrictEqual(
      withHost({ generatedFiles: function () { throw new Error('boom'); } })
        ._sites('/c/T', ENTRY, ''), []);
  });

  it('labels the step buttons, not just their tooltips', function () {
    // '\u2039' is not a label. A tooltip is for a mouse pointer.
    var src = fs.readFileSync(path.join(
      repoRoot,
      'src/visualizers/widgets/HFSMViz/Inspector/CodeEditor.js'), 'utf8');
    var labels = src.match(/aria-label', 'The (previous|next) place/g) || [];
    assert.strictEqual(labels.length, 2,
                       'both step buttons should carry an aria-label');
  });

  it('does not leave a class nothing styles', function () {
    // 'is-framed' was set on the modal and styled nowhere -- dead
    // code with an explanatory comment, which is worse than neither
    var root = path.join(repoRoot, 'src/visualizers/widgets/HFSMViz/Inspector');
    var js = fs.readFileSync(path.join(root, 'CodeEditor.js'), 'utf8');
    var css = fs.readFileSync(path.join(root, 'Inspector.css'), 'utf8');
    (js.match(/addClass\('([a-z-]+)'\)/g) || []).forEach(function (call) {
      var name = call.match(/'([a-z-]+)'/)[1];
      if (name === 'inspector-cm') return;   // styled via .CodeMirror
      assert.ok(css.indexOf('.' + name) > -1,
                name + ' is added by the editor and styled nowhere');
    });
  });

  it('offers generatedFiles as optional, not required', function () {
    assert.ok(HostServices.OPTIONAL.indexOf('generatedFiles') > -1);
    assert.ok(HostServices.REQUIRED.indexOf('generatedFiles') === -1,
              'a host without it is not a broken host');
    // and the do-nothing host answers it
    assert.strictEqual(HostServices.none().generatedFiles(), null);
  });
});
