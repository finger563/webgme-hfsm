/**
 * A small modal form dialog: several labeled fields, OK / Cancel, and
 * inline validation.
 *
 * Replaces chains of window.prompt() calls -- those cannot show the
 * fields together, cannot validate without losing what was typed, and
 * cannot be cancelled halfway without leaving the model half-edited.
 *
 * Usage:
 *
 *   var dlg = new FormDialog();
 *   dlg.initialize('Add field', [
 *     { key: 'name',    label: 'Name',    value: '' },
 *     { key: 'type',    label: 'C++ type', value: 'int' },
 *     { key: 'default', label: 'Default', value: '', optional: true },
 *   ], function(values) {
 *     // return an error string to keep the dialog open, or nothing
 *     if (!isValid(values.name)) return '"' + values.name + '" is not valid';
 *   });
 *   dlg.show();
 *   dlg.waitForValues().then(function(values) {
 *     // values is undefined when cancelled
 *   });
 */
define(['q',
        'text!./FormDialog.html',
        'css!./FormDialog.css'],
       function(Q, FormDialogTemplate) {
         'use strict';

         var FormDialog;

         function escapeHtml(str) {
           return String(str === undefined || str === null ? '' : str)
             .replace(/&/g, '&amp;').replace(/</g, '&lt;')
             .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
         }

         FormDialog = function () {
           this._dialog = $(FormDialogTemplate);
           this._dialog.appendTo($(document.body));

           this._title = this._dialog.find('#formDialogTitle').first();
           this._form = this._dialog.find('#formDialogForm').first();
           this._error = this._dialog.find('#formDialogError').first();
           this._btnCancel = this._dialog.find('.btn-cancel').first();
           this._btnOk = this._dialog.find('.btn-ok').first();
         };

         /**
          * @param {string}   title
          * @param {Array}    fields    [{key, label, value, hint, optional}]
          * @param {function} validate  optional; receives the values
          *                             object, returns an error string
          *                             to keep the dialog open
          */
         FormDialog.prototype.initialize = function (title, fields, validate) {
           var self = this;
           self._fields = fields || [];
           self._validate = validate;
           self._deferred = Q.defer();
           self._resolved = false;

           $(self._title).text(title || 'Edit');
           self._form.empty();
           self._fields.forEach(function(f) {
             self._form.append([
               '<div class="formDialogRow">',
               '<label class="formDialogLabel" for="fd_' + escapeHtml(f.key) + '">',
               escapeHtml(f.label || f.key),
               (f.optional ? ' <span class="formDialogOptional">(optional)</span>' : ''),
               '</label>',
               '<input class="formDialogInput" id="fd_' + escapeHtml(f.key) + '"',
               ' type="text" value="' + escapeHtml(f.value) + '"',
               ' aria-label="' + escapeHtml(f.label || f.key) + '"/>',
               (f.hint ? '<div class="formDialogHint">' + escapeHtml(f.hint) + '</div>' : ''),
               '</div>',
             ].join(''));
           });

           self._dialog.modal({ show: false });

           self._btnOk.on('click', function (event) {
             event.stopPropagation();
             event.preventDefault();
             self._submit();
           });
           // Enter submits from any field
           self._form.on('keydown', 'input', function (event) {
             if (event.which === 13) {
               event.preventDefault();
               self._submit();
             }
           });
           self._btnCancel.on('click', function (event) {
             event.stopPropagation();
             event.preventDefault();
             self._close(undefined);
           });
           // dismissing the modal (backdrop / ESC / dismiss()) cancels
           self._dialog.on('hidden.bs.modal', function () {
             self._dialog.empty();
             self._dialog.remove();
             self._resolve(undefined);
           });
         };

         FormDialog.prototype._values = function () {
           var self = this;
           var values = {};
           self._fields.forEach(function(f) {
             values[f.key] = self._form.find('#fd_' + f.key).first().val();
           });
           return values;
         };

         FormDialog.prototype._submit = function () {
           var self = this;
           var values = self._values();
           if (self._validate) {
             var err = self._validate(values);
             if (err) {
               // keep the dialog (and what was typed) in place
               $(self._error).text(err);
               return;
             }
           }
           $(self._error).text('');
           self._close(values);
         };

         FormDialog.prototype._close = function (values) {
           var self = this;
           self._pending = values;
           self._dialog.modal('hide'); // triggers hidden.bs.modal
           self._resolve(values);
         };

         FormDialog.prototype._resolve = function (values) {
           var self = this;
           if (self._resolved) {
             return;
           }
           self._resolved = true;
           self._deferred.resolve(values !== undefined ? values : self._pending);
         };

         /** Programmatically close (e.g. the model was switched). */
         FormDialog.prototype.dismiss = function () {
           this._dialog.modal('hide');
         };

         FormDialog.prototype.show = function () {
           this._dialog.modal('show');
         };

         /** @return {Promise} values object, or undefined if cancelled */
         FormDialog.prototype.waitForValues = function () {
           return this._deferred.promise;
         };

         return FormDialog;
       });
