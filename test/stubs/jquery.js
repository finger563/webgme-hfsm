/**
 * jQuery, stubbed for node.
 *
 * The playground's host and palette are jQuery-based because the
 * widget they serve is. jQuery is a vendored browser library, so
 * whether it happens to be installed here says nothing about the
 * questions these tests ask -- which types the palette offers, and
 * whether the host satisfies the HostServices contract. Both are
 * answered before a single element is touched.
 *
 * Anything that really does reach the DOM is verified in a browser
 * instead; a fake that returned plausible-looking elements would only
 * be able to confirm that the fake behaves like the fake.
 */
define([], function () {
  'use strict';

  function chain() {
    var self = function () { return self; };
    ['append', 'appendTo', 'text', 'attr', 'css', 'val', 'on', 'off',
     'remove', 'focus', 'filter', 'find'].forEach(function (method) {
       self[method] = function () { return self; };
     });
    self.length = 0;
    self[0] = undefined;
    return self;
  }

  var $ = function () { return chain(); };
  $.fn = {};
  return $;
});
