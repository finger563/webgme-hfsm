#!/usr/bin/env node
/**
 * hfsm-gen: standalone (WebGME-free) HFSM code generator CLI.
 *
 * Runs the same checkModel -> processor -> template pipeline as the
 * WebGME SoftwareGenerator plugin, but takes a plain JSON model file
 * as input so that code generation can run in CI, scripts, and tests.
 *
 * Usage:
 *   hfsm-gen <model.json> [options]
 *
 * Options:
 *   -o, --out <dir>        output directory (default: ./generated)
 *   -n, --namespace <ns>   C++ namespace (default: state_machine)
 *   -t, --test-bench       also generate the test bench (Makefile + test.cpp)
 *   -e, --export <fmts>    comma-separated interop exports:
 *                          mermaid, plantuml, scxml (or 'all')
 *       --no-code          skip C++ code generation (exports only)
 *   -h, --help             show this help
 *
 * The model JSON format is the webgme-to-json format; see
 * src/common/resolveModel.js and test/fixtures/ for examples.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var repoRoot = path.resolve(__dirname, '..');

function fail(msg) {
  console.error('hfsm-gen: ' + msg);
  process.exit(1);
}

function usage(code) {
  var lines = fs.readFileSync(__filename, 'utf8').split('\n');
  // print the usage block from the file header comment
  console.log(lines.slice(2, 24).map(function(l) {
    return l.replace(/^ \*( |$)/, '');
  }).join('\n'));
  process.exit(code);
}

// ------------------------- argument parsing -------------------------
var args = process.argv.slice(2);
var opts = {
  input: null,
  out: 'generated',
  namespace: null, // -n flag > model.namespace > 'state_machine'
  testBench: false,
  exports: [],
  code: true,
};
for (var i = 0; i < args.length; i++) {
  var a = args[i];
  if (a === '-h' || a === '--help') usage(0);
  else if (a === '-o' || a === '--out') opts.out = args[++i];
  else if (a === '-n' || a === '--namespace') opts.namespace = args[++i];
  else if (a === '-t' || a === '--test-bench') opts.testBench = true;
  else if (a === '-e' || a === '--export') {
    opts.exports = opts.exports.concat((args[++i] || '').split(','));
  }
  else if (a === '--no-code') opts.code = false;
  else if (a[0] === '-') fail("unknown option '" + a + "' (see --help)");
  else if (!opts.input) opts.input = a;
  else fail('multiple input files given');
}
if (!opts.input) usage(1);
if (opts.exports.indexOf('all') > -1) {
  opts.exports = ['mermaid', 'plantuml', 'scxml'];
}
var badFmt = opts.exports.filter(function(f) {
  return ['mermaid', 'plantuml', 'scxml'].indexOf(f) === -1;
});
if (badFmt.length) fail('unknown export format(s): ' + badFmt.join(', '));

// ------------------------- generation -------------------------------
var amdLoader = require('./amd-loader');

var inputData = fs.readFileSync(opts.input, 'utf8');
var model;
try {
  model = JSON.parse(inputData);
} catch (e) {
  fail('cannot parse ' + opts.input + ': ' + e.message);
}

amdLoader.load([
  'src/common/resolveModel',
  'src/common/processor',
  'src/common/exporters',
  'src/common/checkModel',
  'src/plugins/SoftwareGenerator/templates/MetaTemplates',
]).then(function(modules) {
  var resolveModel = modules[0], processor = modules[1],
      exporters = modules[2], checkModel = modules[3],
      MetaTemplates = modules[4];

  // the model file may declare its own C++ namespace; an explicit
  // -n flag overrides it
  if (!opts.namespace) {
    opts.namespace = (typeof model.namespace === 'string' &&
                      model.namespace.trim()) || 'state_machine';
  }
  // the namespace is emitted verbatim into every generated file:
  // each ::-segment must be an identifier and not a C++ keyword
  // ('namespace class {' would not compile)
  if (!/^[A-Za-z_]\w*(::[A-Za-z_]\w*)*$/.test(opts.namespace)) {
    fail("invalid C++ namespace '" + opts.namespace +
         "' (expected identifier or identifier::identifier...)");
  }
  var badSegments = opts.namespace.split('::').filter(function(seg) {
    return checkModel.cppKeywords.indexOf(seg) > -1;
  });
  if (badSegments.length) {
    fail("invalid C++ namespace '" + opts.namespace +
         "': segment(s) " + badSegments.join(', ') +
         " are C++ keywords");
  }
  var artifacts = {};
  try {
    resolveModel.resolve(model);
    processor.processModel(model); // includes checkModel; throws strings
    (model.warnings || []).forEach(function(w) {
      console.error('hfsm-gen: warning: ' + w);
    });

    if (opts.code) {
      Object.assign(artifacts,
                    MetaTemplates.renderHFSM(model, opts.namespace));
      if (opts.testBench) {
        Object.assign(artifacts,
                      MetaTemplates.renderTestCode(model, opts.namespace));
      }
    }

    // interop exports, one file per state machine / library. Export
    // names derive from sanitized machine names; refuse silent
    // overwrites between colliding machines (renderHFSM catches this
    // for code artifacts, but --no-code skips it)
    var addArtifact = function(fname, content, machine) {
      if (Object.prototype.hasOwnProperty.call(artifacts, fname) &&
          artifacts[fname] !== content) {
        throw "ERROR: machine '" + machine.name + "' (" + machine.path +
          ") produces artifact '" + fname + "' which collides with " +
          "another machine's -- rename one of the machines.";
      }
      artifacts[fname] = content;
    };
    var machinePaths = Object.keys(model.objects).filter(function(p) {
      return model.objects[p].type === 'State Machine' ||
        model.objects[p].type === 'Library';
    }).sort();
    opts.exports.forEach(function(fmt) {
      machinePaths.forEach(function(mp) {
        var machine = model.objects[mp];
        var ext = { mermaid: '.mmd', plantuml: '.puml', scxml: '.scxml' }[fmt];
        var render = {
          mermaid: exporters.toMermaid,
          plantuml: exporters.toPlantUML,
          scxml: exporters.toSCXML,
        }[fmt];
        addArtifact(machine.sanitizedName + ext, render(model, mp), machine);
      });
    });

    // provenance metadata
    artifacts['hfsm_metadata.json'] = JSON.stringify({
      generator: 'hfsm-gen',
      inputFile: path.basename(opts.input),
      inputSha256: crypto.createHash('sha256').update(inputData).digest('hex'),
      namespace: opts.namespace,
      timeStamp: (new Date()).toISOString(),
    }, null, 2) + '\n';
  } catch (err) {
    // A rejected model is the user's problem to fix and the message
    // says how; a stack trace into checkModel would just bury it.
    // Anything else is our bug, and then the stack is the point.
    if (typeof err === 'string') fail(err);
    else if (err && err.name === 'ModelError') fail(err.message);
    else fail((err && err.stack) || String(err));
  }

  fs.mkdirSync(opts.out, { recursive: true });
  Object.keys(artifacts).sort().forEach(function(fname) {
    var outPath = path.join(opts.out, fname);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, artifacts[fname]);
    console.log('  wrote ' + outPath);
  });
  console.log('hfsm-gen: generated ' + Object.keys(artifacts).length +
              ' files in ' + opts.out);
}).catch(function(err) {
  fail('module loading failed: ' + (err && err.message ? err.message : err));
});
