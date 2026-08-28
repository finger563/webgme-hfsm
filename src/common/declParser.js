/**
 * Best-effort parser for the C++ `Declarations` code attributes.
 *
 * Used by the simulator (variable inspection panel), the generator
 * (runtime reflection table), and the CLI -- all three consume the
 * same parse so they can never disagree about what a model's
 * variables are.
 *
 * This is intentionally NOT a C++ parser. It recognizes the common
 * single-declarator forms:
 *
 *     int count;
 *     bool pressed{false};
 *     static const float gain = 1.5f;
 *     std::string name{"idle"};
 *
 * Anything else (functions, multi-declarator statements, macros,
 * classes, ...) is reported in `opaque` -- visible to callers, but
 * not reflected. That is the documented contract: reflection covers
 * simple declarations only.
 */
define([], function() {
  'use strict';

  var QUALIFIERS = ['static', 'constexpr', 'const', 'inline', 'mutable',
                    'volatile', 'thread_local'];

  // type "kinds" the reflection machinery supports
  var INT_TYPES = /^(?:(?:un)?signed(?:\s+(?:char|short|int|long|long\s+long))?|char|short|int|long|long\s+long|(?:u?int(?:8|16|32|64)_t)|size_t|ssize_t|std::size_t)$/;
  var FLOAT_TYPES = /^(?:float|double|long\s+double)$/;
  var STRING_TYPES = /^(?:std::string|string)$/;

  function stripComments(code) {
    // remove /* */ and // comments; preserve newlines for statement
    // splitting; naive about comment markers inside string literals,
    // which is acceptable for best-effort parsing
    return code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n]*/g, ' ');
  }

  function normalizeWs(str) {
    return str.trim().replace(/\s+/g, ' ');
  }

  function classify(type) {
    var t = normalizeWs(type);
    if (t === 'bool') return 'bool';
    if (INT_TYPES.test(t)) return 'int';
    if (FLOAT_TYPES.test(t)) return 'float';
    if (STRING_TYPES.test(t)) return 'string';
    return 'other';
  }

  // one declarator: qualifiers, a type, one name, optional initializer
  var DECL_RE = new RegExp(
    '^((?:(?:' + QUALIFIERS.join('|') + ')\\s+)*)' + // 1: qualifiers
    '([A-Za-z_][\\w:]*(?:\\s*<[^;{}]*>)?' +          // 2: type name (+ template args)
    '(?:\\s+(?:un)?signed|\\s+char|\\s+short|\\s+int|\\s+long|\\s+double)*' + // multi-word types
    '(?:\\s*[*&])*)' +                               // pointers / refs
    '\\s+([A-Za-z_]\\w*)\\s*' +                      // 3: variable name
    '(?:' +
      '=\\s*([\\s\\S]+)' +                           // 4: = init
      '|\\{([\\s\\S]*)\\}' +                         // 5: { init }
    ')?$'
  );

  /**
   * Split code into top-level statements: on ';' at brace / paren /
   * bracket depth zero, and after a top-level closing '}' (function
   * definitions have no trailing ';'). Template angle brackets are
   * NOT depth-tracked ('<' / '>' are ambiguous with comparison
   * operators); template arguments containing ';' or unbalanced
   * braces are therefore not supported and end up opaque. A statement
   * that opens a brace before any ';' (e.g. a function body) is
   * consumed to its matching close brace and reported opaque by the
   * caller (it won't match DECL_RE).
   */
  function splitStatements(code) {
    var statements = [];
    var depth = 0, start = 0;
    for (var i = 0; i < code.length; i++) {
      var c = code[i];
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') {
        depth--;
        // a block closing at top level ends the statement too --
        // function definitions have no trailing ';'. (An initializer
        // brace list is followed by ';' and yields an extra empty
        // statement, which is dropped by the caller.)
        if (c === '}' && depth === 0) {
          statements.push(code.slice(start, i + 1));
          start = i + 1;
        }
      }
      else if (c === ';' && depth === 0) {
        statements.push(code.slice(start, i));
        start = i + 1;
      }
    }
    var rest = code.slice(start);
    if (rest.trim().length) statements.push(rest);
    return statements;
  }

  return {
    classify: classify,

    /**
     * @param code    the Declarations attribute text
     * @param scope   optional label recorded on each variable (e.g.
     *                the declaring state's name or path)
     * @return { variables: [{name, type, kind, initial, scope}],
     *           opaque: [statement, ...] }
     */
    parseDeclarations: function(code, scope) {
      var variables = [];
      var opaque = [];
      if (!code || !code.trim || !code.trim().length) {
        return { variables: variables, opaque: opaque };
      }
      splitStatements(stripComments(code)).forEach(function(stmt) {
        var s = stmt.trim();
        if (!s.length) return;
        var m = DECL_RE.exec(s);
        // reject things that merely look like declarations:
        // function declarations/definitions have '(' after the name,
        // which DECL_RE cannot match, so they fall through to opaque;
        // type / alias / namespace declarations (`using Counter =
        // int;`, `class Driver;`, `typedef int Counter;`, ...) match
        // DECL_RE but declare no variable -- emitting an alias like
        // `_root->Counter` for them would not compile
        var DECL_KEYWORDS = /^(?:using|typedef|class|struct|enum|union|namespace|template|friend|extern)\b/;
        if (m && DECL_KEYWORDS.test(s.trim())) {
          m = null;
        }
        if (m) {
          var initial = m[4] !== undefined ? m[4] :
                        m[5] !== undefined ? m[5] : '';
          var type = normalizeWs(m[2]);
          variables.push({
            name: m[3],
            type: type,
            kind: classify(type),
            initial: normalizeWs(initial),
            scope: scope || '',
          });
        } else {
          opaque.push(normalizeWs(s));
        }
      });
      return { variables: variables, opaque: opaque };
    },

    /**
     * Return the subset of `names` referenced as whole identifiers in
     * a C++ expression (used to annotate guard choices with the
     * variables they read).
     *
     * Member / scoped accesses are NOT bare references: `stats.count`,
     * `stats->count`, and `Foo::count` read a member named count, not
     * the variable, so occurrences preceded by '.', '->', or '::' are
     * excluded (this also excludes `_root->count` -- callers that
     * care about explicit root access test for it separately).
     */
    referencedNames: function(expr, names) {
      if (!expr || !names || !names.length) return [];
      var stripped = stripComments(expr);
      return names.filter(function(n) {
        var re = new RegExp('\\b' + n + '\\b', 'g');
        var m;
        while ((m = re.exec(stripped)) !== null) {
          // inspect what precedes the identifier (skipping whitespace)
          var i = m.index - 1;
          while (i >= 0 && /\s/.test(stripped[i])) i--;
          var prev = i >= 0 ? stripped[i] : '';
          var prev2 = i >= 1 ? stripped[i - 1] : '';
          if (prev === '.' ||
              (prev === '>' && prev2 === '-') ||
              (prev === ':' && prev2 === ':')) {
            continue; // member / pointer / scope access, not bare
          }
          return true;
        }
        return false;
      });
    },

    /**
     * Return the subset of `fieldNames` referenced as `data.<field>`
     * in a C++ expression -- `data` is the generated event payload
     * alias in guard / transition-action scope.
     */
    referencedFields: function(expr, fieldNames) {
      if (!expr || !fieldNames || !fieldNames.length) return [];
      var stripped = stripComments(expr);
      return fieldNames.filter(function(n) {
        return new RegExp('\\bdata\\s*\\.\\s*' + n + '\\b').test(stripped);
      });
    },
  };
});
