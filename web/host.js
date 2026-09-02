/**
 * HostServices over plain DOM -- the playground's counterpart to
 * WebGMEHost.
 *
 * The widget needs three things from whatever application it is
 * embedded in: somewhere to pop a context menu, somewhere to edit a
 * block of documentation, and a way to receive items dragged from a
 * palette. WebGME answers all three with its own UI framework. This
 * answers them with a menu, an overlay and a mouse-drag, which is all
 * they ever were.
 *
 * WHY THE DRAG IS NOT HTML5 DRAG AND DROP
 * ---------------------------------------
 * During an HTML5 drag the browser stops delivering mousemove and
 * mouseover: only the drag events fire. Cytoscape learns which node
 * the pointer is over from ordinary mouse events, and the widget
 * takes the drop's parent from that (`_hoveredNodeId`) -- so with
 * HTML5 dragging, every drop would land with no parent and be
 * rejected. jQuery UI, which WebGME drags with, is mouse-based for
 * the same reason.
 *
 * See src/common/viz/HostServices.js for the contract.
 */
define(['jquery', 'hfsm/viz/HostServices'], function ($, HostServices) {
  'use strict';

  function elementOf(target) {
    if (!target) return null;
    return target.jquery ? target[0] : target;
  }

  function PlaygroundHost() {
    this._targets = [];      // { el, handlers }
    this._drag = null;
    this._menu = null;
  }

  /* ----------------------- context menu ----------------------- */

  PlaygroundHost.prototype.closeMenu = function () {
    if (this._menu) {
      $(this._menu).remove();
      this._menu = null;
    }
  };

  /**
   * @param items     { key: { name, icon } } -- insertion order is
   *                  display order, as the contract says
   * @param onSelect  called with the chosen key
   * @param position  { x, y } in PAGE coordinates
   */
  PlaygroundHost.prototype.contextMenu = function (items, onSelect, position) {
    var self = this;
    self.closeMenu();

    var menu = $('<ul class="pg-menu" role="menu"></ul>');

    function choose(key, event) {
      if (event) event.stopPropagation();
      self.closeMenu();
      if (onSelect) onSelect(key);
    }

    // Arrow keys move between items and wrap, which is what `role
    //="menu"` tells a screen reader to expect. Without it the items
    // are reachable by Tab, which walks straight out of the menu and
    // on through the page behind it.
    function moveFocus(from, delta) {
      var items = menu.children();
      var at = items.index(from);
      var next = items.get((at + delta + items.length) % items.length);
      if (next) next.focus();
    }

    Object.keys(items || {}).forEach(function (key) {
      var item = items[key] || {};
      $('<li role="menuitem" tabindex="0"></li>')
        .text(item.name === undefined ? key : item.name)
        .on('click', function (event) { choose(key, event); })
        // An item that can be focused but not activated from the
        // keyboard is a trap: it takes the focus and then does
        // nothing with it.
        .on('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ' ||
              event.key === 'Spacebar') {          // Spacebar: older Edge
            event.preventDefault();                // or Space scrolls the page
            choose(key, event);
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveFocus(this, 1);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveFocus(this, -1);
          }
        })
        .appendTo(menu);
    });
    if (!menu.children().length) return;   // nothing to offer

    menu.css({ left: (position && position.x) || 0,
               top: (position && position.y) || 0 });
    $(document.body).append(menu);
    self._menu = menu[0];

    // Keep the menu on screen: it is placed at the pointer, which
    // near the right or bottom edge would otherwise put half of it
    // outside the window with no way to scroll to it.
    var box = menu[0].getBoundingClientRect();
    var overflowX = box.right - document.documentElement.clientWidth;
    var overflowY = box.bottom - document.documentElement.clientHeight;
    if (overflowX > 0) menu.css('left', Math.max(0, parseFloat(menu.css('left')) - overflowX - 4));
    if (overflowY > 0) menu.css('top', Math.max(0, parseFloat(menu.css('top')) - overflowY - 4));

    // dismissed by clicking away or by Escape, like any other menu
    var dismiss = function (event) {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      self.closeMenu();
      $(document).off('mousedown', dismiss).off('keydown', dismiss);
    };
    // next tick: the click that opened this must not also close it
    setTimeout(function () {
      $(document).on('mousedown', dismiss).on('keydown', dismiss);
    }, 0);

    // Somewhere to start from. Without this the keyboard has no way
    // into a menu that was opened by a right-click, since the focus
    // is still wherever it was.
    var first = menu.children().get(0);
    if (first) first.focus();
  };

  /* -------------------- documentation editor ------------------- */

  /**
   * WebGME opens its rich-text editor here. A plain textarea is the
   * honest equivalent: the attribute is text either way, and the
   * widget only cares that it gets the new value back.
   */
  PlaygroundHost.prototype.editDocument = function (text, onSave) {
    var overlay = $('<div class="pg-overlay"></div>');
    var box = $('<div class="pg-dialog" role="dialog" aria-modal="true" ' +
                'aria-label="Edit documentation"></div>');
    var area = $('<textarea class="pg-doc" spellcheck="false"></textarea>')
        .val(text || '');
    var buttons = $('<div class="pg-dialog-buttons"></div>');
    var cancel = $('<button type="button">Cancel</button>');
    var save = $('<button type="button" class="primary">Save</button>');

    function close() {
      overlay.remove();
      $(document).off('keydown', onKey);
    }
    function onKey(event) {
      if (event.key === 'Escape') close();
    }

    cancel.on('click', close);
    save.on('click', function () {
      var value = area.val();
      close();
      if (onSave) onSave(value);
    });
    // clicking the backdrop cancels; clicking the dialog must not
    overlay.on('click', function (event) {
      if (event.target === overlay[0]) close();
    });

    box.append($('<h3>Documentation</h3>'), area,
               buttons.append(cancel, save));
    overlay.append(box);
    $(document.body).append(overlay);
    $(document).on('keydown', onKey);
    area.focus();
  };

  /* ------------------------ drag and drop ---------------------- */

  PlaygroundHost.prototype.makeDroppable = function (element, handlers) {
    var self = this;
    var el = elementOf(element);
    if (!el) return undefined;
    var target = { el: el, handlers: handlers || {}, inside: false };
    self._targets.push(target);
    return function () {
      self._targets = self._targets.filter(function (t) { return t !== target; });
    };
  };

  function isInside(el, event) {
    var box = el.getBoundingClientRect();
    return event.clientX >= box.left && event.clientX <= box.right &&
           event.clientY >= box.top && event.clientY <= box.bottom;
  }

  /**
   * Start dragging palette items. Not part of the HostServices
   * contract -- where a drag COMES FROM is the host's business, and
   * the widget only ever receives the drop.
   *
   * @param payload  { items: ['<type name>'], effects: [] } -- the
   *                 normalized descriptor the contract promises
   * @param event    the mousedown that started it
   * @param label    what to show under the pointer
   */
  PlaygroundHost.prototype.startDrag = function (payload, event, label) {
    var self = this;
    if (self._drag) self._endDrag();

    // `pointer-events: none` matters: with the ghost under the
    // pointer, cytoscape's container would stop receiving mousemove
    // and the widget would never learn which node it is over.
    var ghost = $('<div class="pg-drag-ghost"></div>').text(label || '');
    $(document.body).append(ghost);

    var drag = self._drag = { payload: payload, ghost: ghost };

    drag.move = function (moveEvent) {
      ghost.css({ left: moveEvent.pageX + 12, top: moveEvent.pageY + 12 });
      self._targets.forEach(function (target) {
        var inside = isInside(target.el, moveEvent);
        if (inside === target.inside) return;
        target.inside = inside;
        var handler = inside ? target.handlers.over : target.handlers.out;
        if (handler) handler(moveEvent, payload);
      });
    };

    drag.up = function (upEvent) {
      var dropped = self._targets.filter(function (target) {
        return isInside(target.el, upEvent);
      });
      self._endDrag(upEvent);
      dropped.forEach(function (target) {
        if (target.handlers.drop) target.handlers.drop(upEvent, payload);
      });
    };

    drag.key = function (keyEvent) {
      if (keyEvent.key === 'Escape') self._endDrag(keyEvent);
    };

    $(document).on('mousemove', drag.move)
               .on('mouseup', drag.up)
               .on('keydown', drag.key);
    drag.move(event);
  };

  PlaygroundHost.prototype._endDrag = function (event) {
    var drag = this._drag;
    if (!drag) return;
    this._drag = null;
    drag.ghost.remove();
    $(document).off('mousemove', drag.move)
               .off('mouseup', drag.up)
               .off('keydown', drag.key);
    // every target that thought it was under the pointer is not any
    // more, so the widget can clear its drop highlighting
    this._targets.forEach(function (target) {
      if (!target.inside) return;
      target.inside = false;
      if (target.handlers.out) target.handlers.out(event, drag.payload);
    });
  };

  /** tear down anything still on screen */
  PlaygroundHost.prototype.destroy = function () {
    this._endDrag();
    this.closeMenu();
    this._targets = [];
  };

  return function () {
    return HostServices.assertImplements(new PlaygroundHost(), 'PlaygroundHost');
  };
});
