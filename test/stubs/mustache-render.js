/**
 * A real -- if tiny -- mustache, for the tests that need what a
 * template RENDERS rather than only that it loaded.
 *
 * test/stubs/mustache.js is deliberately an empty object: the
 * standalone-loading tests ask whether a module can load without
 * WebGME, and a library that is never called while modules are being
 * defined should not need to exist for that. The create-dialog test
 * asks a different question -- does an Entry block come out as a
 * textarea -- so it needs the substitution to actually happen.
 *
 * `{{name}}` only, which is all the dialog's two templates use. No
 * sections, no partials, no HTML escaping: a template that grew to
 * need any of those would render wrongly here, and the assertion
 * about its output is what would fail.
 *
 * A separate file rather than a second id pointed at
 * test/stubs/mustache.js -- two requirejs ids sharing one stub file
 * hangs the loader.
 */
define([], function () {
  'use strict';
  return {
    render: function (template, view) {
      return String(template).replace(/\{\{(\w+)\}\}/g, function (whole, key) {
        return Object.prototype.hasOwnProperty.call(view || {}, key)
          ? String(view[key]) : '';
      });
    },
  };
});
