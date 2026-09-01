#!/usr/bin/env node
/**
 * Generate src/common/meta.json -- the declarative HFSM metamodel --
 * from a WebGME .webgmex archive.
 *
 * WHY THIS EXISTS
 * ---------------
 * The metamodel currently lives only inside WebGME: containment
 * rules, connection endpoints and attribute types are enforced by the
 * client's meta API, which is why WebGMEBackend can answer
 * getValidChildTypes / getValidConnectionTypes / getChildTypeSchemas
 * by delegating. Nothing outside WebGME can: the CLI and the static
 * playground validate a model with checkModel + resolveModel, neither
 * of which knows what may contain what.
 *
 * This emits those rules as plain JSON so the standalone tooling --
 * and a future non-WebGME backend that has to enforce them while
 * editing -- can read the same metamodel the editor enforces.
 *
 * HOW IT IS KEPT HONEST
 * ---------------------
 * Run it by hand when the metamodel changes and commit the result;
 * CI regenerates and fails if the committed file has drifted (see the
 * `meta-sync` job). The output was validated against WebGME's own
 * resolved rules -- node.getJsonMeta() for every meta node in a live
 * client -- so this reader agrees with what the editor enforces
 * rather than merely with itself. Re-validate that way if webgme's
 * storage format ever changes underneath us.
 *
 * Deliberately dependency-free (a .webgmex is a zip holding one JSON
 * file, and node can inflate it): this script has to keep working if
 * the checker and generator move to their own repo, where webgme will
 * not be installed.
 *
 * Usage:
 *   node scripts/gen-meta.js                 # write src/common/meta.json
 *   node scripts/gen-meta.js --check         # exit non-zero if it differs
 *   node scripts/gen-meta.js --source <f>    # read a different archive
 *   node scripts/gen-meta.js --stdout        # print, write nothing
 */
'use strict';

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var repoRoot = path.resolve(__dirname, '..');
var DEFAULT_SOURCE = path.join(repoRoot, 'src/meta/meta.webgmex');
// The metamodel is duplicated in the seeds, and THAT copy is what
// actually governs a project at runtime (config points only at
// src/seeds, never at src/meta). --check verifies them too, so a seed
// re-exported from a changed metamodel cannot leave the editor and
// the standalone tooling silently disagreeing.
var SEED_DIR = path.join(repoRoot, 'src/seeds');
var OUTPUT = path.join(repoRoot, 'src/common/meta.json');
// AMD companion: the same data as a module. meta.json is the
// reviewable artifact and what non-JS tooling reads, but requiring
// consumers to fetch it through the text plugin would mean an extra
// XHR in the browser and a loader path that differs between node,
// the playground and WebGME. Both are generated together and CI
// checks both, so they cannot drift.
var OUTPUT_AMD = path.join(repoRoot, 'src/common/meta.js');

/* * * * * * * * * * *  reading the archive  * * * * * * * * * * */

/**
 * Minimal zip reader: a .webgmex holds a single `project.json`,
 * stored or deflated. Walking the central directory is less code than
 * taking on a zip dependency, and keeps this runnable anywhere node is.
 */
