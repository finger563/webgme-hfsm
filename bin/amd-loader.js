/**
 * Shared requirejs setup for loading the (AMD, browser-era) generator
 * modules in node -- used by the hfsm-gen CLI and by the mocha tests.
 *
 * Maps the WebGME client module ids onto local files. handlebars comes
 * from bower_components when present (dev checkout) or from the npm
 * package (CI installs only what the CLI needs).
 */
'use strict';

var fs = require('fs');
var path = require('path');

var repoRoot = path.resolve(__dirname, '..');

function firstExisting(candidates, what) {
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
        ], 'handlebars'),
        'underscore': firstExisting([
          path.join(repoRoot, 'node_modules/underscore/underscore-umd'),
          path.join(repoRoot, 'node_modules/underscore/underscore'),
        ], 'underscore'),
        'text': firstExisting([
          path.join(repoRoot, 'node_modules/requirejs-text/text'),
          path.join(repoRoot, 'node_modules/text/text'),
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
