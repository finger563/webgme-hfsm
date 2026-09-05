/**
 * Shared requirejs setup for loading the (AMD, browser-era) generator
 * modules in node -- used by the hfsm-gen CLI and by the mocha tests.
 *
 * Maps the WebGME client module ids onto local files. handlebars comes
 * from bower_components when present (dev checkout) or from the npm
 * package (CI installs only what the CLI needs).
 *
 * Candidates are tried in order, and the LAST resort for each library
 * is wherever node resolves it from. That matters when this package is
 * a dependency rather than a checkout: npm hoists underscore and
 * friends into the CONSUMER's node_modules, so nothing exists under
 * our own repoRoot/node_modules and every candidate built from
 * repoRoot misses. That is why `npm install webgme-hfsm` followed by
 * `hfsm-gen` reported "cannot find underscore" from any directory but
 * a git clone.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var repoRoot = path.resolve(__dirname, '..');

/**
 * The directory a package resolves to, or null when it is not
 * installed. Deliberately resolves the package ENTRY rather than a
 * deep path: underscore declares an `exports` map, and asking node
 * for 'underscore/underscore-umd' is refused with
 * ERR_PACKAGE_PATH_NOT_EXPORTED even though the file is right there.
 */
function pkgDir(id) {
  try {
    return path.dirname(require.resolve(id));
  } catch (e) {
    return null;
  }
}

/** `rel` inside an installed package, or null when it is absent */
function inPkg(id, rel) {
  var dir = pkgDir(id);
  return dir ? path.join(dir, rel) : null;
}

function firstExisting(candidates, what) {
  candidates = candidates.filter(Boolean);   // absent packages drop out
  for (var j = 0; j < candidates.length; j++) {
    if (fs.existsSync(candidates[j] + '.js')) return candidates[j];
  }
  throw new Error('cannot find ' + what + '; run npm install (see docs/CLI.md)');
}

var configured = false;

function getRequirejs() {
  var requirejs = require('requirejs');
  if (!configured) {
    requirejs.config({
      baseUrl: repoRoot,
      nodeRequire: require,
      paths: {
        'bower/handlebars/handlebars.min': firstExisting([
          path.join(repoRoot, 'bower_components/handlebars/handlebars.min'),
          path.join(repoRoot, 'node_modules/handlebars/dist/handlebars.min'),
          inPkg('handlebars', '../dist/handlebars.min'),  // entry is lib/
        ], 'handlebars'),
        'underscore': firstExisting([
          path.join(repoRoot, 'node_modules/underscore/underscore-umd'),
          path.join(repoRoot, 'node_modules/underscore/underscore'),
          inPkg('underscore', 'underscore-umd'),
          inPkg('underscore', 'underscore'),
        ], 'underscore'),
        'text': firstExisting([
          path.join(repoRoot, 'node_modules/requirejs-text/text'),
          path.join(repoRoot, 'node_modules/text/text'),
          inPkg('requirejs-text', 'text'),
        ], 'requirejs text plugin'),
      },
    });
    configured = true;
  }
  return requirejs;
}

/**
 * Load AMD modules by repo-relative id (e.g. 'src/common/processor').
 * Returns a promise resolving to the array of loaded modules.
 */
function load(moduleIds) {
  return new Promise(function(resolve, reject) {
    getRequirejs()(moduleIds, function() {
      resolve(Array.prototype.slice.call(arguments));
    }, reject);
  });
}

module.exports = { load: load, repoRoot: repoRoot };
