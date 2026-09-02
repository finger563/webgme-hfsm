/**
 * The selected node's attributes, editable in place.
 *
 * WHY THIS EXISTS
 * ---------------
 * You cannot get far editing a machine from the diagram alone. A
 * state dropped from the palette is called "State", a transition has
 * no event, and a second of either collides -- so without a way to
 * type a name, an Event, a Guard or an Entry block, the next thing
 * you build is an invalid model.
 *
 * WebGME answers this with its Property Editor, which is part of the
 * application rather than of the visualizer, so it did not come
 * across with the widget. It is also the least pleasant part of
 * modelling with the tool: a generic grid, sorted alphabetically,
 * with C++ in one-line cells and nothing wrong until generation
 * fails.
 *
 * So this is deliberately not a property grid:
 *
 *  - fields are ordered by what the machine DOES -- name, Event,
 *    Guard, Action, Entry/Exit/Tick -- with the rarely-touched
 *    declarations last (`describe.fieldOrder`);
 *  - code is rendered as code, in a textarea that grows
 *    (`describe.fieldKind`);
 *  - a name or an Event that is not a C++ identifier is refused as it
 *    is typed, with the reason, instead of reaching the generator --
 *    or, in the Event case, the simulator, which says so with a
 *    modal;
 *  - it sits beside the diagram and follows the selection.
 *
 * Every change is one transaction, so it is one undo in a host that
 * has undo.
 */
