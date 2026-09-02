/**
 * What changed between two state machines.
 *
 * WHY
 * ---
 * Comparing two versions of a machine is something neither this tool
 * nor most others can do. The models are JSON, so a text diff is
 * possible and almost useless: it reports the order keys came out in,
 * the coordinates a node was dragged to, and an added state as a
 * dozen unrelated lines. What someone wants to know is "this state is
 * new, that transition's guard changed, that one is gone".
 *
 * WHAT IS COMPARED
 * ----------------
 * The PORTABLE form of each model -- `exportModel.toPortable` -- and
 * not the models as given. That is the same canonicalisation the CLI
 * writes to a file, so this inherits its answers rather than making
 * its own: which keys are real attributes of a type, which values are
 * defaults not worth writing down, and what a pointer is. A diff that
 * decided any of that separately would eventually disagree with the
 * exporter about whether two models are the same.
 *
 * POSITION IS NOT A CHANGE
 * ------------------------
 * Dragging a state does not change what the machine does, and a diff
 * that says it did buries the one guard that really changed under
 * forty moved nodes. Layout differences are reported separately, as
 * `moved`, and never as a change.
 *
 * HOW OBJECTS ARE MATCHED
 * -----------------------
 * By path first: two versions of the same project share ids, so this
 * is exact and handles renames for free -- a state whose name changed
 * is the same state.
 *
 * Then, for whatever is left, by (type, name) within a parent that
 * itself matched. Two models built separately from the same design
 * share no ids at all, and without this every object in both would be
 * reported as added and removed. It is deliberately conservative: a
 * candidate is only accepted when exactly one object of that type and
 * name is unmatched on each side, so an ambiguous match is left as
 * add + remove rather than guessed at.
 *
 * A MOVE IS A REMOVE AND AN ADD
 * -----------------------------
 * Containment in this format IS the path -- `/9/Y/x` is a child of
 * `/9/Y` -- so a state dragged into a different parent has a
 * different path and no way to be recognised as the same object.
 * That is a property of the model format, not a decision made here.
 */
