'use strict';

/**
 * `--no-support` on the generator CLI.
 *
 * A project that already vendors the HFSM runtime -- espp's
 * state_machine component is the reason this exists -- needs the three
 * files that describe ITS machine and not the four that are the same
 * for everyone. Generating the shared ones beside the machine puts a
 * second state_base.hpp on the include path, where it shadows the
 * copy the rest of that project is built against.
 */

var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

var repoRoot = path.resolve(__dirname, '..');
var CLI = path.join(repoRoot, 'bin/hfsm-gen.js');
var MODEL = path.join(repoRoot, 'examples/Complex.json');

function run(args) {
  var out = fs.mkdtempSync(path.join(os.tmpdir(), 'hfsm-gen-'));
  var r = childProcess.spawnSync(process.execPath,
                                 [CLI, MODEL, '-o', out].concat(args || []),
                                 { encoding: 'utf8' });
  assert.strictEqual(r.status, 0,
                     'hfsm-gen failed: ' + (r.stderr || r.stdout));
  return { dir: out, files: fs.readdirSync(out).sort(), stderr: r.stderr };
}

describe('hfsm-gen --no-support', function() {
  this.timeout(20000);

  var full, lean;
  before(function() {
    full = run([]);
    lean = run(['--no-support']);
  });

  it('leaves out the files that are the same for every machine', function() {
    ['state_base.hpp', 'deep_history_state.hpp',
     'shallow_history_state.hpp', 'magic_enum.hpp'].forEach(function(f) {
      assert.ok(full.files.indexOf(f) > -1,
                f + ' should be there by default');
      assert.strictEqual(lean.files.indexOf(f), -1,
                         f + ' should be gone with --no-support');
    });
  });

  it('still emits everything about THIS machine', function() {
    ['Complex_generated_states.hpp', 'Complex_generated_states.cpp',
     'Complex_event_data.hpp'].forEach(function(f) {
      assert.ok(lean.files.indexOf(f) > -1, f + ' must still be generated');
    });
  });

  it('generates the same machine either way', function() {
    // the flag decides what is WRITTEN, not what is rendered: a
    // project switching to it should see no change in its own code
    ['Complex_generated_states.hpp', 'Complex_generated_states.cpp',
     'Complex_event_data.hpp'].forEach(function(f) {
      assert.strictEqual(fs.readFileSync(path.join(lean.dir, f), 'utf8'),
                         fs.readFileSync(path.join(full.dir, f), 'utf8'),
                         f + ' should not depend on --no-support');
    });
  });

  it('takes the list from the templates rather than a copy of it',
     function() {
    // if a support template is added, the flag has to drop it too --
    // so the names come from the same table that renders them
    var amdLoader = require('../bin/amd-loader');
    return amdLoader.load([
      'src/plugins/SoftwareGenerator/templates/MetaTemplates',
    ]).then(function(loaded) {
      var named = loaded[0].supportFileNames().sort();
      var missing = full.files.filter(function(f) {
        return lean.files.indexOf(f) === -1;
      }).sort();
      assert.deepStrictEqual(missing, named,
        'the files the flag drops should be exactly the ones the ' +
        'templates call support files');
    });
  });

  it('says so when the test bench is asked for without them', function() {
    // the bench builds standalone, and cannot without these: its
    // Makefile stops at "'deep_history_state.hpp' file not found"
    var r = run(['--no-support', '--test-bench']);
    assert.match(r.stderr, /--no-support with --test-bench/,
                 'should warn; stderr was: ' + r.stderr);
  });
});
