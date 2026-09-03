/**
 * HFSM Playground -- a fully static front end for the model checker,
 * code generator and interop exporters.
 *
 * It loads the SAME AMD modules the CLI and the WebGME plugin use
 * (src/common/* and the SoftwareGenerator templates), so there is no
 * second implementation to keep in sync. Everything runs in the
 * browser: no server, no database, no authentication.
 *
 * Note: the template loader uses XHR, so the page must be served over
 * http(s) -- opening index.html from the filesystem will not work.
 * `npm run web` (or any static file server) is enough.
 */
/* global requirejs */
(function () {
  'use strict';

  requirejs.config({
    baseUrl: '.',
    paths: {
      // the generator modules reference these ids exactly as they do
      // inside WebGME, so the sources need no modification here
      'bower/handlebars/handlebars.min': 'vendor/handlebars.min',
      'underscore': 'vendor/underscore-umd',
      'text': 'vendor/text',
      'hfsm': 'src/common',
      'templates': 'src/plugins/SoftwareGenerator/templates',

      // the visualizer, copied in verbatim, names its dependencies
      // the way it does inside WebGME -- so they are mapped, not
      // rewritten. See scripts/build-web.sh.
      'widgets': 'src/visualizers/widgets',
      'decorators': 'src/decorators',
      'bower': 'vendor/bower',
      'q': 'vendor/q',
      'css': 'vendor/css.min',
      'jquery': 'vendor/jquery.min',
      'bootstrap': 'vendor/bootstrap.min',
      // the widget edits code attributes in CodeMirror; this is the
      // same copy the page itself uses, under the id the widget asks
      // for (WebGME maps it too -- see config/config.default.js)
      'codemirror': 'vendor/codemirror',
      'cytoscape-edgehandles': 'vendor/bower/cytoscape-edgehandles/cytoscape-edgehandles',
      'cytoscape-context-menus': 'vendor/bower/cytoscape-context-menus/cytoscape-context-menus',
      'cytoscape-panzoom': 'vendor/bower/cytoscape-panzoom/cytoscape-panzoom',
    },
    // cytoscape's plugins register themselves on the library, so it
    // has to be there before they run
    shim: {
      // bootstrap is a jQuery plugin: it needs jQuery on the page
      // before it runs, and exports nothing of its own
      'bootstrap': { deps: ['jquery'] },
      'cytoscape-edgehandles': { deps: ['bower/cytoscape/dist/cytoscape.min'] },
      'cytoscape-context-menus': { deps: ['bower/cytoscape/dist/cytoscape.min'] },
      'cytoscape-panzoom': { deps: ['bower/cytoscape/dist/cytoscape.min'] },
      'bower/cytoscape-cose-bilkent/cytoscape-cose-bilkent': {
        deps: ['bower/cytoscape/dist/cytoscape.min'],
      },
    },
    // The default is 7s, which the generator can exceed on a slow
    // link or a single-threaded static server: it pulls every
    // template through the text! plugin (one request each) alongside
    // the editor library. Exceeding it aborts the whole load even
    // though the files arrive fine moments later. Generous but still
    // bounded, so a genuinely missing module still reports.
    waitSeconds: 60,
  });

  // The SAME ids the widget's code editor asks for. An anonymous AMD
  // module can only be claimed by one id: naming these files by path
  // here and by `codemirror/...` there fetched them once and then left
  // the widget's request pending forever, because the define() had
  // already been consumed.
  var CM_ID = 'codemirror/lib/codemirror';
  var CM_MODES = [
    'codemirror/mode/javascript/javascript', // JSON
    'codemirror/mode/clike/clike',           // C++
    'codemirror/mode/xml/xml',               // SCXML
    'codemirror/mode/shell/shell',           // Makefile (close enough)
  ];

  var el = function (id) { return document.getElementById(id); };
  var mods = null;
  var artifacts = Object.create(null);
  var currentName = null;
  var CodeMirror = null;   // null until the editor library loads
  var modelEditor = null;  // the editable model view
  var viewerEditor = null; // the read-only output view

  // The project's own machines first -- they are hand-laid-out, so
  // they draw the way they do in WebGME rather than being arranged
  // automatically -- then the smaller ones each built to show off one
  // feature. Every one of them is generated from and compared against
  // committed goldens by CI (see scripts/build-web.sh).
  var EXAMPLES = [
    { label: 'Simple (two states, an event with a payload)',
      file: 'examples/Simple.json' },
    { label: 'Medium (nesting, history, choices)',
      file: 'examples/Medium.json' },
    { label: 'Complex (11 states, 34 transitions, end states)',
      file: 'examples/Complex.json' },
    { label: 'Basic (two states, one event)', file: 'examples/basic.json' },
    { label: 'Features (hierarchy, history, choices)', file: 'examples/features.json' },
    { label: 'Payloads (typed event data)', file: 'examples/payloads.json' },
  ];

  /* ------------------------ how it is laid out ---------------------- */

  /**
   * Where the panes are split, and whether the model text is
   * collapsed.
   *
   * localStorage, unlike the model draft next door, and for the
   * opposite reason: this is a PREFERENCE, not work. Someone who
   * likes a narrow editor and a wide diagram wants that in the next
   * tab and tomorrow, not just until this tab closes -- whereas one
   * tab must never overwrite what another is editing. So: layout
   * across the browser, model per tab.
   */
  var LAYOUT_KEY = 'hfsm-playground:layout';
  var layout = {};

  function readLayout() {
    try {
      layout = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}') || {};
    } catch (e) {
      layout = {};   // unreadable or corrupt: the defaults are fine
    }
    return layout;
  }

  function rememberLayout(changes) {
    Object.keys(changes || {}).forEach(function (k) { layout[k] = changes[k]; });
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch (e) {
      // storage off or full; the layout is still applied, just not kept
    }
  }

  /* ------------- surviving a refresh, one tab at a time ------------ */

  /**
   * The model text is the work: nothing is saved anywhere, so a
   * mistyped Cmd-R used to lose it.
   *
   * sessionStorage rather than localStorage, deliberately. It is
   * scoped to the TAB, so two tabs with two different machines keep
   * two different drafts instead of overwriting each other -- which
   * is the way this actually gets used, one model per tab. It also
   * goes away when the tab does, which is the right lifetime for
   * something the user never asked to save: this is crash
   * protection, not storage. Downloading is still how you keep a
   * model.
   */
  var DRAFT_KEY = 'hfsm-playground:draft';
  var SAVE_DELAY = 400;
  var draftTimer = null;
  var restoredDraft = null;   // what this tab came back to, if anything

  function writeDraft() {
    draftTimer = null;
    var text = getModelText();
    try {
      if (!text.trim()) sessionStorage.removeItem(DRAFT_KEY);
      else sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        text: text,
        namespace: el('namespaceInput').value,
        testBench: el('testBenchInput').checked,
        // which half of the output was showing, so a refresh puts you
        // back where you were rather than on the Code tab
        tab: vizShown ? 'diagram' : 'code',
        loaded: loadedText,
      }));
    } catch (e) {
      // private browsing, a full quota, storage disabled -- none of
      // which should cost anyone their editing session
    }
  }

  function rememberDraft() {
    // debounced: this runs on every keystroke
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(writeDraft, SAVE_DELAY);
  }

  /**
   * Write the pending draft NOW.
   *
   * Without this the debounce is a hole exactly where it hurts:
   * type, hit Cmd-R within the delay, and the timer dies with the
   * page having saved nothing -- which looks precisely like the
   * feature not working.
   */
  function flushDraft() {
    if (draftTimer) {
      clearTimeout(draftTimer);
      writeDraft();
    }
  }

  /** @return true if a draft was restored */
  function restoreDraft() {
    var saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
    } catch (e) {
      saved = null;   // corrupt or unreadable; start clean
    }
    if (!saved || typeof saved.text !== 'string' || !saved.text.trim()) {
      return false;
    }
    restoredDraft = saved;
    // what it was loaded from, if the draft remembered -- otherwise
    // the draft itself is the best starting point there is
    loadedText = typeof saved.loaded === 'string' ? saved.loaded : saved.text;
    setModelText(saved.text);
    if (typeof saved.namespace === 'string') {
      el('namespaceInput').value = saved.namespace;
    }
    if (typeof saved.testBench === 'boolean') {
      el('testBenchInput').checked = saved.testBench;
    }
    return true;
  }

  // the textarea remains the fallback when CodeMirror is unavailable,
  // so every read/write of the model goes through these two
  function getModelText() {
    return modelEditor ? modelEditor.getValue() : el('modelInput').value;
  }

  /**
   * Put a model in the editor and remember it as the starting point.
   *
   * Distinct from setModelText, which is also how the DIAGRAM writes
   * its edits back: those are the changes, not the thing they are
   * changes to.
   */
  function loadModelText(text) {
    loadedText = text;
    setModelText(text);
  }

  function setModelText(text) {
    if (modelEditor) {
      modelEditor.setValue(text);
    } else {
      el('modelInput').value = text;
    }
    rememberDraft();
  }

  /** CodeMirror mode for a generated file, by extension. */
  function modeFor(name) {
    var ext = extensionOf(name);
    if (ext === 'hpp' || ext === 'cpp' || ext === 'h' || ext === 'cc') {
      return 'text/x-c++src';
    }
    if (ext === 'json') return 'application/json';
    if (ext === 'scxml' || ext === 'xml') return 'application/xml';
    if (name === 'Makefile' || name.indexOf('Makefile.') === 0) return 'text/x-sh';
    return null; // .mmd / .puml and anything else: plain text
  }

  function setStatus(text, kind) {
    var s = el('status');
    s.textContent = text || '';
    s.className = 'status' + (kind ? ' status-' + kind : '');
  }

  function showDiagnostics(items, kind) {
    var box = el('diagnostics');
    if (!items || !items.length) {
      box.hidden = true;
      box.textContent = '';
      return;
    }
    box.hidden = false;
    box.className = 'diagnostics diagnostics-' + kind;
    box.textContent = '';
    items.forEach(function (item) {
      var line = document.createElement('div');
      line.className = 'diag-line';
      line.textContent = item;
      box.appendChild(line);
    });
  }

  function extensionOf(name) {
    var i = name.lastIndexOf('.');
    return i > -1 ? name.slice(i + 1) : '';
  }

  // group related outputs so the list is readable at a glance
  function groupOf(name) {
    var ext = extensionOf(name);
    if (ext === 'mmd' || ext === 'puml' || ext === 'scxml') return 'Diagrams / interop';
    if (name === 'Makefile' || name.indexOf('Makefile.') === 0 ||
        name.indexOf('_test.cpp') > -1) return 'Test bench';
    return 'Generated C++';
  }

  function renderFileList() {
    var list = el('fileList');
    list.textContent = '';
    var names = Object.keys(artifacts).sort();
    var groups = Object.create(null);
    names.forEach(function (n) {
      var g = groupOf(n);
      (groups[g] = groups[g] || []).push(n);
    });
    ['Generated C++', 'Test bench', 'Diagrams / interop'].forEach(function (g) {
      if (!groups[g]) return;
      var head = document.createElement('li');
      head.className = 'filelist-group';
      head.textContent = g;
      list.appendChild(head);
      groups[g].forEach(function (n) {
        var item = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filelist-item';
        btn.textContent = n;
        btn.addEventListener('click', function () { showFile(n); });
        item.appendChild(btn);
        list.appendChild(item);
      });
    });
  }

  function showFile(name) {
    currentName = name;
    el('viewerName').textContent = name;
    if (viewerEditor) {
      viewerEditor.setOption('mode', modeFor(name));
      viewerEditor.setValue(artifacts[name]);
      viewerEditor.refresh();
    } else {
      el('viewer').textContent = artifacts[name];
    }
    el('copyBtn').disabled = false;
    el('downloadBtn').disabled = false;
    Array.prototype.forEach.call(
      document.querySelectorAll('.filelist-item'), function (b) {
        b.classList.toggle('active', b.textContent === name);
      });
  }

  /**
   * Copy to the clipboard.
   *
   * navigator.clipboard only exists in secure contexts -- https, or
   * localhost. Serving the playground over plain http on a LAN (a
   * perfectly normal way to host it) leaves it undefined, so calling
   * it unconditionally would throw inside the click handler. Fall
   * back to a selection + execCommand, and if even that is
   * unavailable, select the text so the user can copy it themselves.
   */
  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        setStatus('copied ' + label, 'ok');
      }, function () {
        legacyCopy(text, label);
      });
      return;
    }
    legacyCopy(text, label);
  }

  function legacyCopy(text, label) {
    var ta = document.createElement('textarea');
    ta.value = text;
    // keep it out of view and out of the tab order
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    var ok = false;
    try {
      ta.select();
      ok = document.execCommand && document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    if (ok) {
      setStatus('copied ' + label, 'ok');
    } else {
      // last resort: put the text under the user's cursor
      selectViewerText();
      setStatus('copy unavailable here — text selected, press ' +
                (navigator.platform.indexOf('Mac') > -1 ? '\u2318C' : 'Ctrl+C'),
                'warn');
    }
  }

  function selectViewerText() {
    if (viewerEditor) {
      viewerEditor.focus();
      viewerEditor.execCommand('selectAll');
      return;
    }
    var node = el('viewer');
    if (!node || !window.getSelection || !document.createRange) return;
    var range = document.createRange();
    range.selectNodeContents(node);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function downloadOne(name, content) {
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // revoke on the next tick so the click has certainly started
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  function generate() {
    if (!mods) {
      setStatus('still loading the generator…', 'warn');
      return;
    }
    artifacts = Object.create(null);
    currentName = null;
    el('fileList').textContent = '';
    if (viewerEditor) { viewerEditor.setValue(''); } else { el('viewer').textContent = ''; }
    el('viewerName').textContent = 'No file selected';
    el('copyBtn').disabled = true;
    el('downloadBtn').disabled = true;
    el('downloadAllBtn').disabled = true;

    var raw = getModelText();
    if (!raw.trim()) {
      showDiagnostics(['Nothing to generate: paste or load a model first.'], 'error');
      setStatus('no model', 'error');
      return;
    }

    var model;
    try {
      model = JSON.parse(raw);
    } catch (e) {
      showDiagnostics(['Invalid JSON: ' + e.message], 'error');
      setStatus('parse error', 'error');
      return;
    }

    // Same precedence as the CLI (bin/hfsm-gen.js): an explicit
    // value wins, then the model's own `namespace`, then the default.
    // Leaving the box empty therefore means "use the model's".
    var namespace = (el('namespaceInput').value || '').trim() ||
        (typeof model.namespace === 'string' && model.namespace.trim()) ||
        'state_machine';
    if (!/^[A-Za-z_]\w*(::[A-Za-z_]\w*)*$/.test(namespace)) {
      showDiagnostics(['Invalid C++ namespace "' + namespace +
                       '" (expected identifier or identifier::identifier...).'], 'error');
      setStatus('bad namespace', 'error');
      return;
    }
    var badSegments = namespace.split('::').filter(function (seg) {
      return mods.checkModel.cppKeywords.indexOf(seg) > -1;
    });
    if (badSegments.length) {
      showDiagnostics(['Invalid C++ namespace: segment(s) ' +
                       badSegments.join(', ') + ' are C++ keywords.'], 'error');
      setStatus('bad namespace', 'error');
      return;
    }

    try {
      mods.resolveModel.resolve(model);
      mods.processor.processModel(model); // throws strings on violations
    } catch (err) {
      showDiagnostics([typeof err === 'string' ? err : (err && err.message) || String(err)],
                      'error');
      setStatus('model rejected', 'error');
      return;
    }

    // reflect the namespace actually used, so an empty box is never
    // ambiguous about what it resolved to
    el('namespaceInput').placeholder = namespace;

    try {
      var out = mods.MetaTemplates.renderHFSM(model, namespace);
      Object.keys(out).forEach(function (k) { artifacts[k] = out[k]; });
      if (el('testBenchInput').checked) {
        var tb = mods.MetaTemplates.renderTestCode(model, namespace);
        Object.keys(tb).forEach(function (k) { artifacts[k] = tb[k]; });
      }
      Object.keys(model.objects).sort().forEach(function (p) {
        var obj = model.objects[p];
        if (obj.type === 'State Machine' || obj.type === 'Library') {
          artifacts[obj.sanitizedName + '.mmd'] = mods.exporters.toMermaid(model, p);
          artifacts[obj.sanitizedName + '.puml'] = mods.exporters.toPlantUML(model, p);
          artifacts[obj.sanitizedName + '.scxml'] = mods.exporters.toSCXML(model, p);
        }
      });
    } catch (err) {
      showDiagnostics(['Generation failed: ' +
                       (typeof err === 'string' ? err : (err && err.message) || String(err))],
                      'error');
      setStatus('generation failed', 'error');
      return;
    }

    // non-fatal model warnings surface the same way the CLI prints them
    showDiagnostics(model.warnings || [], 'warn');

    // The code editor shows a snippet inside the function it is
    // compiled into, and these are where it reads that from. Handed
    // over on every successful generation, and only then: half a
    // generation would frame the code with the wrong surroundings.
    if (vizModule && vizModule.setGeneratedFiles) {
      vizModule.setGeneratedFiles(artifacts);
    } else {
      pendingGenerated = artifacts;
    }

    var count = Object.keys(artifacts).length;
    renderFileList();
    el('downloadAllBtn').disabled = count === 0;
    setStatus(count + ' file' + (count === 1 ? '' : 's') +
              ((model.warnings && model.warnings.length) ?
               ' · ' + model.warnings.length + ' warning' +
               (model.warnings.length === 1 ? '' : 's') : ''),
              (model.warnings && model.warnings.length) ? 'warn' : 'ok');
    var first = Object.keys(artifacts).sort().filter(function (n) {
      return extensionOf(n) === 'hpp';
    })[0] || Object.keys(artifacts).sort()[0];
    if (first) showFile(first);

    // Loading an example or a file generates, so this is also how a
    // newly loaded model reaches an already-open Diagram tab. It is
    // deliberately NOT hooked to typing: redrawing takes the layout
    // with it, and doing that on every keystroke would throw away
    // work nobody asked to discard.
    refreshDiagram({ keepStatus: true });
  }

  /* ------------------ comparing two machines ---------------------- */

  /**
   * Comparing is a MODE, not a view of the model text.
   *
   * What is drawn while it is on is a union of two machines, and it
   * belongs to neither of them: an edit made to it could not be saved
   * back to either side without picking one, and picking silently is
   * worse than not offering. So the diagram goes read-only, Save
   * layout goes away, and leaving the mode redraws from the text.
   */
  function startComparison(label, otherText) {
    var current = getModelText().trim();
    if (!current) {
      showDiagnostics(['Nothing to compare: load a model first.'], 'error');
      return;
    }
    var mine, theirs;
    try {
      mine = JSON.parse(current);
    } catch (e) {
      showDiagnostics(['The model in the editor is not valid JSON: ' + e.message],
                      'error');
      return;
    }
    try {
      theirs = JSON.parse(otherText);
    } catch (e) {
      showDiagnostics(['That file is not valid JSON: ' + e.message], 'error');
      return;
    }

    showTab('diagram');
    // claimed before the load, so a draw already in flight stands
    // down rather than mounting over the comparison
    var token = ++drawToken;
    requirejs(['viz'], function (viz) {
      vizModule = viz;
      if (token !== drawToken) return;
      var result;
      try {
        // OTHER first, MINE second: the comparison reads "what has
        // happened to the other model to make it into this one", so
        // the machine on screen is the one in the editor
        result = viz.compare(el('viewDiagram'), theirs, mine);
      } catch (err) {
        showDiagnostics(['Could not compare: ' +
                         (typeof err === 'string' ? err : (err && err.message) || String(err))],
                        'error');
        setStatus('comparison failed', 'error');
        return;
      }
      comparison = { label: label, result: result };
      vizModelText = null;      // what is drawn is not the model text
      el('saveLayoutBtn').hidden = true;
      renderComparison();
    });
  }

  function endComparison() {
    if (!comparison) return;
    comparison = null;
    var panel = el('diffPanel');
    if (panel) panel.remove();
    el('saveLayoutBtn').hidden = !vizShown;
    // back to an ordinary diagram of the model text
    if (vizModule) vizModule.destroy();
    vizModelText = null;
    refreshDiagram();
    setStatus('ready');
  }

  /**
   * What to call an object in a list of changes.
   *
   * diffModel owns the rule, so the panel and the CLI cannot end up
   * naming the same transition two different things.
   */
  function labelFor(entry) {
    return mods && mods.describe ? mods.describe.labelFor(entry)
      : (entry.name || entry.path);
  }

  function describeChange(change) {
    function short(v) {
      if (v === undefined || v === '') return '(empty)';
      v = String(v).replace(/\s+/g, ' ');
      return v.length > 42 ? v.slice(0, 41) + '\u2026' : v;
    }
    return change.attribute + ': ' + short(change.before) +
      ' \u2192 ' + short(change.after);
  }

  /**
   * The list beside the diagram.
   *
   * The colours say WHERE something changed; this says WHAT. Neither
   * is much use alone: a state outlined in amber does not tell you
   * its guard now reads false, and a list of paths does not tell
   * you where in the machine they are. Clicking an entry moves the
   * diagram to it, which is the join between the two.
   */
  function renderComparison() {
    if (!comparison) return;
    var result = comparison.result;
    var summary = result.summary;

    var panel = el('diffPanel');
    if (panel) panel.remove();
    panel = document.createElement('aside');
    panel.id = 'diffPanel';
    panel.className = 'diff-panel';
    panel.setAttribute('aria-label', 'What changed');

    var head = document.createElement('div');
    head.className = 'diff-head';
    var title = document.createElement('div');
    title.className = 'diff-title';
    title.textContent = 'Compared with ' + comparison.label;
    // the label is often longer than the panel; the ellipsis should
    // not be the only place the name exists
    title.title = 'Compared with ' + comparison.label;
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'diff-close';
    close.textContent = 'Stop comparing';
    close.addEventListener('click', endComparison);
    head.appendChild(title);
    head.appendChild(close);

    var counts = document.createElement('div');
    counts.className = 'diff-counts';
    [['added', summary.added], ['removed', summary.removed],
     ['changed', summary.changed]].forEach(function (pair) {
       if (!pair[1]) return;
       var tag = document.createElement('span');
       tag.className = 'diff-count is-' + pair[0];
       tag.textContent = pair[1] + ' ' + pair[0];
       counts.appendChild(tag);
     });
    if (summary.moved) {
      var moved = document.createElement('span');
      moved.className = 'diff-count is-moved';
      // said, but not coloured: moving a state changes nothing about
      // what the machine does
      moved.textContent = summary.moved + ' moved';
      counts.appendChild(moved);
    }
    if (!counts.childNodes.length) {
      counts.textContent = 'These two machines are identical.';
    }

    var list = document.createElement('ul');
    list.className = 'diff-list';
    result.entries.forEach(function (entry) {
      if (entry.status === 'same' && !entry.moved) return;
      if (entry.status === 'same') return;   // moved only: not a change
      var item = document.createElement('li');
      item.className = 'diff-item is-' + entry.status;

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'diff-item-head';
      button.addEventListener('click', function () {
        // unionPath, not path: a removed object was re-homed under
        // whatever its parent became
        if (!vizModule.reveal(entry.unionPath || entry.path)) {
          // an Event or a Field: real, listed, and not drawn
          setStatus(labelFor(entry) + ' is not shown on the diagram', 'warn');
        }
      });
      var badge = document.createElement('span');
      badge.className = 'diff-badge';
      badge.textContent = entry.status === 'added' ? '+'
        : (entry.status === 'removed' ? '\u2212' : '~');
      var text = document.createElement('span');
      text.className = 'diff-what';
      text.textContent = labelFor(entry);
      var kind = document.createElement('span');
      kind.className = 'diff-kind';
      kind.textContent = entry.type;
      button.appendChild(badge);
      button.appendChild(text);
      button.appendChild(kind);
      item.appendChild(button);

      if (entry.changes && entry.changes.length) {
        var details = document.createElement('ul');
        details.className = 'diff-details';
        entry.changes.forEach(function (change) {
          var line = document.createElement('li');
          line.textContent = describeChange(change);
          details.appendChild(line);
        });
        item.appendChild(details);
      }
      list.appendChild(item);
    });

    panel.appendChild(head);
    panel.appendChild(counts);
    panel.appendChild(list);

    if (result.dropped && result.dropped.length) {
      var note = document.createElement('div');
      note.className = 'diff-note';
      // said out loud rather than silently omitted: the diagram is
      // not the whole comparison in this case
      note.textContent = result.dropped.length + ' removed transition' +
        (result.dropped.length === 1 ? '' : 's') +
        ' could not be drawn (an endpoint is in neither model).';
      panel.appendChild(note);
    }

    el('viewDiagram').appendChild(panel);
    // after it is in the document, so its width is a real number
    window.requestAnimationFrame(function () {
      if (comparison && vizModule && vizModule.fitClearOf) {
        vizModule.fitClearOf({ right: panel.offsetWidth + 16 });
      }
    });
    setStatus(mods && mods.diffModel
              ? mods.diffModel.describeSummary(summary)
              : 'comparing', summary.added || summary.removed || summary.changed
              ? 'warn' : 'ok');
  }

  /** the picker behind the Compare button */
  /**
   * Take the menu down.
   *
   * The ONE way out, on purpose. There are four -- picking an option,
   * pressing the button again, clicking away, Escape -- and when each
   * removed the element itself, the document-level mousedown handler
   * outlived three of them. Open and close the menu a few times and
   * the page is listening several times over, on handlers holding a
   * menu that is no longer in the document.
   */
  var closeCompareMenu = null;

  function offerComparison() {
    if (closeCompareMenu) { closeCompareMenu(); return; }  // a second click closes it

    var items = {};
    if (loadedText && loadedText.trim() !== getModelText().trim()) {
      items.loaded = 'the version you loaded';
    }
    EXAMPLES.forEach(function (ex) {
      if (!ex.file) return;
      items['ex:' + ex.file] = ex.label;
    });
    items.file = 'a file\u2026';

    var menu = document.createElement('div');
    menu.id = 'compareMenu';
    menu.className = 'compare-menu';
    menu.setAttribute('role', 'menu');
    Object.keys(items).forEach(function (key) {
      var option = document.createElement('button');
      option.type = 'button';
      option.setAttribute('role', 'menuitem');
      option.textContent = items[key];
      option.addEventListener('click', function () {
        close();
        chooseComparison(key, items[key]);
      });
      menu.appendChild(option);
    });
    document.body.appendChild(menu);
    var box = el('compareBtn').getBoundingClientRect();
    menu.style.top = (box.bottom + window.pageYOffset + 2) + 'px';
    menu.style.left = Math.max(4, box.right + window.pageXOffset -
                               menu.offsetWidth) + 'px';
    menu.querySelector('button').focus();

    function close() {
      if (!closeCompareMenu) return;
      closeCompareMenu = null;
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', onKey);
      menu.remove();
      // back where it came from, rather than nowhere
      var button = el('compareBtn');
      if (button && document.contains(button)) button.focus();
    }
    function away(event) {
      // the button closes it through offerComparison, so leave that
      // click alone or it would open and close in one gesture
      if (menu.contains(event.target) || event.target === el('compareBtn')) return;
      close();
    }
    function onKey(event) {
      if (event.key === 'Escape') close();
    }

    closeCompareMenu = close;
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', onKey);
  }

  function chooseComparison(key, label) {
    if (key === 'loaded') {
      startComparison(label, loadedText);
      return;
    }
    if (key === 'file') {
      el('compareFile').click();
      return;
    }
    var file = key.slice(3);
    setStatus('loading ' + label + '\u2026');
    fetch(file).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
      return r.text();
    }).then(function (text) {
      startComparison(label, text);
    }).catch(function (err) {
      showDiagnostics(['Could not load ' + label + ': ' + err.message], 'error');
      setStatus('load failed', 'error');
    });
  }

  function loadExampleList() {
    var sel = el('exampleSelect');
    EXAMPLES.forEach(function (ex) {
      var opt = document.createElement('option');
      opt.value = ex.file;
      opt.textContent = ex.label;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () {
      var file = sel.value;
      if (!file) return;
      setStatus('loading example…');
      fetch(file).then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
        return r.text();
      }).then(function (text) {
        loadModelText(text);
        setStatus('example loaded');
        generate();
      }).catch(function (e) {
        showDiagnostics(['Could not load ' + file + ': ' + e.message], 'error');
        setStatus('load failed', 'error');
      });
    });
  }

  function readFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      loadModelText(String(reader.result));
      setStatus('loaded ' + file.name);
      generate();
    };
    reader.onerror = function () {
      showDiagnostics(['Could not read ' + file.name], 'error');
    };
    reader.readAsText(file);
  }

  function wireDragAndDrop() {
    var overlay = el('dropOverlay');
    var depth = 0;
    window.addEventListener('dragenter', function (e) {
      e.preventDefault();
      depth++;
      overlay.hidden = false;
    });
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('dragleave', function (e) {
      e.preventDefault();
      depth = Math.max(0, depth - 1);
      if (depth === 0) overlay.hidden = true;
    });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      depth = 0;
      overlay.hidden = true;
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) readFile(f);
    });
  }

  /* ---------------------- the Diagram tab ---------------------- */

  // loaded on first use: the visualizer pulls in cytoscape and its
  // plugins, which is a lot to fetch for someone who only wants the
  // generated code
  var vizModule = null;
  var vizShown = false;
  // generated files produced before the visualizer existed
  var pendingGenerated = null;
  // the comparison currently on screen, or null
  var comparison = null;
  // Which draw is the current one.
  //
  // Both drawing the model and starting a comparison load the
  // visualizer asynchronously and then mount into the same container.
  // Pressing Compare while the diagram was still drawing ran both,
  // and the second mount tore down what the first was still building
  // -- which wedged the page. Whoever asked last wins; anyone whose
  // token is stale drops out at the callback.
  var drawToken = 0;
  // The model text as it was LOADED, before any editing -- the other
  // side of the most useful comparison there is: what have I changed?
  // Kept in the draft too, so a refresh does not lose the answer.
  var loadedText = null;
  var vizModelText = null;   // what the diagram was last built from

  function showTab(which) {
    var diagram = which === 'diagram';
    el('tabCode').classList.toggle('is-active', !diagram);
    el('tabDiagram').classList.toggle('is-active', diagram);
    el('tabCode').setAttribute('aria-selected', String(!diagram));
    el('tabDiagram').setAttribute('aria-selected', String(diagram));
    el('viewCode').hidden = diagram;
    el('viewDiagram').hidden = !diagram;
    el('saveLayoutBtn').hidden = !diagram || !!comparison;
    el('compareBtn').hidden = !diagram;
    vizShown = diagram;
    // which tab you were on is part of the draft, and switching tabs
    // is the one way of changing it that no other handler notices --
    // without this, a refresh came back to the tab you were on when
    // you last TYPED, not the one you were looking at
    rememberDraft();
    if (diagram) refreshDiagram();
  }

  // The diagram is an editor too: dropping a part in, drawing a
  // transition, renaming a state -- all of it changes the model the
  // graph is running on. The text beside it has to say the same
  // thing, so it is rewritten after every committed change rather
  // than waiting to be asked. Generation is NOT re-run: it is the
  // slow half, and the user says when.
  function diagramEdited() {
    if (!vizModule || !vizModule.current()) return;

    // The editor and the diagram are both live, so the text can have
    // moved on since the diagram was drawn from it. Writing the
    // diagram's model over it would silently throw the typing away --
    // the same conflict `saveLayout` refuses, and it has to be
    // refused here too, where it arrives without anyone asking for
    // it. Typing wins: it is the harder of the two to do again.
    if (getModelText().trim() !== vizModelText) {
      showDiagnostics(['The diagram changed, but the model text has been ' +
                       'edited since the diagram was drawn, so the text was ' +
                       'left alone. Press Generate to redraw the diagram from ' +
                       'the text -- which discards the change just made to ' +
                       'the diagram.'], 'warn');
      setStatus('diagram and text disagree', 'warn');
      return;
    }

    var text = vizModule.currentModelJSON();
    if (!text) return;
    setModelText(text);
    vizModelText = text.trim();   // the diagram already matches it
    showDiagnostics([]);
    setStatus('model edited \u00b7 press Generate', 'warn');
  }

  // Take the diagram down. A machine left on screen next to an error
  // message reads as though the error were about what is drawn, and
  // it leaves `Save layout` pointing at a model the text no longer
  // contains.
  function clearDiagram() {
    if (vizModule) vizModule.destroy();
    vizModelText = null;
  }

  /**
   * @param opts.keepStatus  leave the status line and the diagnostics
   *   alone when the drawing succeeds -- generate() has just written
   *   a more useful summary there ("12 files . 2 warnings"), and the
   *   redraw is a side effect of what it did, not the thing asked for
   */
  function refreshDiagram(opts) {
    if (!vizShown) return;
    // a comparison owns the diagram until it is dismissed; redrawing
    // the model text over it would leave the panel describing a
    // picture that is no longer there
    if (comparison) return;
    var quiet = !!(opts && opts.keepStatus);
    var raw = getModelText().trim();
    if (!raw) {
      clearDiagram();
      showDiagnostics(['Nothing to draw: paste or load a model first.'], 'error');
      setStatus('nothing to draw', 'error');
      return;
    }
    if (raw === vizModelText && vizModule && vizModule.current()) {
      return;   // already showing this model
    }

    var model;
    try {
      model = JSON.parse(raw);
    } catch (e) {
      clearDiagram();
      showDiagnostics(['The model is not valid JSON: ' + e.message], 'error');
      setStatus('parse error', 'error');
      return;
    }

    if (!quiet) setStatus('drawing...');
    var token = ++drawToken;
    requirejs(['viz'], function (viz) {
      vizModule = viz;
      if (token !== drawToken) return;   // something else is drawing now
      // generate() can run before the visualizer has ever loaded --
      // it does, on a restored draft -- so the files it produced are
      // held until there is something to give them to
      if (pendingGenerated) {
        viz.setGeneratedFiles(pendingGenerated);
        pendingGenerated = null;
      }
      viz.onModelEdited(diagramEdited);
      viz.onSplitChanged(function () {
        rememberLayout({ diagramSplits: viz.splitSizes() });
      });
      try {
        viz.mount(el('viewDiagram'), model);
        // the widget builds its panes on mount, so its splits can
        // only be put back once they exist
        if (layout.diagramSplits) viz.setSplitSizes(layout.diagramSplits);
        vizModelText = raw;
        if (!quiet) {
          showDiagnostics([]);
          setStatus('ready');
        }
      } catch (e) {
        // the diagram resolves the model exactly as the generator
        // does, so an ill-typed model fails here the same way
        viz.destroy();
        vizModelText = null;
        showDiagnostics([String(e.message || e)], 'error');
        setStatus('model rejected');
      }
    }, function (err) {
      showDiagnostics(['Could not load the visualizer: ' + err.message], 'error');
      setStatus('error');
    });
  }

  /* ------------------- resizing the two panes ------------------- */

  // Reading a model and reading its diagram want opposite amounts of
  // room, so where the split sits is the user's call. The size lives
  // in a CSS variable; dragging and collapsing both just set it.
  //
  // The split turns on its side on a narrow screen -- the panes stack,
  // and the same bar then moves the boundary up and down. Everything
  // here therefore works in "size along the splitter's axis" rather
  // than in width, or the control would be inert in exactly the
  // layout where space is tightest.
  function wireSplitter() {
    var layoutEl = document.querySelector('.layout');
    var splitter = el('paneSplitter');
    var collapseBtn = el('collapseModelBtn');
    var stacked = window.matchMedia('(max-width: 860px)');
    var lastSize = null;        // what to restore when un-collapsing

    // narrower/shorter than this and nothing in the pane is readable
    function minSize() { return stacked.matches ? 120 : 180; }
    function totalSize() {
      return stacked.matches ? layoutEl.clientHeight : layoutEl.clientWidth;
    }
    function paneSize() {
      var box = document.querySelector('.pane-input').getBoundingClientRect();
      return stacked.matches ? box.height : box.width;
    }

    function setSize(px) {
      layoutEl.style.setProperty(
        stacked.matches ? '--model-height' : '--model-width', px + 'px');
    }

    // the two layouts have their own sizes: the width of a column and
    // the height of a stacked pane are not the same measurement
    function rememberSize() {
      if (lastSize === null) return;
      rememberLayout(stacked.matches ? { modelHeight: lastSize }
                                     : { modelWidth: lastSize });
    }

    function collapsed() {
      return layoutEl.classList.contains('is-collapsed');
    }

    function setCollapsed(yes) {
      rememberLayout({ collapsed: !!yes });
      layoutEl.classList.toggle('is-collapsed', yes);
      collapseBtn.setAttribute('aria-expanded', String(!yes));
      collapseBtn.innerHTML = (yes ? '&#9654;' : '&#9664;') + ' Model';
      collapseBtn.title = yes
        ? 'Show the model text'
        : 'Hide the model text (the diagram keeps the whole width)';
      if (!yes && lastSize) setSize(lastSize);
      // the graph sizes itself from its container, so it has to be
      // told the container changed
      resizeDiagram();
    }

    // A separator BETWEEN left and right panes is itself vertical; one
    // between stacked panes is horizontal. Screen readers announce the
    // arrow keys from this, so it has to follow the layout.
    function syncOrientation() {
      splitter.setAttribute('aria-orientation',
                            stacked.matches ? 'horizontal' : 'vertical');
      // measured along the other axis, so it means nothing now
      lastSize = null;
    }
    syncOrientation();
    if (stacked.addEventListener) {
      stacked.addEventListener('change', syncOrientation);
    } else if (stacked.addListener) {
      stacked.addListener(syncOrientation);   // Safari < 14
    }

    function onDrag(event) {
      var box = layoutEl.getBoundingClientRect();
      var along = stacked.matches
        ? event.clientY - box.top
        : event.clientX - box.left;
      lastSize = Math.max(minSize(), Math.min(along, totalSize() - minSize()));
      setSize(lastSize);
    }

    function stopDrag() {
      splitter.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      // once, at the end -- not on every mousemove
      rememberSize();
      // resize once at the end: cytoscape re-measuring on every
      // mousemove makes the drag stutter
      resizeDiagram();
    }

    splitter.addEventListener('mousedown', function (event) {
      if (collapsed()) return;
      event.preventDefault();
      splitter.classList.add('is-dragging');
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
    });

    splitter.addEventListener('dblclick', function () { setCollapsed(!collapsed()); });
    collapseBtn.addEventListener('click', function () { setCollapsed(!collapsed()); });

    // keyboard: a splitter nobody can reach without a mouse is not a
    // control, it is a decoration. Both arrow pairs are accepted in
    // both layouts -- the one that matches the orientation is the
    // obvious choice, and the other is no worse than doing nothing.
    var SMALLER = { ArrowLeft: true, ArrowUp: true };
    var BIGGER = { ArrowRight: true, ArrowDown: true };
    splitter.addEventListener('keydown', function (event) {
      var step = event.shiftKey ? 64 : 16;
      var current = lastSize || paneSize();
      if (SMALLER[event.key]) {
        lastSize = Math.max(minSize(), current - step);
      } else if (BIGGER[event.key]) {
        lastSize = Math.min(totalSize() - minSize(), current + step);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setCollapsed(!collapsed());
        return;
      } else return;
      event.preventDefault();
      setSize(lastSize);
      rememberSize();
      resizeDiagram();
    });

    // put back what this browser was last left with
    var savedSize = stacked.matches ? layout.modelHeight : layout.modelWidth;
    if (typeof savedSize === 'number' && savedSize > 0) {
      lastSize = savedSize;
      setSize(savedSize);
    }
    if (layout.collapsed) setCollapsed(true);
  }

  // the diagram draws on a canvas sized to its container, so a layout
  // change has to be handed to it explicitly
  function resizeDiagram() {
    if (vizModule && vizModule.resize) vizModule.resize();
  }

  // Dragging a state writes its new position straight into the
  // model the diagram is running on. This is how that gets back into
  // the text -- explicitly, because rewriting the editor under the
  // user on every drag would fight whatever they are typing.
  function saveLayout() {
    if (!vizModule || !vizModule.current()) {
      showDiagnostics(['Nothing to save: the diagram is not showing a model.'],
                      'error');
      return;
    }
    // The model text sits beside the diagram, so it can have moved on
    // since the diagram was drawn -- and what gets written back is the
    // machine the diagram is running, not the one in the editor.
    // Saving anyway would silently throw away whatever was typed.
    if (getModelText().trim() !== vizModelText) {
      showDiagnostics(['The model text has changed since the diagram was ' +
                       'drawn, and saving would overwrite it. Press Generate ' +
                       'to redraw from the current text first.'], 'error');
      setStatus('layout not saved', 'error');
      return;
    }
    var text = vizModule.currentModelJSON();
    if (!text) return;
    setModelText(text);
    vizModelText = text.trim();   // the diagram already matches it
    showDiagnostics([]);
    setStatus('layout saved to the model');
  }

  function wire() {
    el('saveLayoutBtn').addEventListener('click', saveLayout);
    wireSplitter();
    el('compareBtn').addEventListener('click', offerComparison);
    el('compareFile').addEventListener('change', function (event) {
      var file = event.target.files && event.target.files[0];
      // cleared either way, so choosing the same file twice still fires
      event.target.value = '';
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        startComparison(file.name, String(reader.result));
      };
      reader.onerror = function () {
        showDiagnostics(['Could not read ' + file.name], 'error');
      };
      reader.readAsText(file);
    });

    window.addEventListener('resize', resizeDiagram);
    el('tabCode').addEventListener('click', function () { showTab('code'); });
    el('tabDiagram').addEventListener('click', function () { showTab('diagram'); });
    el('generateBtn').addEventListener('click', generate);
    el('fileInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) readFile(f);
      e.target.value = ''; // allow re-picking the same file
    });
    el('copyBtn').addEventListener('click', function () {
      if (!currentName) return;
      copyText(artifacts[currentName], currentName);
    });
    el('downloadBtn').addEventListener('click', function () {
      if (currentName) downloadOne(currentName, artifacts[currentName]);
    });
    el('downloadAllBtn').addEventListener('click', function () {
      // one download per file: no archiving library needed, so the
      // page stays dependency-free and works offline
      Object.keys(artifacts).sort().forEach(function (n, i) {
        setTimeout(function () { downloadOne(n, artifacts[n]); }, i * 120);
      });
    });
    loadExampleList();
    wireDragAndDrop();

    // Last chance to save. `pagehide` fires for a reload, a
    // navigation and a tab close alike, and unlike `beforeunload` it
    // does not risk a "leave site?" prompt.
    window.addEventListener('pagehide', flushDraft);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushDraft();
    });

    // typing into the plain textarea, when CodeMirror never loaded
    el('modelInput').addEventListener('input', rememberDraft);
    // the namespace and the test-bench toggle are part of the draft
    el('namespaceInput').addEventListener('input', rememberDraft);
    el('testBenchInput').addEventListener('change', rememberDraft);
  }

  /**
   * Upgrade the plain textarea / pre into highlighted CodeMirror
   * views. Entirely optional: if the library fails to load the app
   * keeps working with the plain controls, so highlighting can never
   * be the reason generation breaks.
   */
  function initEditors(cm) {
    CodeMirror = cm;
    modelEditor = CodeMirror.fromTextArea(el('modelInput'), {
      mode: 'application/json',
      lineNumbers: true,
      lineWrapping: false,
      matchBrackets: true,
      tabSize: 2,
      viewportMargin: 30,
    });
    modelEditor.setSize('100%', '100%');
    modelEditor.on('change', rememberDraft);

    viewerEditor = CodeMirror(el('viewer'), {
      value: '',
      mode: null,
      lineNumbers: true,
      lineWrapping: false,
      readOnly: true,     // still selectable / copyable
      viewportMargin: 30,
    });
    viewerEditor.setSize('100%', '100%');

    // re-render what is already on screen
    if (currentName) showFile(currentName);
  }

  setStatus('loading generator…');
  readLayout();     // before anything that lays itself out
  wire();

  // Bring back whatever this tab was working on. Before the generator
  // has loaded, so the text is on screen immediately -- and quietly,
  // because from the user's side nothing happened: they refreshed and
  // their model is still there.
  restoreDraft();

  requirejs([CM_ID].concat(CM_MODES), function (cm) {
    try {
      initEditors(cm);
    } catch (e) {
      // never let the editor take the app down with it
      console.warn('CodeMirror init failed, using plain views:', e);
    }
  }, function (err) {
    console.warn('CodeMirror unavailable, using plain views:', err.message);
  });

  requirejs([
    'hfsm/resolveModel',
    'hfsm/processor',
    'hfsm/checkModel',
    'hfsm/exporters',
    'hfsm/diffModel',
    'hfsm/viz/describe',
    'templates/MetaTemplates',
  ], function (resolveModel, processor, checkModel, exporters, diffModel,
               describe, MetaTemplates) {
    mods = {
      resolveModel: resolveModel,
      processor: processor,
      checkModel: checkModel,
      exporters: exporters,
      diffModel: diffModel,
      describe: describe,
      MetaTemplates: MetaTemplates,
    };
    setStatus('ready');

    // Put the tab back the way it was, not just the text in it.
    //
    // Restoring the model alone left the output empty and the diagram
    // blank until you pressed Generate -- the work was there but the
    // session was not, which reads as the model not being loaded at
    // all. Generating takes well under a second for these, and it is
    // what had already happened before the refresh.
    if (restoredDraft) {
      generate();
      if (restoredDraft.tab === 'diagram') showTab('diagram');
    }
  }, function (err) {
    showDiagnostics(['Failed to load the generator modules: ' + err.message,
                     'If you opened this file directly, serve it over http instead ' +
                     '(the template loader uses XHR).'], 'error');
    setStatus('load failed', 'error');
  });
}());
