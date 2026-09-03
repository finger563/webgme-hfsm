/**
 * Editing a code attribute: highlighted where it sits, and bigger
 * when it needs to be.
 *
 * A state's Entry block is C++, and the panel it lives in is a
 * column about 250px wide. Two things follow. It should LOOK like
 * code -- highlighted, monospaced, indented -- because that is most
 * of what makes code readable at a glance. And anything longer than a
 * few lines needs somewhere bigger to go, or the column dictates how
 * much you are willing to write.
 *
 * So: CodeMirror in the row, and the same editor full-size in a modal
 * one click away. The modal is the same text with more room, not a
 * different editor.
 *
 * WHY CODEMIRROR
 * --------------
 * It is already in both hosts and needs no new dependency: WebGME
 * bundles it for its own editors, webgme-codeeditor is built on it,
 * and the playground already uses it for the model and the generated
 * files. Both now map the id `codemirror` onto the SAME npm copy, so
 * the widget can simply ask for it. Monaco would be a ~5MB vendored
 * blob for a language service that, without a compiler, would give us
 * about what `clike` already does.
 */
define(['require'], function (require) {
  'use strict';

  /**
   * CodeMirror is fetched WHEN AN EDITOR IS FIRST OPENED, not when
   * this module loads.
   *
   * Declaring it as a dependency puts it in the visualizer's load
   * path, and doing that made the playground stop starting up: the
   * module graph sat pending with no error, and the tab eventually
   * stopped responding. It also made everyone pay for an editor most
   * sessions never open. Loading it on demand does neither, and the
   * first open costs one fetch of an already-vendored file.
   */
  // so two dialogs never share a title id
  var dialogCount = 0;

  var pending = null;
  function editor() {
    if (!pending) {
      pending = new Promise(function (resolve, reject) {
        require(['codemirror/lib/codemirror', 'codemirror/mode/clike/clike'],
                function (CodeMirror) { resolve(CodeMirror); }, reject);
      });
    }
    return pending;
  }

  /**
   * CodeMirror's stylesheet, added as a plain <link>.
   *
   * NOT through `css!`, which is how every other stylesheet in this
   * widget is loaded. Asking the require-css plugin for this one
   * wedges the module loader: the whole graph sits pending, no error
   * is raised, and the page never finishes starting up. Removing just
   * that dependency is what made it load again. A link element needs
   * no plugin and cannot block anything.
   *
   * Called when an editor is first opened rather than at load: this
   * module is loaded in node by the tests that check the widget can
   * live outside WebGME, and there is no `document` there.
   */
  function ensureStylesheet() {
    var href = require.toUrl('codemirror/lib/codemirror.css');
    var links = document.getElementsByTagName('link');
    for (var i = 0; i < links.length; i++) {
      if (links[i].href && links[i].href.indexOf('codemirror.css') > -1) return;
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  // C++ -- the same mode the playground shows generated .hpp/.cpp in
  var MODE = { name: 'text/x-c++src' };

  var COMMON = {
    mode: MODE,
    lineWrapping: false,
    indentUnit: 2,
    tabSize: 2,
    smartIndent: true,
    matchBrackets: true,
  };

  function extend(base, more) {
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(more || {}).forEach(function (k) { out[k] = more[k]; });
    return out;
  }

  // tall enough for a few lines of an Entry block; longer code has
  // the pop-out
  var INLINE_HEIGHT = 64;

  return {
    /**
     * Turn a textarea into a highlighted editor.
     *
     * Sized in PIXELS through the API rather than by CSS: the panel
     * this sits in scrolls, so leaving the height to the content puts
     * the editor and the panel's scrollbar in a measuring loop.
     *
     * Attaches when CodeMirror arrives, so the field is a working
     * textarea in the meantime.
     *
     * @param textarea  the element to replace
     * @param handlers  { onCommit, onExpand, onReady }
     */
    inline: function (textarea, handlers) {
      handlers = handlers || {};
      return editor().then(function (CodeMirror) {
        ensureStylesheet();
        if (!document.contains(textarea)) return null;  // row already gone
        var cm = CodeMirror.fromTextArea(textarea, extend(COMMON, {
          lineNumbers: false,
          extraKeys: {
            // Enter is a newline in code, so committing is Ctrl/Cmd+Enter
            'Ctrl-Enter': function () { if (handlers.onCommit) handlers.onCommit(); },
            'Cmd-Enter': function () { if (handlers.onCommit) handlers.onCommit(); },
            'Shift-Ctrl-Enter': function () { if (handlers.onExpand) handlers.onExpand(); },
            'Shift-Cmd-Enter': function () { if (handlers.onExpand) handlers.onExpand(); },
            // Tab indents in code; Escape first, then Tab, leaves
            Esc: function (ed) { ed.getInputField().blur(); },
          },
        }));
        cm.getWrapperElement().classList.add('inspector-cm');
        cm.setSize('100%', INLINE_HEIGHT);
        cm.on('blur', function () { if (handlers.onCommit) handlers.onCommit(); });
        if (handlers.onReady) handlers.onReady(cm);
        return cm;
      }).catch(function (e) {
        // a plain textarea still edits the attribute
        console.error('Could not attach the code editor: ', e);
        return null;
      });
    },

    /**
     * The same code, full size, in a modal.
     *
     * @param opts  { title, subtitle, value, readOnly, prose, sites,
     *                onSave }
     *   `prose` for markdown rather than C++: wrapped, unnumbered and
     *   unhighlighted, because paragraphs want the width and
     *   colouring prose as code would be a lie. The room is the point
     *   either way, which is why documentation gets this too.
     *
     *   `sites` is what `codeContext.sites` found: the places this
     *   snippet is generated into. Each is shown as the lines above
     *   and below, greyed and unselectable-looking, with the editor
     *   between them -- so the code is written where it will run,
     *   next to the aliases that say what is in scope. More than one
     *   site is not a problem to hide: a transition's action really
     *   is compiled into every place that transition can be taken,
     *   and stepping through them is the only way to see that.
     * @return a function that closes it
     */
    open: function (opts) {
      opts = opts || {};
      ensureStylesheet();
      var CodeMirror = null;
      var sites = (opts.sites || []).slice();
      var siteIndex = 0;
      var overlay = $('<div class="code-modal-overlay"></div>');
      // a dialog announces itself by its heading; without the link a
      // screen reader reaches an unnamed one
      var titleId = 'code-modal-title-' + (++dialogCount);
      var box = $('<div class="code-modal" role="dialog" aria-modal="true"></div>')
          .attr('aria-labelledby', titleId)
          .addClass(opts.prose ? 'is-prose' : 'is-code');
      var head = $('<div class="code-modal-head"></div>').append(
        $('<span class="code-modal-title"></span>')
          .attr('id', titleId).text(opts.title || 'Code'),
        $('<span class="code-modal-subtitle"></span>').text(opts.subtitle || ''));
      var body = $('<div class="code-modal-body"></div>');
      var area = $('<textarea></textarea>').val(opts.value || '');

      // The frame. `aria-hidden`: it is the same code the editor
      // already contains the point of, and a screen reader reading
      // two dozen lines of generated aliases before reaching the
      // editable field would bury it.
      var before = $('<pre class="code-context is-before"></pre>')
          .attr('aria-hidden', 'true');
      var after = $('<pre class="code-context is-after"></pre>')
          .attr('aria-hidden', 'true');
      var where = $('<span class="code-modal-where"></span>');
      // A single glyph is not a label. The title is for a mouse
      // pointer; aria-label is what anything else reads.
      var prev = $('<button type="button" class="code-modal-step">\u2039</button>')
          .attr('title', 'The previous place this is generated into')
          .attr('aria-label', 'The previous place this is generated into');
      var next = $('<button type="button" class="code-modal-step">\u203a</button>')
          .attr('title', 'The next place this is generated into')
          .attr('aria-label', 'The next place this is generated into');

      function showSite() {
        var site = sites[siteIndex];
        if (!site) return;
        before.text(site.before);
        after.text(site.after);
        // The lines NEAREST the snippet are the ones worth seeing: the
        // aliases just above it, the brace just below. So a frame too
        // tall to fit shows its bottom, and the one below shows its
        // top -- set here rather than left to a flexbox trick, which
        // depended on how a browser lays out an overflowing text node
        // and had to be re-set on every step anyway.
        before.scrollTop(before.prop('scrollHeight'));
        after.scrollTop(0);
        where.text(site.file + ':' + site.line +
                   (sites.length > 1
                    ? '   \u00b7   ' + (siteIndex + 1) + ' of ' + sites.length +
                      ' places this is generated into'
                    : ''));
      }

      function step(by) {
        siteIndex = (siteIndex + by + sites.length) % sites.length;
        showSite();
      }
      prev.on('click', function () { step(-1); });
      next.on('click', function () { step(1); });
      // read-only from the start: CodeMirror arrives asynchronously
      // and may not arrive at all, and until it does this textarea is
      // the editor -- editable, it would let a read-only model be
      // changed and saved
      if (opts.readOnly) area.prop('readonly', true);
      var buttons = $('<div class="code-modal-buttons"></div>');
      var hint = $('<span class="code-modal-hint"></span>')
          .text('Ctrl/Cmd+Enter saves, Esc cancels');
      var cancel = $('<button type="button">Cancel</button>');
      var save = $('<button type="button" class="primary">Save</button>');
      if (opts.readOnly) save.prop('disabled', true);

      var opener = document.activeElement;
      var cm = null;

      function close() {
        $(document).off('keydown', onKey);
        overlay.remove();
        if (opener && opener.focus && document.contains(opener)) opener.focus();
      }
      function commit() {
        var value = cm ? cm.getValue() : area.val();
        close();
        if (opts.onSave) opts.onSave(value);
      }
      /**
       * Everything Tab can reach inside the dialog, in order.
       *
       * The EDITOR has to be in this list, not just the buttons.
       * CodeMirror replaces the textarea with its own hidden input,
       * so the set changes once it loads -- and a trap that only knew
       * about buttons let Shift+Tab out of the first one and into the
       * page behind the backdrop.
       */
      function focusables() {
        return box.find('textarea, button, [tabindex]').filter(function () {
          return !this.disabled && this.offsetParent !== null;
        });
      }
      function onKey(event) {
        if (event.key === 'Escape') { close(); return; }
        if (event.key !== 'Tab') return;
        // `aria-modal` has to be true of the behaviour, not just the
        // attribute: keep Tab inside
        var items = focusables();
        if (!items.length) return;
        var first = items.get(0), last = items.get(items.length - 1);
        var active = document.activeElement;
        if (!box[0].contains(active)) { event.preventDefault(); first.focus(); }
        else if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
      }

      cancel.on('click', close);
      save.on('click', commit);
      overlay.on('mousedown', function (event) {
        // the backdrop cancels; the dialog must not
        if (event.target === overlay[0]) close();
      });

      if (sites.length) {
        box.addClass('has-context');
        head.append(where);
        if (sites.length > 1) head.append(prev, next);
        body.append(before, $('<div class="code-modal-edit"></div>').append(area),
                    after);
        showSite();
      } else {
        body.append(area);
      }
      box.append(head, body, buttons.append(hint, cancel, save));
      overlay.append(box);
      $(document.body).append(overlay);
      $(document).on('keydown', onKey);

      // the dialog is usable as a plain textarea until the editor
      // arrives, rather than showing nothing while it loads
      area.focus();
      editor().then(function (CM) {
        CodeMirror = CM;
        if (!document.contains(area[0])) return;   // already closed
        cm = CodeMirror.fromTextArea(area[0], extend(COMMON, {
          mode: opts.prose ? null : MODE,
          lineNumbers: !opts.prose,
          lineWrapping: !!opts.prose,
          readOnly: !!opts.readOnly,
          autofocus: true,
          extraKeys: {
            'Ctrl-Enter': commit,
            'Cmd-Enter': commit,
          },
        }));
        cm.setSize('100%', '100%');
        cm.focus();
        // the frame is measured against the editor, which only has a
        // height once CodeMirror has laid itself out
        if (sites.length) showSite();
      }).catch(function (e) {
        // a textarea still edits the attribute
        console.error('Could not load the code editor: ', e);
      });

      return close;
    },
  };
});