define(['hfsm/viz/describe',
        'hfsm/checkModel',
        './CodeEditor',
        'css!./Inspector.css'],
       function (describe, checkModel, CodeEditor) {
  'use strict';

  function Inspector() {
    this._el = null;
    this._backend = null;
    this._id = null;
    this._fields = {};   // attribute name -> the row it is rendered as
  }

  /**
   * @param container  where to draw
   * @param backend    a ModelBackend -- the only thing written through
   */
  Inspector.prototype.initialize = function (container, backend) {
    this._el = $(container);
    this._backend = backend;
    this._id = null;
    this._el.addClass('hfsm-inspector');
    this.clear();
  };

  Inspector.prototype.clear = function () {
    this._id = null;
    this._release();
    if (this._el) {
      this._el.empty().append(
        $('<div class="inspector-empty"></div>')
          .text('Select a state or transition to edit it.'));
    }
  };

  /** whoever the user is currently typing into, if it is one of ours */
  Inspector.prototype.hasFocus = function () {
    return !!(this._el && this._el.length &&
              this._el[0].contains(document.activeElement));
  };

  /** detach the editors before the elements holding them go */
  Inspector.prototype._release = function () {
    var self = this;
    Object.keys(self._fields).forEach(function (name) {
      var cm = self._fields[name].cm;
      if (cm) { try { cm.toTextArea(); } catch (e) { /* already gone */ } }
    });
    self._fields = {};
  };

  /**
   * Re-read the shown node after a model change.
   *
   * Values are written into the fields that are already there rather
   * than the form being rebuilt. Almost every change here is the
   * user's OWN edit committing, and rebuilding would destroy the
   * inputs mid-interaction: tab out of `name` and the field you just
   * tabbed INTO is replaced under the caret. The form is only rebuilt
   * when the node it describes is a different one.
   *
   * A field with the focus is left alone entirely -- it is being
   * typed into, and what is in the store is what the typing is on its
   * way to becoming.
   */
  Inspector.prototype.refresh = function () {
    var self = this;
    if (!self._id) return;
    var node = self._backend.getNode(self._id);
    if (!node) return self.clear();

    Object.keys(self._fields).forEach(function (name) {
      var field = self._fields[name];
      var v = valueOf(node, field.attr);
      if (field.cm) {
        if (field.cm.hasFocus()) return;
        if (field.cm.getValue() !== String(v)) field.cm.setValue(String(v));
        return;
      }
      if (field.input[0] === document.activeElement) return;
      if (field.kind === 'checkbox') field.input.prop('checked', !!v);
      else if (field.input.val() !== String(v)) field.input.val(v);
    });
  };

  Inspector.prototype.show = function (id) {
    var self = this;
    if (!self._el) return;
    if (!id) return self.clear();

    var backend = self._backend;
    var schema = backend.getNodeSchema(id);
    var node = backend.getNode(id);
    if (!schema || !node) return self.clear();

    // nothing to rebuild if it is the same node: refresh() keeps its
    // values current, and rebuilding would throw away the focus
    if (self._id === id && Object.keys(self._fields).length) {
      return self.refresh();
    }

    self._id = id;
    self._release();
    self._el.empty();

    var readOnly = backend.isReadOnly();
    self._el.append(
      $('<div class="inspector-head"></div>').append(
        $('<span class="inspector-type"></span>').text(schema.name),
        $('<span class="inspector-id"></span>').text(id)));

    var fields = $('<div class="inspector-fields"></div>');
    describe.fieldOrder(schema.attributes).forEach(function (attr) {
      fields.append(self._renderField(id, attr, node, readOnly));
    });
    self._el.append(fields);
    self._highlight();
  };

  /** the value a node currently has for `attr`, or its default */
  function valueOf(node, attr) {
    var value = node[attr.name];
    if (value === undefined || value === null) value = attr.defaultValue;
    if (value === undefined || value === null) value = '';
    return value;
  }

  Inspector.prototype._renderField = function (id, attr, node, readOnly) {
    var self = this;
    var kind = describe.fieldKind(attr);
    var value = valueOf(node, attr);

    var row = $('<div class="inspector-row"></div>').addClass('kind-' + kind);
    var label = $('<label class="inspector-label"></label>').text(attr.name);
    var input;

    if (kind === 'checkbox') {
      input = $('<input type="checkbox"/>').prop('checked', !!value);
    } else if (kind === 'number') {
      input = $('<input type="number" step="any"/>').val(value);
    } else if (kind === 'code') {
      // CodeMirror takes this over once it has loaded; until then, and
      // if it fails to, the textarea edits the attribute perfectly well
      input = $('<textarea class="inspector-code" spellcheck="false" ' +
                'rows="3"></textarea>').val(value);
    } else {
      input = $('<input type="text"/>').val(value);
    }
    input.addClass('inspector-input');
    if (readOnly) input.prop('disabled', true);

    var error = $('<div class="inspector-error"></div>').hide();
    var field = { input: input, kind: kind, attr: attr, row: row, cm: null };
    self._fields[attr.name] = field;

    function commit() {
      var next = readValue(field);
      var problem = self._reject(attr, next);
      if (problem) {
        error.text(problem).show().removeClass('is-note');
        row.addClass('is-invalid');
        return;
      }
      row.removeClass('is-invalid');
      var note = self._note(attr, next);
      if (note) error.text(note).addClass('is-note').show();
      else error.hide();
      self._write(id, attr, next);
    }

    field.commit = commit;

    // Commit when the field is done, not on every keystroke: a
    // transaction per character would flood a host's undo stack, and
    // in the playground rewrite the model text under the cursor.
    input.on('change', commit);
    if (kind === 'text' || kind === 'code') {
      input.on('blur', commit);
      input.on('keydown', function (event) {
        if (event.key !== 'Enter') return;
        // Enter commits a one-line field; in code it is a newline, so
        // there it is Ctrl/Cmd+Enter -- and Shift+Ctrl/Cmd+Enter opens
        // the big editor
        if (kind === 'text') {
          event.preventDefault();
          commit();
        } else if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (event.shiftKey) self._expand(id, attr);
          else commit();
        }
      });
    }

    var control = $('<div class="inspector-control"></div>').append(input, error);
    if (kind === 'code') {
      // 250px of column is not where anyone wants to write a state's
      // Entry block
      var expand = $('<button type="button" class="inspector-expand" ' +
                     'title="Edit in a larger editor (Shift+Ctrl/Cmd+Enter)" ' +
                     'aria-label="Edit ' + attr.name + ' in a larger editor">' +
                     '\u2921</button>');
      expand.on('click', function () { self._expand(id, attr); });
      control.append(expand);
      field.expand = function () { self._expand(id, attr); };
    }

    return row.append(label, control);
  };

  function readValue(field) {
    if (field.kind === 'checkbox') return field.input.is(':checked');
    if (field.kind === 'number') {
      var n = parseFloat(field.input.val());
      return isNaN(n) ? 0 : n;
    }
    // once CodeMirror has taken the textarea over, it holds the text
    if (field.cm) return field.cm.getValue();
    return field.input.val();
  }

  /**
   * Hand every code field to CodeMirror.
   *
   * Only once the form is in the document -- `fromTextArea` measures
   * as it builds -- and only for the form that is still showing when
   * the editor finishes loading, since it is fetched on first use.
   */
  Inspector.prototype._highlight = function () {
    var self = this;
    var forId = self._id;
    Object.keys(self._fields).forEach(function (name) {
      var field = self._fields[name];
      if (field.kind !== 'code' || field.cm) return;
      CodeEditor.inline(field.input[0], {
        onCommit: field.commit,
        onExpand: field.expand,
        onReady: function (cm) {
          if (self._id !== forId) { cm.toTextArea(); return; }  // moved on
          field.cm = cm;
          if (self._backend.isReadOnly()) cm.setOption('readOnly', true);
        },
      });
    });
  };

  /**
   * The same attribute, in an editor with room to work in. What is
   * saved goes back through the same commit path as the inline field,
   * so there is one place that validates and writes.
   */
  Inspector.prototype._expand = function (id, attr) {
    var self = this;
    var field = self._fields[attr.name];
    if (!field) return;
    var node = self._backend.getNode(id);
    CodeEditor.open({
      title: attr.name,
      subtitle: (node && node.name ? node.name + '  ' : '') + id,
      value: readValue(field),
      readOnly: self._backend.isReadOnly(),
      onSave: function (value) {
        if (field.cm) field.cm.setValue(value);
        else field.input.val(value);
        field.commit();
      },
    });
  };

  /**
   * Why this value cannot be stored, or nothing.
   *
   * The rule is exactly `checkModel`'s, per attribute, because being
   * stricter here would refuse models the generator is perfectly
   * happy with: `checkName` SANITIZES first -- spaces and hyphens
   * become underscores -- so "State 1" is a fine name and every
   * existing model uses names like it. `checkEvent` does not
   * sanitize, so an event name really must be an identifier already.
   *
   * Only identifiers are checked at all. Code is not: it is C++, this
   * is not a compiler, and refusing what it cannot parse would be
   * worse than useless.
   */
  Inspector.prototype._reject = function (attr, value) {
    if (describe.IDENTIFIER_ATTRIBUTES.indexOf(attr.name) === -1) return null;
    var text = String(value == null ? '' : value).trim();
    // an empty Event means "no trigger", which is a real thing to be;
    // an empty name is not
    if (!text) {
      return attr.name === 'name' ? 'A name is required.' : null;
    }

    var asGenerated = attr.name === 'name' ? checkModel.sanitizeString(text) : text;
    if (!checkModel.isValidString(asGenerated)) {
      // short on purpose: the panel is narrow, and a paragraph here
      // wraps to eight lines and pushes the rest of the form off
      return 'Not a usable C++ name.';
    }
    return null;
  };

  /**
   * Something worth saying about an accepted value. A name with a
   * space in it is fine, but it is not what appears in the generated
   * code, and nothing else in the tool ever mentions that.
   */
  Inspector.prototype._note = function (attr, value) {
    if (attr.name !== 'name') return null;
    var text = String(value == null ? '' : value).trim();
    var asGenerated = checkModel.sanitizeString(text);
    return asGenerated === text ? null : 'Generated as ' + asGenerated;
  };

  Inspector.prototype._write = function (id, attr, value) {
    var self = this;
    var backend = self._backend;
    if (value === backend.getAttribute(id, attr.name)) return;  // nothing to do
    try {
      backend.transact('Set ' + attr.name + ' on ' + id, function () {
        backend.setAttribute(id, attr.name, value);
      }, function (err) {
        if (err) {
          console.error('Could not set ' + attr.name + ': ', err);
          self.refresh();   // put back what the store actually holds
        }
      });
    } catch (e) {
      // transact reports through the callback and rethrows; the
      // report is enough, and letting it escape a change handler
      // raises the host's uncaught-exception banner over it
    }
  };

  return Inspector;
});
