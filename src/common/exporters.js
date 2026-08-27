/**
 * Interop exporters for HFSM models.
 *
 * Each exporter takes a *processed* model (see processor.js) and the
 * path of a 'State Machine' object within it, and returns a string:
 *
 *   - toMermaid   : mermaid `stateDiagram-v2` (docs, GitHub READMEs, PRs)
 *   - toPlantUML  : PlantUML state diagram (full history/choice notation)
 *   - toSCXML     : W3C SCXML interchange. Guards / actions / entry /
 *                   exit are C++ code, carried verbatim in cond= /
 *                   <script> elements; tick / timer-period, which have
 *                   no SCXML analog, are carried in attributes under
 *                   the hfsm: namespace. The export is structurally
 *                   valid SCXML but is an interchange format: the
 *                   embedded code is not an SCXML datamodel.
 *
 * Mapping notes (documented deviations):
 *   - Choice pseudostates -> SCXML <state> with only eventless
 *     conditional transitions (equivalent firing semantics).
 *   - History in mermaid   -> plain states labeled H / H* (mermaid has
 *     no history notation).
 *   - Transition actions are omitted from diagram labels (they are
 *     code blocks); guards are shown inline.
 */
define([], function() {
  'use strict';

  function isPathWithin(ancestorPath, path) {
    return path === ancestorPath ||
      (path && ancestorPath && path.indexOf(ancestorPath + '/') === 0);
  }

  function idFor(obj) {
    return 'S' + obj.path.replace(/[^a-zA-Z0-9]/g, '_');
  }

  function oneLine(str) {
    return (str || '').trim().replace(/\s+/g, ' ');
  }

  function childrenOf(obj, key) {
    return obj[key + '_list'] || [];
  }

  function getTransitions(objects, machine, types) {
    return Object.keys(objects).sort().map(function(p) {
      return objects[p];
    }).filter(function(o) {
      return types.indexOf(o.type) > -1 && isPathWithin(machine.path, o.path);
    });
  }

  function initialTargetOf(state, objects) {
    // returns the destination object of the state's Initial transition
    var initials = childrenOf(state, 'Initial');
    if (!initials.length) return null;
    var trans = getTransitions(objects, state, ['External Transition'])
        .filter(function(t) { return t.pointers['src'] == initials[0].path; });
    if (!trans.length) return null;
    return objects[trans[0].pointers['dst']] || null;
  }

  function transitionLabel(t) {
    var label = oneLine(t.Event);
    if (t.Guard && oneLine(t.Guard).length) {
      label += ' [' + oneLine(t.Guard) + ']';
    }
    return label;
  }

  function xmlEscape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '&#10;');
  }

  return {

    /* * * * * * * * * * *  MERMAID  * * * * * * * * * * */
    toMermaid: function(model, machinePath) {
      var objects = model.objects;
      var machine = objects[machinePath];
      var lines = ['stateDiagram-v2'];

      function emitState(state, indent) {
        var pad = new Array(indent + 1).join('  ');
        var kids = childrenOf(state, 'State');
        var isComposite = kids.length > 0 ||
            childrenOf(state, 'Choice Pseudostate').length > 0;
        if (isComposite) {
          lines.push(pad + 'state "' + state.name + '" as ' + idFor(state) + ' {');
          emitRegion(state, indent + 1);
          lines.push(pad + '}');
        } else {
          lines.push(pad + 'state "' + state.name + '" as ' + idFor(state));
        }
        // internal transitions as state description lines
        (state.InternalEvents || []).forEach(function(evInfo) {
          evInfo.Transitions.forEach(function(t) {
            lines.push(pad + idFor(state) + ' : ' + transitionLabel(t) + ' (internal)');
          });
        });
      }

      function emitRegion(parent, indent) {
        var pad = new Array(indent + 1).join('  ');
        childrenOf(parent, 'State').forEach(function(s) { emitState(s, indent); });
        childrenOf(parent, 'Choice Pseudostate').forEach(function(c) {
          lines.push(pad + 'state ' + idFor(c) + ' <<choice>>');
        });
        // mermaid has no history notation; emit labeled states
        childrenOf(parent, 'Shallow History Pseudostate').forEach(function(h) {
          lines.push(pad + 'state "H" as ' + idFor(h));
        });
        childrenOf(parent, 'Deep History Pseudostate').forEach(function(h) {
          lines.push(pad + 'state "H*" as ' + idFor(h));
        });
        var initialDst = initialTargetOf(parent, objects);
        if (initialDst) {
          lines.push(pad + '[*] --> ' + idFor(initialDst));
        }
      }

      emitRegion(machine, 0);

      // all external / local transitions (except initial transitions)
      var initialPaths = {};
      Object.keys(objects).forEach(function(p) {
        if (objects[p].type == 'Initial') initialPaths[p] = true;
      });
      getTransitions(objects, machine, ['External Transition', 'Local Transition'])
        .forEach(function(t) {
          var src = objects[t.pointers['src']];
          var dst = objects[t.pointers['dst']];
          if (!src || !dst || initialPaths[src.path]) return;
          var dstId = dst.type == 'End State' ? '[*]' : idFor(dst);
          var label = transitionLabel(t);
          lines.push(idFor(src) + ' --> ' + dstId + (label ? ' : ' + label : ''));
        });
      return lines.join('\n') + '\n';
    },

    /* * * * * * * * * * *  PLANTUML  * * * * * * * * * * */
    toPlantUML: function(model, machinePath) {
      var objects = model.objects;
      var machine = objects[machinePath];
      var lines = ['@startuml', 'title ' + machine.name, ''];

      function emitState(state, indent) {
        var pad = new Array(indent + 1).join('  ');
        var kids = childrenOf(state, 'State');
        var isComposite = kids.length > 0 ||
            childrenOf(state, 'Choice Pseudostate').length > 0;
        if (isComposite) {
          lines.push(pad + 'state "' + state.name + '" as ' + idFor(state) + ' {');
          emitRegion(state, indent + 1);
          lines.push(pad + '}');
        } else {
          lines.push(pad + 'state "' + state.name + '" as ' + idFor(state));
        }
        (state.InternalEvents || []).forEach(function(evInfo) {
          evInfo.Transitions.forEach(function(t) {
            lines.push(pad + idFor(state) + ' : ' + transitionLabel(t));
          });
        });
      }

      function emitRegion(parent, indent) {
        var pad = new Array(indent + 1).join('  ');
        childrenOf(parent, 'State').forEach(function(s) { emitState(s, indent); });
        childrenOf(parent, 'Choice Pseudostate').forEach(function(c) {
          lines.push(pad + 'state ' + idFor(c) + ' <<choice>>');
        });
        var initialDst = initialTargetOf(parent, objects);
        if (initialDst) {
          lines.push(pad + '[*] --> ' + historyAwareId(initialDst));
        }
      }

      function historyAwareId(dst) {
        // PlantUML addresses history via the parent state: Parent[H]
        if (dst.type == 'Shallow History Pseudostate') {
          return idFor(objects[dst.parentPath]) + '[H]';
        }
        if (dst.type == 'Deep History Pseudostate') {
          return idFor(objects[dst.parentPath]) + '[H*]';
        }
        if (dst.type == 'End State') {
          return '[*]';
        }
        return idFor(dst);
      }

      emitRegion(machine, 0);
      lines.push('');

      var initialPaths = {};
      Object.keys(objects).forEach(function(p) {
        if (objects[p].type == 'Initial') initialPaths[p] = true;
      });
      getTransitions(objects, machine, ['External Transition', 'Local Transition'])
        .forEach(function(t) {
          var src = objects[t.pointers['src']];
          var dst = objects[t.pointers['dst']];
          if (!src || !dst || initialPaths[src.path]) return;
          var label = transitionLabel(t);
          var arrow = t.type == 'Local Transition' ? ' -[dashed]-> ' : ' --> ';
          lines.push(idFor(src) + arrow + historyAwareId(dst) +
                     (label ? ' : ' + label : ''));
        });
      lines.push('', '@enduml');
      return lines.join('\n') + '\n';
    },

    /* * * * * * * * * * *  SCXML  * * * * * * * * * * */
    toSCXML: function(model, machinePath) {
      var objects = model.objects;
      var machine = objects[machinePath];
      var lines = [];
      var HFSM_NS = 'https://github.com/finger563/webgme-hfsm';

      function emitCode(pad, tag, code) {
        if (code && code.trim().length) {
          lines.push(pad + '<' + tag + '><script>' + xmlEscape(code.trim()) +
                     '</script></' + tag + '>');
        }
      }

      function emitTransition(pad, t, opts) {
        opts = opts || {};
        var attrs = [];
        if (t.Event && t.Event.trim().length) {
          attrs.push('event="' + xmlEscape(t.Event.trim()) + '"');
        }
        if (t.Guard && t.Guard.trim().length) {
          attrs.push('cond="' + xmlEscape(oneLine(t.Guard)) + '"');
        }
        if (opts.target) {
          attrs.push('target="' + opts.target + '"');
        }
        if (opts.internal) {
          attrs.push('type="internal"');
        }
        var attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
        if (t.Action && t.Action.trim().length) {
          lines.push(pad + '<transition' + attrStr + '>');
          lines.push(pad + '  <script>' + xmlEscape(t.Action.trim()) + '</script>');
          lines.push(pad + '</transition>');
        } else {
          lines.push(pad + '<transition' + attrStr + '/>');
        }
      }

      function targetIdFor(dst) {
        return idFor(dst);
      }

      function emitOutgoing(pad, state) {
        // SCXML selects transitions by document order, so emission
        // order must mirror the runtime's priority: internal
        // transitions are checked before external / local ones, and
        // within an event guarded transitions come before the
        // unguarded one (the processor pre-sorts the event infos in
        // exactly that order).
        //
        // internal transitions first; targetless transitions do not
        // exit / re-enter any state
        (state.InternalEvents || []).forEach(function(evInfo) {
          evInfo.Transitions.forEach(function(t) {
            emitTransition(pad, t, {});
          });
        });
        // then external / local transitions, in the processor's
        // guarded-before-unguarded order
        (state.ExternalEvents || []).forEach(function(evInfo) {
          evInfo.Transitions.forEach(function(t) {
            var dst = objects[t.pointers['dst']];
            if (!dst) return;
            emitTransition(pad, t, {
              target: targetIdFor(dst),
              // SCXML 'internal' == UML 'local': do not exit the source
              internal: t.type == 'Local Transition',
            });
          });
        });
        // finally eventless (end / completion) transitions, which the
        // event infos do not carry
        getTransitions(objects, machine, ['External Transition', 'Local Transition'])
          .filter(function(t) {
            return t.pointers['src'] == state.path &&
              !(t.Event && t.Event.trim().length);
          })
          .forEach(function(t) {
            var dst = objects[t.pointers['dst']];
            if (!dst) return;
            emitTransition(pad, t, {
              target: targetIdFor(dst),
              internal: t.type == 'Local Transition',
            });
          });
      }

      function hfsmAttrs(state) {
        var extra = '';
        if (state.Tick && state.Tick.trim().length) {
          extra += ' hfsm:tick="' + xmlEscape(state.Tick.trim()) + '"';
        }
        var period = state['Timer Period'];
        if (period && Number(period) > 0) {
          extra += ' hfsm:timer-period="' + xmlEscape(period) + '"';
        }
        return extra;
      }

      function emitState(state, indent) {
        var pad = new Array(indent + 1).join('  ');
        lines.push(pad + '<state id="' + idFor(state) + '" hfsm:name="' +
                   xmlEscape(state.name) + '"' + hfsmAttrs(state) + '>');
        emitCode(pad + '  ', 'onentry', state.Entry);
        emitCode(pad + '  ', 'onexit', state.Exit);
        var initialDst = initialTargetOf(state, objects);
        if (initialDst) {
          lines.push(pad + '  <initial><transition target="' +
                     targetIdFor(initialDst) + '"/></initial>');
        }
        emitOutgoing(pad + '  ', state);
        emitRegion(state, indent + 1);
        lines.push(pad + '</state>');
      }

      function emitRegion(parent, indent) {
        var pad = new Array(indent + 1).join('  ');
        childrenOf(parent, 'State').forEach(function(s) { emitState(s, indent); });
        // choice pseudostates: states with only eventless conditional
        // transitions -- entering one immediately takes the first
        // enabled transition, matching choice semantics
        childrenOf(parent, 'Choice Pseudostate').forEach(function(c) {
          lines.push(pad + '<state id="' + idFor(c) + '" hfsm:pseudostate="choice">');
          // processor-sorted: guarded branches before the unguarded
          // (else) branch, so SCXML's document-order selection
          // matches the generated else-if chain
          (c.ExternalTransitions || []).forEach(function(t) {
            var dst = objects[t.pointers['dst']];
            if (!dst) return;
            emitTransition(pad + '  ', t, { target: targetIdFor(dst) });
          });
          lines.push(pad + '</state>');
        });
        childrenOf(parent, 'Shallow History Pseudostate').forEach(function(h) {
          emitHistory(pad, h, 'shallow', parent);
        });
        childrenOf(parent, 'Deep History Pseudostate').forEach(function(h) {
          emitHistory(pad, h, 'deep', parent);
        });
        childrenOf(parent, 'End State').forEach(function(e) {
          lines.push(pad + '<final id="' + idFor(e) + '"/>');
        });
      }

      function emitHistory(pad, h, type, parent) {
        // SCXML requires a default transition; use the parent's
        // initial state (which is what an empty history falls back to)
        var dflt = initialTargetOf(parent, objects);
        lines.push(pad + '<history id="' + idFor(h) + '" type="' + type + '">');
        lines.push(pad + '  <transition target="' +
                   (dflt ? targetIdFor(dflt) : idFor(parent)) + '"/>');
        lines.push(pad + '</history>');
      }

      var rootInitial = initialTargetOf(machine, objects);
      lines.push('<?xml version="1.0" encoding="UTF-8"?>');
      lines.push('<scxml xmlns="http://www.w3.org/2005/07/scxml"' +
                 ' xmlns:hfsm="' + HFSM_NS + '"' +
                 ' version="1.0" name="' + xmlEscape(machine.name) + '"' +
                 (rootInitial ? ' initial="' + targetIdFor(rootInitial) + '"' : '') +
                 '>');
      emitRegion(machine, 1);
      lines.push('</scxml>');
      return lines.join('\n') + '\n';
    },
  };
});
