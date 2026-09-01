/**
 * Stand-in for a third-party runtime library (highlight).
 *
 * The standalone-loading tests ask one question -- can these modules
 * load without WebGME -- and whether a vendorable library happens to
 * be installed says nothing about it. Stubbing keeps the test
 * hermetic: no bower_components, and no npm packages beyond the ones
 * the generator tests already install.
 *
 * These libraries are used at RUNTIME only, never while the modules
 * are being defined. Deliberately an empty object rather than
 * something permissive: if that ever changes, the test fails loudly
 * and this stub gets updated, instead of passing on a lie.
 *
 * One file per library on purpose -- pointing several requirejs
 * module ids at a single stub file hangs the loader, which resolves
 * the anonymous define() once and leaves the other ids waiting.
 */
define([], function () {
  'use strict';
  return {};
});
