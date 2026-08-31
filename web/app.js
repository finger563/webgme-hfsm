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
    },
  });

  var el = function (id) { return document.getElementById(id); };
  var mods = null;
  var artifacts = Object.create(null);
  var currentName = null;

  var EXAMPLES = [
    { label: 'Basic (two states, one event)', file: 'examples/basic.json' },
    { label: 'Features (hierarchy, history, choices)', file: 'examples/features.json' },
    { label: 'Payloads (typed event data)', file: 'examples/payloads.json' },
  ];

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
    el('viewer').textContent = artifacts[name];
    el('copyBtn').disabled = false;
    el('downloadBtn').disabled = false;
    Array.prototype.forEach.call(
      document.querySelectorAll('.filelist-item'), function (b) {
        b.classList.toggle('active', b.textContent === name);
      });
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
    el('viewer').textContent = '';
    el('viewerName').textContent = 'No file selected';
    el('copyBtn').disabled = true;
    el('downloadBtn').disabled = true;
    el('downloadAllBtn').disabled = true;

    var raw = el('modelInput').value;
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

    var namespace = (el('namespaceInput').value || 'state_machine').trim();
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
        el('modelInput').value = text;
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
      el('modelInput').value = String(reader.result);
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

  function wire() {
    el('generateBtn').addEventListener('click', generate);
    el('fileInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) readFile(f);
      e.target.value = ''; // allow re-picking the same file
    });
    el('copyBtn').addEventListener('click', function () {
      if (!currentName) return;
      navigator.clipboard.writeText(artifacts[currentName]).then(function () {
        setStatus('copied ' + currentName, 'ok');
      }, function () {
        setStatus('clipboard unavailable', 'warn');
      });
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
  }

  setStatus('loading generator…');
  wire();

  requirejs([
    'hfsm/resolveModel',
    'hfsm/processor',
    'hfsm/checkModel',
    'hfsm/exporters',
    'templates/MetaTemplates',
  ], function (resolveModel, processor, checkModel, exporters, MetaTemplates) {
    mods = {
      resolveModel: resolveModel,
      processor: processor,
      checkModel: checkModel,
      exporters: exporters,
      MetaTemplates: MetaTemplates,
    };
    setStatus('ready');
  }, function (err) {
    showDiagnostics(['Failed to load the generator modules: ' + err.message,
                     'If you opened this file directly, serve it over http instead ' +
                     '(the template loader uses XHR).'], 'error');
    setStatus('load failed', 'error');
  });
}());