function readZipEntry(archivePath, entryName) {
  var buf = fs.readFileSync(archivePath);

  // End of Central Directory: signature, then scan back for it since
  // the record is variable length (it may carry a comment)
  var eocd = -1;
  for (var i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error(archivePath + ': not a zip archive');

  var count = buf.readUInt16LE(eocd + 10);
  var offset = buf.readUInt32LE(eocd + 16);

  for (var n = 0; n < count; n++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(archivePath + ': bad central directory entry');
    }
    var method = buf.readUInt16LE(offset + 10);
    var compressedSize = buf.readUInt32LE(offset + 20);
    var nameLen = buf.readUInt16LE(offset + 28);
    var extraLen = buf.readUInt16LE(offset + 30);
    var commentLen = buf.readUInt16LE(offset + 32);
    var localOffset = buf.readUInt32LE(offset + 42);
    var name = buf.toString('utf8', offset + 46, offset + 46 + nameLen);

    if (name === entryName) {
      // the local header repeats the name/extra lengths, and its
      // extra field may differ from the central one
      var localNameLen = buf.readUInt16LE(localOffset + 26);
      var localExtraLen = buf.readUInt16LE(localOffset + 28);
      var start = localOffset + 30 + localNameLen + localExtraLen;
      var data = buf.slice(start, start + compressedSize);
      if (method === 0) return data;                     // stored
      if (method === 8) return zlib.inflateRawSync(data); // deflated
      throw new Error(archivePath + ': unsupported compression ' + method);
    }
    offset += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(archivePath + ': no ' + entryName + ' in archive');
}

/* * * * * * * * * *  walking the object graph  * * * * * * * * * */

// keys of a webgme data object that hold its own data rather than a
// child node; everything else is a relid
var DATA_KEYS = ['_id', '__v', 'atr', 'reg', 'ovr',
                 '_minlenrelid', '_hasownrelation'];

function join(base, rel) {
  if (rel === '' || rel === '/') return base;
  return base + rel;
}

/**
 * Flatten the archive into
 *   nodes:    path -> { atr, reg }
 *   overlays: [{ source, name, target }]
 *
 * A data object holds one node plus any inner nodes stored inline
 * (`_meta`, `_sets`, ...); children that live in their own object
 * appear as a '#hash' string. Overlay keys AND targets are relative
 * to the node that owns the overlay, which is what makes the meta
 * membership edges resolvable.
 */
function flatten(projectJson) {
  var objects = {};
  projectJson.objects.forEach(function (obj) { objects[obj._id] = obj; });

  var nodes = {};
  var overlays = [];

  function visit(obj, nodePath) {
    if (!obj || typeof obj !== 'object') return;
    nodes[nodePath] = { atr: obj.atr || {}, reg: obj.reg || {} };

    Object.keys(obj.ovr || {}).forEach(function (rel) {
      var source = join(nodePath, rel);
      var pointers = obj.ovr[rel] || {};
      Object.keys(pointers).forEach(function (name) {
        var target = pointers[name];
        if (typeof target !== 'string' || target === '/_nullptr') return;
        overlays.push({
          source: source,
          name: name,
          target: join(nodePath, target),
        });
      });
    });

    Object.keys(obj).forEach(function (key) {
      if (DATA_KEYS.indexOf(key) > -1) return;
      var value = obj[key];
      if (typeof value === 'string' && value.charAt(0) === '#') {
        visit(objects[value], nodePath + '/' + key);
      } else if (value && typeof value === 'object') {
        visit(value, nodePath + '/' + key);
      }
    });
  }

  visit(objects[projectJson.rootHash], '');
  return { nodes: nodes, overlays: overlays };
}

/* * * * * * * * * * *  deriving the metamodel  * * * * * * * * * */

function membersUnder(overlays, prefix) {
  return overlays.filter(function (o) {
    return o.name === 'member' && o.source.indexOf(prefix) === 0;
  });
}

function buildMeta(projectJson, sourceLabel) {
  var flat = flatten(projectJson);
  var nodes = flat.nodes;
  var overlays = flat.overlays;

  // webgme marks its meta nodes by membership in the root's
  // MetaAspectSet -- the same list the client's getAllMetaNodes()
  // returns, so we cannot miss a type or invent one
  var metaPaths = membersUnder(overlays, '/_sets/MetaAspectSet/')
    .map(function (o) { return o.target; })
    // a deleted meta node can leave its set membership behind: both
    // seeds carry one such entry. The client drops members it cannot
    // resolve, so a name is the test for whether a type really exists
    .filter(function (p) {
      return nodes[p] && nodes[p].atr && nodes[p].atr.name;
    });

  var nameOf = {};
  metaPaths.forEach(function (p) {
    nameOf[p] = nodes[p].atr.name;
  });

  var baseOf = {};
  overlays.forEach(function (o) {
    if (o.name === 'base' && metaPaths.indexOf(o.source) > -1) {
      baseOf[o.source] = o.target;
    }
  });

  // --- own (not yet inherited) rules per meta node ---
  var own = {};
  metaPaths.forEach(function (metaPath) {
    var attributes = {};
    var attrMeta = (nodes[metaPath + '/_meta'] || {}).atr || {};
    Object.keys(attrMeta).forEach(function (attr) {
      if (attr === '_relguid') return;
      attributes[attr] = attrMeta[attr];
    });

    var children = {};
    membersUnder(overlays, metaPath + '/_meta/children/_sets/items/')
      .forEach(function (o) {
        var rule = (nodes[o.source] || {}).atr || {};
        children[o.target] = {
          min: rule.min === undefined ? -1 : rule.min,
          max: rule.max === undefined ? -1 : rule.max,
        };
      });

    // pointer definitions live at <meta>/_meta/_p_<name>
    var pointers = {};
    var pointerPrefix = metaPath + '/_meta/_p_';
    Object.keys(nodes).forEach(function (p) {
      if (p.indexOf(pointerPrefix) !== 0) return;
      var rest = p.slice(pointerPrefix.length);
      if (rest.indexOf('/') > -1) return; // a descendant, not the definition
      var rule = (nodes[p] || {}).atr || {};
      pointers[rest] = {
        min: rule.min === undefined ? -1 : rule.min,
        max: rule.max === undefined ? -1 : rule.max,
        targets: membersUnder(overlays, p + '/_sets/items/')
          .map(function (o) { return o.target; }),
      };
    });

    // a meta node's own attribute VALUES are the defaults its
    // instances start with. `name` is excluded: webgme does hand a
    // new node its type's name, but the model pipeline treats a
    // missing name as missing, and defaulting it would mask that.
    var defaults = {};
    Object.keys((nodes[metaPath] || {}).atr || {}).forEach(function (attr) {
      if (attr === '_relguid' || attr === 'name') return;
      defaults[attr] = nodes[metaPath].atr[attr];
    });

    own[metaPath] = {
      attributes: attributes,
      children: children,
      pointers: pointers,
      registry: (nodes[metaPath] || {}).reg || {},
      defaults: defaults,
    };
  });

  // --- resolve inheritance: a type gets its base's rules too ---
  var resolved = {};
  function resolve(metaPath, seen) {
    if (resolved[metaPath]) return resolved[metaPath];
    seen = seen || {};
    if (seen[metaPath]) {
      throw new Error('inheritance cycle at ' + metaPath);
    }
    seen[metaPath] = true;

    var empty = { attributes: {}, children: {}, pointers: {},
                  registry: {}, defaults: {} };
    var mine = own[metaPath] || empty;
    var base = baseOf[metaPath];
    var inherited = (base && own[base]) ? resolve(base, seen) : empty;

    var out = {
      attributes: Object.assign({}, inherited.attributes, mine.attributes),
      children: Object.assign({}, inherited.children, mine.children),
      // the registry inherits too, which is how a type can be
      // abstract only because its base is (History Pseudostate sets
      // no isAbstract of its own; Choice Pseudostate overrides it
      // to false)
      registry: Object.assign({}, inherited.registry, mine.registry),
      defaults: Object.assign({}, inherited.defaults, mine.defaults),
      pointers: {},
    };
    Object.keys(inherited.pointers).forEach(function (name) {
      out.pointers[name] = inherited.pointers[name];
    });
    Object.keys(mine.pointers).forEach(function (name) {
      var base_ = out.pointers[name];
      var rule = mine.pointers[name];
      out.pointers[name] = base_
        ? {
            min: rule.min,
            max: rule.max,
            targets: base_.targets.concat(rule.targets),
          }
        : rule;
    });
    resolved[metaPath] = out;
    return out;
  }
  metaPaths.forEach(function (p) { resolve(p); });

  // --- emit, keyed by type NAME (what the ModelBackend contract
  //     already speaks) and sorted so the file is stable ---
  var types = {};
  metaPaths.slice().sort(function (a, b) {
    return nameOf[a] < nameOf[b] ? -1 : nameOf[a] > nameOf[b] ? 1 : 0;
  }).forEach(function (metaPath) {
    var name = nameOf[metaPath];
    var rules = resolved[metaPath];

    // two nodes are named FCO (the project's and the HFSM library's)
    // and neither is an HFSM type; the language types all descend
    // from them, so nothing is lost by leaving them out
    if (name === 'FCO') return;

    var children = {};
    Object.keys(rules.children).sort(function (a, b) {
      return nameOf[a] < nameOf[b] ? -1 : 1;
    }).forEach(function (childPath) {
      var childName = nameOf[childPath];
      if (childName) children[childName] = rules.children[childPath];
    });

    var pointers = {};
    Object.keys(rules.pointers).sort().forEach(function (ptr) {
      var rule = rules.pointers[ptr];
      pointers[ptr] = {
        min: rule.min,
        max: rule.max,
        targets: rule.targets.map(function (t) { return nameOf[t]; })
          .filter(Boolean).sort(),
      };
    });

    var attributes = {};
    Object.keys(rules.attributes).sort().forEach(function (attr) {
      var def = Object.assign({}, rules.attributes[attr]);
      if (Object.prototype.hasOwnProperty.call(rules.defaults, attr)) {
        def.default = rules.defaults[attr];
      }
      attributes[attr] = def;
    });

    types[name] = {
      base: baseOf[metaPath] ? nameOf[baseOf[metaPath]] : null,
      isAbstract: !!rules.registry.isAbstract,
      // webgme calls a type a connection when it defines both
      // endpoints; GMEConcepts uses the same rule
      isConnection: !!(pointers.src && pointers.dst),
      attributes: attributes,
      children: children,
      pointers: pointers,
    };
  });

  return {
    _comment: 'GENERATED by scripts/gen-meta.js -- do not edit by hand. ' +
      'Regenerate after changing the metamodel; CI checks it is in sync.',
    source: sourceLabel,
    types: types,
  };
}

/* * * * * * * * * * * * * *  entry point  * * * * * * * * * * * * */

function generate(sourcePath) {
  var projectJson = JSON.parse(readZipEntry(sourcePath, 'project.json'));
  var label = path.relative(repoRoot, sourcePath);
  return buildMeta(projectJson, label);
}

function amdModule(text) {
  return [
    '/**',
    ' * GENERATED by scripts/gen-meta.js -- do not edit by hand.',
    ' *',
    ' * The HFSM metamodel as an AMD module; identical content to',
    ' * meta.json, which is the reviewable artifact. Regenerate both',
    ' * with `npm run gen:meta`.',
    ' */',
    'define([], function () {',
    "  'use strict';",
    '  return ' + text.trimEnd().split('\n').join('\n  ') + ';',
    '});',
    '',
  ].join('\n');
}

function main(argv) {
  var check = argv.indexOf('--check') > -1;
  var toStdout = argv.indexOf('--stdout') > -1;
  var sourceFlag = argv.indexOf('--source');
  var source = sourceFlag > -1 ? path.resolve(argv[sourceFlag + 1]) : DEFAULT_SOURCE;

  var meta = generate(source);
  // trailing newline so the file is well-formed for text tools
  var text = JSON.stringify(meta, null, 2) + '\n';

  var amd = amdModule(text);

  if (toStdout) {
    process.stdout.write(text);
    return 0;
  }

  if (check) {
    var failed = false;

    var stale = [OUTPUT, OUTPUT_AMD].filter(function (file, i) {
      var expected = i === 0 ? text : amd;
      return !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== expected;
    });
    if (stale.length) {
      stale.forEach(function (file) {
        console.error('gen-meta: ' + path.relative(repoRoot, file) +
                      ' is missing or out of sync with ' +
                      path.relative(repoRoot, source));
      });
      console.error('  the metamodel changed without regenerating it;' +
                    ' run `npm run gen:meta` and commit the result');
      failed = true;
    } else {
      console.log('gen-meta: meta.json and meta.js match ' +
                  path.relative(repoRoot, source) +
                  ' (' + Object.keys(meta.types).length + ' types)');
    }

    // compare the TYPES only: `source` names the archive each was
    // read from and is expected to differ
    var reference = JSON.stringify(meta.types);
    fs.readdirSync(SEED_DIR).filter(function (file) {
      return file.slice(-8) === '.webgmex';
    }).sort().forEach(function (file) {
      var seed = path.join(SEED_DIR, file);
      var seedMeta;
      try {
        seedMeta = generate(seed);
      } catch (e) {
        console.error('gen-meta: cannot read ' + path.relative(repoRoot, seed) +
                      ': ' + e.message);
        failed = true;
        return;
      }
      if (JSON.stringify(seedMeta.types) !== reference) {
        console.error('gen-meta: ' + path.relative(repoRoot, seed) +
                      ' defines a DIFFERENT metamodel than ' +
                      path.relative(repoRoot, source));
        console.error('  the seed governs projects at runtime, so the editor' +
                      ' and the standalone tooling would disagree');
        failed = true;
      } else {
        console.log('gen-meta: ' + path.relative(repoRoot, seed) +
                    ' carries the same metamodel');
      }
    });

    return failed ? 1 : 0;
  }

  fs.writeFileSync(OUTPUT, text);
  fs.writeFileSync(OUTPUT_AMD, amd);
  console.log('gen-meta: wrote meta.json + meta.js (' +
              Object.keys(meta.types).length + ' types) from ' +
              path.relative(repoRoot, source));
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { generate: generate, buildMeta: buildMeta };
