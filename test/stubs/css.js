/**
 * requirejs `css!` plugin stub: there is no document to style in
 * node. A host outside WebGME supplies a real one (require-css in the
 * browser).
 */
define([], function () {
  'use strict';
  return {
    load: function (name, parentRequire, onload) { onload(); },
  };
});
