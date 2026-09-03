'use strict';

/**
 * The diff on the command line.
 *
 * The point of it is CI: "did this change the machine?" is a question
 * you want answered by an exit status, not by reading a JSON diff. So
 * the exit status is what most of this checks -- including the one
 * case that would make it useless, a model that only moved.
 */

var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var execFile = require('child_process').execFileSync;

var repoRoot = path.resolve(__dirname, '..');
var CLI = path.join(repoRoot, 'bin/hfsm-diff.js');

function example(name) {
  return JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'examples', name + '.json'), 'utf8'));
}

var scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'hfsm-diff-'));

function write(name, model) {
  var file = path.join(scratch, name);
  fs.writeFileSync(file, JSON.stringify(model, null, 2));
  return file;
}

/** @return { status, stdout, stderr } -- never throws on a non-zero exit */
function run(args) {
  try {
    var stdout = execFile(process.execPath, [CLI].concat(args),
                          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 0, stdout: stdout, stderr: '' };
  } catch (err) {
    return { status: err.status,
             stdout: String(err.stdout || ''),
             stderr: String(err.stderr || '') };
  }
}

describe('hfsm-diff', function () {
  this.timeout(20000);

  var SIMPLE = path.join(repoRoot, 'examples/Simple.json');

  after(function () {
    fs.rmSync(scratch, { recursive: true, force: true });
  });

  it('exits 0 and says so when the machines are the same', function () {
    var out = run([SIMPLE, SIMPLE]);
    assert.strictEqual(out.status, 0);
    assert.ok(/identical/.test(out.stdout), out.stdout);
  });

  it('exits 1 when they differ, and names what changed', function () {
    var after = example('Simple');
    var guarded = Object.keys(after.objects).filter(function (p) {
      return after.objects[p].Guard;
    })[0];
    after.objects[guarded].Guard = 'neverEver';
    var out = run([SIMPLE, write('guard.json', after)]);

    assert.strictEqual(out.status, 1);
    assert.ok(/1 changed/.test(out.stdout), out.stdout);
    assert.ok(/Guard:.*-> neverEver/.test(out.stdout), out.stdout);
    // named by its event, not by the default name every transition has
    assert.ok(/External Transition INPUTEVENT/.test(out.stdout), out.stdout);
  });

  it('exits 0 when nothing but the layout moved', function () {
    // the case that would make this useless in CI: a model reopened
    // and saved, every node nudged, nothing about the machine changed
    var after = example('Simple');
    Object.keys(after.objects).forEach(function (p) {
      if (after.objects[p].position) after.objects[p].position.x += 25;
    });
    var out = run([SIMPLE, write('moved.json', after)]);

    assert.strictEqual(out.status, 0, out.stdout);
    assert.ok(/moved/.test(out.stdout), 'it still says they moved');
  });

  it('lists what moved when asked', function () {
    var after = example('Simple');
    var one = Object.keys(after.objects).filter(function (p) {
      return after.objects[p].position;
    })[0];
    after.objects[one].position.y += 40;
    var out = run(['--moved', SIMPLE, write('one-moved.json', after)]);
    assert.strictEqual(out.status, 0);
    assert.ok(/\(moved\)/.test(out.stdout), out.stdout);
  });

  it('says nothing at all when told to be quiet', function () {
    var after = example('Simple');
    after.objects['/9/NEW'] = { name: 'Extra', type: 'State' };
    var out = run(['--quiet', SIMPLE, write('added.json', after)]);
    assert.strictEqual(out.status, 1, 'the status is still the answer');
    assert.strictEqual(out.stdout, '');
  });

  it('can be read by a machine', function () {
    var after = example('Simple');
    after.objects['/9/NEW'] = { name: 'Extra', type: 'State' };
    var out = run(['--json', SIMPLE, write('json.json', after)]);
    var report = JSON.parse(out.stdout);
    assert.strictEqual(report.differs, true);
    assert.strictEqual(report.summary.added, 1);
    assert.ok(report.entries.some(function (e) {
      return e.status === 'added' && e.name === 'Extra';
    }));
    // entries the caller did not ask about are left out
    assert.ok(!report.entries.some(function (e) { return e.status === 'same'; }));
  });

  it('holds its exit status down when asked', function () {
    var after = example('Simple');
    after.objects['/9/NEW'] = { name: 'Extra', type: 'State' };
    var out = run(['--exit-zero', SIMPLE, write('zero.json', after)]);
    assert.strictEqual(out.status, 0, 'a reporting run should not fail a build');
    assert.ok(/1 added/.test(out.stdout));
  });

  it('exits 2 on a broken input, which is not the same as a difference',
     function () {
       // a CI job that treats "the file is corrupt" as "the machine
       // changed" reports the wrong thing
       var bad = path.join(scratch, 'bad.json');
       fs.writeFileSync(bad, '{ not json');
       var out = run([SIMPLE, bad]);
       assert.strictEqual(out.status, 2);
       assert.ok(/cannot parse/.test(out.stderr), out.stderr);

       var missing = run([SIMPLE, path.join(scratch, 'nope.json')]);
       assert.strictEqual(missing.status, 2);
       assert.ok(/cannot read/.test(missing.stderr), missing.stderr);
     });

  it('refuses an option it does not know', function () {
    var out = run(['--wat', SIMPLE, SIMPLE]);
    assert.strictEqual(out.status, 2);
    assert.ok(/unknown option/.test(out.stderr), out.stderr);
  });

  it('is installed as a command, and the lockfile agrees', function () {
    // A bin added to package.json and not to package-lock.json means
    // `npm ci` installs a different set of commands from `npm i`.
    var pkg = JSON.parse(fs.readFileSync(
      path.join(repoRoot, 'package.json'), 'utf8'));
    var lock = JSON.parse(fs.readFileSync(
      path.join(repoRoot, 'package-lock.json'), 'utf8'));
    assert.ok(pkg.bin['hfsm-diff'], 'package.json should install it');
    // compared by what they RESOLVE to: npm normalises './bin/x' to
    // 'bin/x' when it writes the lock, and that difference is not a
    // difference
    function resolved(bin) {
      var out = {};
      Object.keys(bin || {}).forEach(function (name) {
        out[name] = path.resolve(repoRoot, bin[name]);
      });
      return out;
    }
    assert.deepStrictEqual(resolved(lock.packages[''].bin), resolved(pkg.bin),
                           'the lockfile records a different set of commands');
    Object.values(resolved(pkg.bin)).forEach(function (file) {
      assert.ok(fs.existsSync(file), file + ' is not there');
    });
  });

  it('compares two whole examples without falling over', function () {
    var out = run([path.join(repoRoot, 'examples/Medium.json'),
                   path.join(repoRoot, 'examples/Complex.json')]);
    assert.strictEqual(out.status, 1);
    assert.ok(/added/.test(out.stdout) && /removed/.test(out.stdout));
  });
});
