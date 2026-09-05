#!/usr/bin/env node
/**
 * hfsm-diff: what changed between two HFSM models.
 *
 * The same comparison the playground draws -- src/common/diffModel.js
 * -- in a terminal, so it can run in CI. `git diff` on these files
 * reports the order keys came out in and the coordinates of every
 * node that was dragged; this reports states, transitions and guards.
 *
 * Usage:
 *   hfsm-diff <before.json> <after.json> [options]
 *
 * Options:
 *   -q, --quiet            print nothing; the exit status is the answer
 *       --json             machine-readable output
 *       --moved            list objects that only moved
 *       --exit-zero        always exit 0, even when they differ
 *   -h, --help             show this help
 *
 * Exit status:
 *   0  the machines are the same
 *   1  they differ
 *   2  something went wrong (bad file, bad JSON)
 *
 * A layout-only difference is NOT a difference: dragging a state
 * changes nothing about what the machine does, so a model that has
 * only moved exits 0. Pass --moved to see what moved anyway.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var OK = 0, DIFFERENT = 1, BROKEN = 2;

function fail(msg) {
  console.error('hfsm-diff: ' + msg);
  process.exit(BROKEN);
}

function usage(code) {
  var lines = fs.readFileSync(__filename, 'utf8').split('\n');
  // the usage block is the file header comment; find where it ends
  // rather than hardcoding a line number the comment can outgrow
  var end = lines.indexOf(' */');
  console.log(lines.slice(2, end === -1 ? 24 : end).map(function (l) {
    return l.replace(/^ \*( |$)/, '');
  }).join('\n'));
  process.exit(code);
}

// ------------------------- argument parsing -------------------------
var args = process.argv.slice(2);
var opts = { before: null, after: null, quiet: false, json: false,
             moved: false, exitZero: false };
for (var i = 0; i < args.length; i++) {
  var a = args[i];
  if (a === '-h' || a === '--help') usage(OK);
  else if (a === '-q' || a === '--quiet') opts.quiet = true;
  else if (a === '--json') opts.json = true;
  else if (a === '--moved') opts.moved = true;
  else if (a === '--exit-zero') opts.exitZero = true;
  else if (a[0] === '-') fail("unknown option '" + a + "' (see --help)");
  else if (!opts.before) opts.before = a;
  else if (!opts.after) opts.after = a;
  else fail('expected exactly two model files');
}
if (!opts.before || !opts.after) usage(opts.before ? DIFFERENT : BROKEN);

function read(file) {
  var text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    fail('cannot read ' + file + ': ' + e.message);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    fail('cannot parse ' + file + ': ' + e.message);
  }
}

var before = read(opts.before);
var after = read(opts.after);

function short(value) {
  if (value === undefined || value === '') return '(empty)';
  var text = String(value).replace(/\s+/g, ' ');
  return text.length > 60 ? text.slice(0, 59) + '…' : text;
}

var amdLoader = require('./amd-loader');

amdLoader.load(['src/common/diffModel',
                'src/common/viz/describe']).then(function (modules) {
  var diffModel = modules[0], describe = modules[1];
  var diff;
  try {
    diff = diffModel.diff(before, after);
  } catch (err) {
    fail(typeof err === 'string' ? err : (err && err.message) || String(err));
  }

  var summary = diff.summary;
  // moved is deliberately not part of this: see the note in --help
  var differs = !!(summary.added || summary.removed || summary.changed);

  if (opts.json) {
    console.log(JSON.stringify({
      before: path.basename(opts.before),
      after: path.basename(opts.after),
      differs: differs,
      summary: summary,
      entries: diff.entries.filter(function (e) {
        return e.status !== 'same' || (opts.moved && e.moved);
      }),
    }, null, 2));
  } else if (!opts.quiet) {
    console.log(opts.before + ' -> ' + opts.after);
    console.log('  ' + diffModel.describeSummary(summary));

    var marks = { added: '+', removed: '-', changed: '~' };
    diff.entries.forEach(function (entry) {
      if (entry.status === 'same') {
        if (opts.moved && entry.moved) {
          console.log('  = ' + describe.labelFor(entry) + '  (moved)');
        }
        return;
      }
      var line = '  ' + marks[entry.status] + ' ' + describe.labelFor(entry) +
          '  [' + entry.type + ']';
      if (entry.rehomed) line += '  (was ' + entry.beforePath + ')';
      console.log(line);
      (entry.changes || []).forEach(function (change) {
        console.log('      ' + change.attribute + ': ' + short(change.before) +
                    ' -> ' + short(change.after));
      });
    });
  }

  process.exit(opts.exitZero || !differs ? OK : DIFFERENT);
}).catch(function (err) {
  fail('module loading failed: ' + (err && err.message ? err.message : err));
});