define(['./exportModel', './metaRules'], function (exportModel, metaRules) {
  'use strict';

  var ADDED = 'added';
  var REMOVED = 'removed';
  var CHANGED = 'changed';
  var SAME = 'same';

  /** the path of the containing object, or '' for the root */
  function parentOf(path) {
    var cut = String(path).lastIndexOf('/');
    return cut > 0 ? path.slice(0, cut) : '';
  }

  function samePosition(a, b) {
    var pa = a && a.position, pb = b && b.position;
    if (!pa && !pb) return true;
    if (!pa || !pb) return false;
    return pa.x === pb.x && pa.y === pb.y;
  }

  /**
   * Every attribute either side has an opinion about, other than the
   * ones that are not content.
   */
  function attributeNames(a, b) {
    var names = {};
    [a, b].forEach(function (obj) {
      Object.keys(obj || {}).forEach(function (k) {
        // `position` is layout, `pointers` is compared on its own
        // because it is an object rather than a value
        if (k === 'position' || k === 'pointers') return;
        names[k] = true;
      });
    });
    return Object.keys(names).sort();
  }

  /**
   * What differs between two objects, ignoring where they sit.
   *
   * @param pairs  the matching, so a pointer is compared by WHAT IT
   *               POINTS AT rather than by the path it spells. Two
   *               models built separately name the same state
   *               differently; without this every transition between
   *               them reads as re-pointed.
   * @return [ { attribute, before, after } ], empty when they agree
   */
  function attributeChanges(before, after, pairs) {
    var changes = [];

    attributeNames(before, after).forEach(function (attr) {
      var was = before ? before[attr] : undefined;
      var now = after ? after[attr] : undefined;
      if (was === now) return;
      // absent and empty are the same thing to the generator, and the
      // exporter writes neither -- so a model that spells one out is
      // not different from one that leaves it off
      if ((was === undefined || was === '') && (now === undefined || now === '')) return;
      changes.push({ attribute: attr, before: was, after: now });
    });

    var pa = (before && before.pointers) || {};
    var pb = (after && after.pointers) || {};
    var pointers = {};
    Object.keys(pa).forEach(function (k) { pointers[k] = true; });
    Object.keys(pb).forEach(function (k) { pointers[k] = true; });
    Object.keys(pointers).sort().forEach(function (name) {
      var target = pa[name];
      if (pairs && pairs[target] !== undefined) target = pairs[target];
      if (target === pb[name]) return;
      // a transition that now starts or ends somewhere else is the
      // most consequential change there is, so it reads as one
      changes.push({ attribute: name, before: pa[name], after: pb[name],
                     isPointer: true });
    });

    return changes;
  }

  function depth(path) {
    return String(path).split('/').length;
  }

  /**
   * Pair up objects that are the same object.
   *
   * @param roots  { before, after } -- what each model declares as its
   *               root, which is the anchor the name matching hangs off
   * @return { beforePath: afterPath }
   */
  function match(before, after, roots) {
    var pairs = {};
    var takenAfter = {};

    function pair(from, to) {
      pairs[from] = to;
      takenAfter[to] = true;
    }

    Object.keys(before).forEach(function (path) {
      if (!after[path]) return;
      if (before[path].type !== after[path].type) return;   // not the same thing
      pair(path, path);
    });

    // The two roots are the same object by definition: they are what
    // each model declares itself to be. Without this a model rebuilt
    // under different ids has no matched parent anywhere, the name
    // matching below never gets a foothold, and every object in both
    // is reported as added AND removed.
    var rb = roots && roots.before, ra = roots && roots.after;
    if (rb && ra && before[rb] && after[ra] && pairs[rb] === undefined &&
        !takenAfter[ra] && before[rb].type === after[ra].type) {
      pair(rb, ra);
    }

    // A connection's name is not its identity: every transition in a
    // model is called "External Transition" until someone renames it,
    // which nobody does -- the diagram labels them by event. So they
    // are matched by what they CONNECT, once the states they connect
    // have been matched, and only then by event.
    function isConnection(obj) {
      return !!(obj && (metaRules.isConnection(obj.type) ||
                        (obj.pointers && (obj.pointers.src || obj.pointers.dst))));
    }

    // Then: same type and name, under a parent that matched.
    // Anchoring on the parent is what keeps this from pairing two
    // states called "Idle" in unrelated corners of the machine -- and
    // it is why this runs SHALLOWEST FIRST, so a parent has already
    // been paired by the time its children are considered.
    Object.keys(before)
      .filter(function (path) { return pairs[path] === undefined; })
      .sort(function (a, b) { return depth(a) - depth(b); })
      .forEach(function (path) {
        var parentPair = pairs[parentOf(path)];
        if (parentPair === undefined) return;      // parent itself unmatched
        var obj = before[path];
        if (isConnection(obj)) return;             // matched by endpoint below

        function sameKind(side, candidate, parent) {
          var c = side[candidate];
          return c && c.type === obj.type && c.name === obj.name &&
            parentOf(candidate) === parent;
        }

        var candidates = Object.keys(after).filter(function (p) {
          return !takenAfter[p] && sameKind(after, p, parentPair);
        });
        // exactly one on each side, or it is a guess -- and a wrong
        // pairing reads as a change that never happened
        if (candidates.length !== 1) return;
        var mine = Object.keys(before).filter(function (p) {
          return pairs[p] === undefined && sameKind(before, p, parentOf(path));
        });
        if (mine.length !== 1) return;
        pair(path, candidates[0]);
      });

    // Now the connections, in two goes: what they connect, and then
    // -- for one whose endpoint really did move -- what event they
    // carry. Anything still unmatched is a genuine add and remove.
    function endpointKey(obj, translate) {
      var ptr = obj.pointers || {};
      function at(p) {
        return translate && pairs[p] !== undefined ? pairs[p] : p;
      }
      return at(ptr.src) + ' -> ' + at(ptr.dst);
    }

    function matchConnectionsBy(keyOf) {
      var left = Object.keys(before).filter(function (p) {
        return pairs[p] === undefined && isConnection(before[p]);
      });
      var right = Object.keys(after).filter(function (p) {
        return !takenAfter[p] && isConnection(after[p]);
      });

      function group(paths, side, translate) {
        var out = {};
        paths.forEach(function (p) {
          var parent = parentOf(p);
          if (translate && pairs[parent] !== undefined) parent = pairs[parent];
          var key = parent + ' ' + side[p].type + ' ' + keyOf(side[p], translate);
          (out[key] = out[key] || []).push(p);
        });
        return out;
      }

      var mine = group(left, before, true);
      var theirs = group(right, after, false);
      Object.keys(mine).forEach(function (key) {
        // one on each side, or it is a guess
        if (mine[key].length !== 1) return;
        if (!theirs[key] || theirs[key].length !== 1) return;
        pair(mine[key][0], theirs[key][0]);
      });
    }

    matchConnectionsBy(endpointKey);
    // a transition whose endpoint moved is still the same transition
    // if it is the only one in there carrying that event
    matchConnectionsBy(function (obj) { return 'event:' + (obj.Event || ''); });

    return pairs;
  }

  return {
    ADDED: ADDED,
    REMOVED: REMOVED,
    CHANGED: CHANGED,
    SAME: SAME,

    attributeChanges: attributeChanges,

    /**
     * Compare two models.
     *
     * Either may be raw, resolved or already portable -- each is put
     * through the exporter first, so the answer does not depend on
     * which.
     *
     * @return {
     *   entries: [ {
     *     path,          where it lives in the union (the AFTER path
     *                    for anything that still exists)
     *     beforePath,    null when added
     *     afterPath,     null when removed
     *     status,        'added' | 'removed' | 'changed' | 'same'
     *     type, name,    from whichever side exists
     *     renamed,       name differs
     *     rehomed,       matched despite a different path
     *     moved,         position differs and nothing else does
     *     changes,       [ { attribute, before, after, isPointer? } ]
     *   } ],
     *   status: { '<union path>': '<status>' },
     *   summary: { added, removed, changed, moved, same }
     * }
     */
    diff: function (beforeModel, afterModel) {
      var beforePortable = exportModel.toPortable(beforeModel);
      var afterPortable = exportModel.toPortable(afterModel);
      var before = beforePortable.objects || {};
      var after = afterPortable.objects || {};
      var pairs = match(before, after, { before: beforePortable.root,
                                         after: afterPortable.root });
      var pairedAfter = {};
      Object.keys(pairs).forEach(function (p) { pairedAfter[pairs[p]] = p; });

      var entries = [];

      Object.keys(before).forEach(function (path) {
        var to = pairs[path];
        if (to === undefined) {
          entries.push({
            path: path, beforePath: path, afterPath: null,
            status: REMOVED, type: before[path].type, name: before[path].name,
            renamed: false, rehomed: false, moved: false, changes: [],
          });
          return;
        }
        var changes = attributeChanges(before[path], after[to], pairs);
        var moved = !samePosition(before[path], after[to]);
        entries.push({
          path: to, beforePath: path, afterPath: to,
          status: changes.length ? CHANGED : SAME,
          type: after[to].type, name: after[to].name,
          renamed: before[path].name !== after[to].name,
          rehomed: path !== to,
          moved: moved,
          changes: changes,
        });
      });

      Object.keys(after).forEach(function (path) {
        if (pairedAfter[path] !== undefined) return;
        entries.push({
          path: path, beforePath: null, afterPath: path,
          status: ADDED, type: after[path].type, name: after[path].name,
          renamed: false, rehomed: false, moved: false, changes: [],
        });
      });

      // Sorted by path, so the same pair of models always produces the
      // same list -- a change list whose order depends on object key
      // order is one nobody can read twice.
      entries.sort(function (a, b) {
        return a.path < b.path ? -1 : (a.path > b.path ? 1 : 0);
      });

      var status = {};
      var summary = { added: 0, removed: 0, changed: 0, moved: 0, same: 0 };
      entries.forEach(function (e) {
        status[e.path] = e.status;
        summary[e.status]++;
        if (e.moved) summary.moved++;
      });

      return { entries: entries, status: status, summary: summary };
    },

    /**
     * A single model holding both sides, for drawing.
     *
     * Everything that still exists comes from AFTER, so what is drawn
     * is the new machine; anything removed is put back where it used
     * to be, so it can be shown crossed out rather than silently
     * missing.
     *
     * WHERE IT USED TO BE HAS TO BE SAID IN THE NEW MODEL'S TERMS.
     * Containment in this format is the path, so a removed state
     * cannot simply keep the path it had: the two models may spell
     * the same parent differently, and a child left at '/9/x' under a
     * union rooted at '/o' is unreachable -- resolveModel says so and
     * throws, which is how this was found. So each removed object is
     * re-homed under whatever its nearest surviving ancestor became,
     * and its pointers are rewritten to match.
     *
     * @param diff  what `diff` returned. Each entry gains a
     *              `unionPath`: where that object ended up here,
     *              which is what a change list must use to point at
     *              it.
     * @return { model, status, dropped }
     */
    union: function (beforeModel, afterModel, diff) {
      var before = exportModel.toPortable(beforeModel);
      var after = exportModel.toPortable(afterModel);
      var objects = {};

      Object.keys(after.objects || {}).forEach(function (path) {
        objects[path] = after.objects[path];
      });

      // what each matched object became
      var mapped = {};
      diff.entries.forEach(function (entry) {
        if (entry.beforePath && entry.afterPath) {
          mapped[entry.beforePath] = entry.afterPath;
        }
      });

      var placed = {};
      function place(beforePath) {
        if (mapped[beforePath]) return mapped[beforePath];
        if (placed[beforePath]) return placed[beforePath];
        var cut = String(beforePath).lastIndexOf('/');
        var parent = cut > 0 ? beforePath.slice(0, cut) : '';
        var segment = cut > -1 ? beforePath.slice(cut) : '/' + beforePath;
        var base = parent ? place(parent) : '';
        var candidate = base + segment;
        // A removed 'Idle' and a surviving 'Idle' can want the same
        // path. The union is a picture, not a model anyone saves, so
        // a suffix is enough -- but it has to be applied, or one
        // would quietly overwrite the other.
        var n = 2;
        while (objects[candidate] || placed[candidate + '\u0000']) {
          candidate = base + segment + '~' + (n++);
        }
        placed[beforePath] = candidate;
        placed[candidate + '\u0000'] = true;   // taken
        return candidate;
      }

      diff.entries.forEach(function (entry) {
        if (entry.status !== REMOVED) return;
        var was = before.objects[entry.beforePath];
        if (!was) return;
        var at = place(entry.beforePath);
        var copy = {};
        Object.keys(was).forEach(function (k) { copy[k] = was[k]; });
        if (was.pointers) {
          copy.pointers = {};
          Object.keys(was.pointers).forEach(function (name) {
            var target = was.pointers[name];
            copy.pointers[name] =
              (target && before.objects[target]) ? place(target) : target;
          });
        }
        objects[at] = copy;
      });

      // Every entry says where it ended up, so a change list can
      // point the diagram at it.
      diff.entries.forEach(function (entry) {
        entry.unionPath = entry.status === REMOVED
          ? place(entry.beforePath) : entry.path;
      });

      // A removed transition can point at a state that is still
      // there, or at one that went with it -- both are in the union.
      // What it must not do is point at nothing: an edge with a
      // dangling endpoint is not drawable, and resolveModel says so
      // by throwing. Dropping it loses information, so it is dropped
      // LOUDLY, in the summary rather than silently.
      var dropped = [];
      Object.keys(objects).forEach(function (path) {
        var pointers = objects[path].pointers;
        if (!pointers) return;
        var dangling = Object.keys(pointers).some(function (name) {
          return pointers[name] && !objects[pointers[name]];
        });
        if (dangling) {
          dropped.push(path);
          delete objects[path];
        }
      });

      // keyed by where things ARE in the union, which is what a
      // diagram drawn from it can colour
      var status = {};
      diff.entries.forEach(function (entry) {
        if (objects[entry.unionPath]) status[entry.unionPath] = entry.status;
      });

      return {
        model: {
          root: after.root || before.root,
          namespace: after.namespace || before.namespace,
          objects: objects,
        },
        status: status,
        dropped: dropped,
      };
    },

    /**
     * A one-line summary, for a status bar.
     */
    describeSummary: function (summary) {
      var parts = [];
      if (summary.added) parts.push(summary.added + ' added');
      if (summary.removed) parts.push(summary.removed + ' removed');
      if (summary.changed) parts.push(summary.changed + ' changed');
      if (!parts.length) {
        return summary.moved
          ? 'identical, except that ' + summary.moved +
            (summary.moved === 1 ? ' object has' : ' objects have') + ' moved'
          : 'identical';
      }
      if (summary.moved) parts.push(summary.moved + ' moved');
      return parts.join(', ');
    },

    /** whether the metamodel draws this type at all -- for a change list */
    isDrawable: function (type) {
      return !!(metaRules.types[type]);
    },
  };
});
