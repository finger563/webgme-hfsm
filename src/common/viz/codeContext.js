/**
 * Where a snippet ends up in the generated code.
 *
 * WHY
 * ---
 * An Entry block is edited on its own, in a box, with nothing to say
 * what is around it. That is the part of writing these snippets that
 * has no answer in the tool: which variables are in scope, what has
 * already run by the time this line does, what runs next. People
 * answer it by generating the code and reading it, which means
 * leaving the editor.
 *
 * The generator already marks every snippet it emits:
 *
 *   //::::<path>::::<attribute>::::
 *
 * so the surrounding lines are locatable in the output without
 * parsing C++ or knowing anything about the templates. That is all
 * this does: find the marker, hand back the lines above and below.
 *
 * A SNIPPET CAN LAND IN SEVERAL PLACES
 * ------------------------------------
 * A transition's Action is emitted at every site that can take that
 * transition -- six, for one of the transitions in the Complex
 * example. So this returns a LIST of sites, not a site. Being told
 * that the two lines you are writing are compiled into six different
 * places, and being able to look at each, is worth more than any one
 * of them.
 *
 * WHAT THE FRAME MAY NOT CONTAIN
 * ------------------------------
 * Another snippet. The frame is read-only context, and showing one
 * person's Exit block greyed out inside another's Entry frame would
 * read as generated scaffolding that cannot be changed -- when in
 * fact it is editable, somewhere else. So the frame stops at the
 * neighbouring markers, however few lines that leaves.
 */
define([], function () {
  'use strict';

  var MARKER = '::::';

  // The frame wants to be the ENCLOSING FUNCTION where there is one:
  // its signature, the aliases that say what is in scope, and the
  // brace that ends it. Showing the next function underneath is
  // noise, and stopping halfway up the aliases hides the answer.
  //
  // Not every snippet has an enclosing function to find, though -- a
  // transition's action sits deep inside a switch inside one -- so
  // these bound the search, and a snippet with nothing to anchor to
  // gets a plain window of this many lines.
  var BEFORE_LINES = 40;
  var AFTER_LINES = 14;

  // a definition at column 0 that opens a block: `void Root::S::entry
  // ( void ) {`. Column 0 is what makes it the enclosing function
  // rather than a nested block.
  var OPENS_FUNCTION = /^\S.*\{\s*$/;

  // and the brace that closes it, likewise unindented
  var CLOSES_FUNCTION = /^\}/;

  /** the exact line the generator emits ahead of a snippet */
  function markerFor(path, attribute) {
    return '//' + MARKER + path + MARKER + attribute + MARKER;
  }

  function isMarker(line) {
    var t = line.trim();
    return t.indexOf('//' + MARKER) === 0 && t.lastIndexOf(MARKER) > 2;
  }

  /**
   * How many lines of output a snippet occupies.
   *
   * The generator writes the value verbatim after the marker, so it
   * is the value's own line count -- and one line even when the value
   * is empty, because the template's indentation is still emitted.
   */
  function snippetHeight(value) {
    if (typeof value !== 'string' || value === '') return 1;
    return value.split('\n').length;
  }

  return {
    BEFORE_LINES: BEFORE_LINES,
    AFTER_LINES: AFTER_LINES,
    markerFor: markerFor,
    snippetHeight: snippetHeight,

    /**
     * Every place this snippet was generated into.
     *
     * @param files      { '<name>': '<text>' } -- whatever the host
     *                   last generated
     * @param path       the node's model path, as the marker spells it
     * @param attribute  'Entry', 'Guard', ...
     * @param value      what the attribute currently holds, which is
     *                   how many lines the snippet takes up
     * @return [ { file, line, before, after } ], `line` 1-based and
     *         pointing at the marker; empty when nothing matches --
     *         a node created since the last generation, a host with
     *         no generated code, or an attribute the templates do not
     *         emit
     */
    sites: function (files, path, attribute, value) {
      if (!files || !path || !attribute) return [];
      var marker = markerFor(path, attribute);
      var height = snippetHeight(value);
      var found = [];

      // sorted, so the same model always reports the same order --
      // object key order is not something to show in a "3 of 6"
      Object.keys(files).sort().forEach(function (name) {
        var text = files[name];
        if (typeof text !== 'string' || text.indexOf(marker) === -1) return;
        var lines = text.split('\n');

        lines.forEach(function (line, i) {
          if (line.trim() !== marker) return;

          // Walk back to whichever comes first: the line that opens
          // the enclosing function (kept -- it is the signature), a
          // neighbouring snippet (dropped), or the budget.
          var from = Math.max(0, i - BEFORE_LINES);
          for (var b = i - 1; b >= from; b--) {
            if (isMarker(lines[b])) { from = b + 1; break; }
            if (OPENS_FUNCTION.test(lines[b])) { from = b; break; }
          }

          // and forward from the end of the snippet, stopping at the
          // brace that closes the function -- keeping it, dropping
          // whatever comes after
          var snippetEnd = i + height;          // last snippet line
          var to = Math.min(lines.length - 1, snippetEnd + AFTER_LINES);
          for (var a = snippetEnd + 1; a <= to; a++) {
            if (isMarker(lines[a])) { to = a - 1; break; }
            if (CLOSES_FUNCTION.test(lines[a])) { to = a; break; }
          }

          found.push({
            file: name,
            line: i + 1,
            before: lines.slice(from, i).join('\n'),
            after: lines.slice(snippetEnd + 1, to + 1).join('\n'),
          });
        });
      });

      return found;
    },
  };
});
