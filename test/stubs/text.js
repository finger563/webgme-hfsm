/**
 * requirejs `text!` plugin stub.
 *
 * Returns empty text rather than reading the file. These tests ask
 * whether the modules can be RESOLVED without WebGME; none of them
 * touches its markup while being defined, so the actual content is
 * irrelevant here and a host outside WebGME supplies a real plugin
 * anyway (the playground vendors requirejs-text).
 *
 * This also sidesteps a trap: inside an AMD factory, `require` is the
 * loader, not node's, so a stub that reached for `fs` would depend on
 * which one happened to be in scope.
 */
define([], function () {
  'use strict';
  return {
    load: function (name, parentRequire, onload) { onload(''); },
  };
});
