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
 * parsing C++ or knowing anything about the templates.
 *
 * MEASURED AGAINST WHAT WAS GENERATED, NOT WHAT IS BEING TYPED
 * -----------------------------------------------------------
 * The files are from the last generation, so the snippet inside them
 * is the value the model had THEN. An earlier version of this used
 * the editor's current text to work out how many lines the snippet
 * occupied, which slid the frame the moment anyone typed: shorten a
 * four-line action to one and three orphaned lines appeared in the
 * frame below it; lengthen it and the frame skipped the brace that
 * closed the function. So the host hands over the model it generated
 * from along with the files, and every measurement comes from there.
 *
 * A SNIPPET IS NOT ALWAYS A RUN OF WHOLE LINES
 * --------------------------------------------
 * A Guard is emitted INSIDE a line -- `else if ( <guard> ) {` -- so
 * counting lines after the marker is wrong for it in a way that is
 * invisible until you look. Rather than special-case the templates,
 * the value is LOCATED in the text: the frame ends where the value
 * starts and resumes where it ends, part-way through a line if that
 * is where it sits. A guard then reads exactly as it is compiled,
 * `else if (` above and `) {` below.
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
 * person's Guard greyed out inside another's Action frame would read
 * as generated scaffolding that cannot be changed -- when in fact it
 * is editable, somewhere else. Stopping at the neighbouring MARKER is
 * not enough: the marker is followed by the neighbour's snippet, so
 * the frame started with someone else's code. The neighbour is
 * located the same way, and the frame starts after it.
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

  /**
   * The path and attribute a marker line names, or null.
   * Used to find out what a NEIGHBOURING snippet is, so its extent
   * can be measured and kept out of the frame.
   */
  function parseMarker(line) {
    var text = String(line).trim();
    if (text.indexOf('//' + MARKER) !== 0) return null;
    var parts = text.slice(2).split(MARKER);
    // '', path, attribute, ''
    if (parts.length < 4 || !parts[1] || !parts[2]) return null;
    return { path: parts[1], attribute: parts[2] };
  }

  function isMarker(line) {
    return !!parseMarker(line);
  }

  /** what an attribute held when the code was generated */
  function generatedValue(model, path, attribute) {
    var objects = model && model.objects;
    var object = objects && objects[path];
    if (!object) return undefined;
    var value = object[attribute];
    if (value === undefined && object.attributes) {
      value = object.attributes[attribute];
    }
    return value;
  }

  /**
   * Where a snippet actually sits in the generated text.
   *
   * @param lines   the file, split
   * @param at      index of the marker line
   * @param value   what the attribute held when this was generated
   * @return { endLine, startLine, startCol, endCol } -- the half-open
   *         span the snippet occupies, with startCol/endCol saying
   *         where within its first and last lines it begins and ends.
   *         null when the value cannot be found where it should be,
   *         which means this file was generated from something else.
   */
  function spanOf(lines, at, value) {
    var first = at + 1;
    if (first >= lines.length) return null;

    // An empty snippet is the one line the template's indentation
    // still emits, with nothing on it.
    if (typeof value !== 'string' || value === '') {
      return { startLine: first, startCol: 0,
               endLine: first, endCol: lines[first].length };
    }

    var parts = value.split('\n');
    var startCol = lines[first].indexOf(parts[0]);
    if (startCol === -1) return null;          // not where it should be

    var endLine = first + parts.length - 1;
    if (endLine >= lines.length) return null;
    var last = parts[parts.length - 1];
    var endCol;
    if (parts.length === 1) {
      endCol = startCol + last.length;
    } else {
      var found = lines[endLine].indexOf(last);
      if (found === -1) return null;
      endCol = found + last.length;
    }
    return { startLine: first, startCol: startCol,
             endLine: endLine, endCol: endCol };
  }

  /** everything from (line, col) up to the end of `to`, as text */
  function textBetween(lines, fromLine, fromCol, toLine, toCol) {
    if (fromLine > toLine) return '';
    var out = [];
    for (var i = fromLine; i <= toLine; i++) {
      var line = lines[i];
      var start = (i === fromLine) ? fromCol : 0;
      var end = (i === toLine) ? toCol : line.length;
      out.push(line.slice(start, end));
    }
    return out.join('\n');
  }

  return {
    BEFORE_LINES: BEFORE_LINES,
    AFTER_LINES: AFTER_LINES,
    markerFor: markerFor,
    parseMarker: parseMarker,
    spanOf: spanOf,

    /**
     * Every place this snippet was generated into.
     *
     * @param generated  { files: { '<name>': '<text>' }, model }
     *                   -- what the host last generated, and the
     *                   model it generated from. Both, because a
     *                   measurement taken against the wrong model is
     *                   worse than no frame.
     * @param path       the node's model path, as the marker spells it
     * @param attribute  'Entry', 'Guard', ...
     * @return [ { file, line, before, after } ], `line` 1-based and
     *         pointing at the marker; empty when nothing matches --
     *         a node created since the last generation, a host with
     *         no generated code, or a file that no longer matches the
     *         model it is paired with
     */
    sites: function (generated, path, attribute) {
      var files = generated && generated.files;
      var model = generated && generated.model;
      if (!files || !model || !path || !attribute) return [];
      var marker = markerFor(path, attribute);
      var value = generatedValue(model, path, attribute);
      var found = [];

      // sorted, so the same model always reports the same order --
      // object key order is not something to show in a "3 of 6"
      Object.keys(files).sort().forEach(function (name) {
        var text = files[name];
        if (typeof text !== 'string' || text.indexOf(marker) === -1) return;
        var lines = text.split('\n');

        lines.forEach(function (line, i) {
          if (line.trim() !== marker) return;

          var span = spanOf(lines, i, value);
          // The value is not where the marker says it should be, so
          // this file was generated from a different model. A frame
          // drawn from it would be fiction.
          if (!span) return;

          // Walk back to whichever comes first: the line that opens
          // the enclosing function (kept -- it is the signature), a
          // neighbouring snippet, or the budget.
          var from = Math.max(0, i - BEFORE_LINES);
          var fromCol = 0;
          for (var b = i - 1; b >= from; b--) {
            var neighbour = parseMarker(lines[b]);
            if (neighbour) {
              // Its marker is not the boundary -- its CODE is, and
              // that code may end part-way through a line, as a
              // guard's does. Start after it.
              var theirs = spanOf(lines, b,
                                  generatedValue(model, neighbour.path,
                                                 neighbour.attribute));
              if (theirs) {
                from = theirs.endLine;
                fromCol = theirs.endCol;
              } else {
                from = b + 1;   // cannot measure it; keep it out whole
                fromCol = 0;
              }
              break;
            }
            if (OPENS_FUNCTION.test(lines[b])) { from = b; break; }
          }

          // and forward from the end of the snippet, stopping at the
          // brace that closes the function -- keeping it, dropping
          // whatever comes after
          var to = Math.min(lines.length - 1, span.endLine + AFTER_LINES);
          for (var a = span.endLine + 1; a <= to; a++) {
            if (isMarker(lines[a])) { to = a - 1; break; }
            if (CLOSES_FUNCTION.test(lines[a])) { to = a; break; }
          }

          // The marker line itself is generator bookkeeping, so it
          // is left out; what is kept is whatever of the snippet's
          // own first line comes BEFORE the value -- `else if ( `
          // for a guard, nothing at all for an entry block.
          var head = (i - 1 >= from)
              ? textBetween(lines, from, fromCol, i - 1, lines[i - 1].length)
              : '';
          var prefix = lines[span.startLine].slice(0, span.startCol);
          var tail = (span.endLine + 1 <= to)
              ? textBetween(lines, span.endLine + 1, 0, to, lines[to].length)
              : '';
          var suffix = lines[span.endLine].slice(span.endCol);

          found.push({
            file: name,
            line: i + 1,
            before: prefix.trim() ? (head ? head + '\n' + prefix : prefix) : head,
            after: suffix.trim() ? (tail ? suffix + '\n' + tail : suffix) : tail,
          });
        });
      });

      return found;
    },
  };
});
