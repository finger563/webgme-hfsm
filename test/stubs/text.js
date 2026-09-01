/**
 * requirejs `text!` plugin stub for the standalone-loading tests: a
 * host outside WebGME supplies its own (the playground vendors
 * requirejs-text). Loading the real markup is not what those tests
 * are about -- reaching a WebGME module is.
 */
define([], function () {
  'use strict';
  var fs = require('fs');
  var path = require('path');
  return {
    load: function (name, parentRequire, onload) {
      try {
        onload(fs.readFileSync(path.resolve(parentRequire.toUrl(name)), 'utf8'));
      } catch (e) {
        onload('');   // markup is not under test here
      }
    },
  };
});
