#!/usr/bin/env bash
#
# Assemble the static HFSM Playground into dist/web/.
#
# The result is fully self-contained: no server, no database, no
# authentication, no CDN. It runs the SAME generator modules the CLI
# and the WebGME plugin use, copied in verbatim, so there is no second
# implementation to keep in sync.
#
# Usage:
#   scripts/build-web.sh [outdir]     # default: dist/web
#
# Then serve it (the template loader uses XHR, so file:// will not do):
#   python3 -m http.server -d dist/web 8080
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$REPO_ROOT/dist/web}"

say() { printf '  %s\n' "$1"; }

rm -rf "$OUT"
mkdir -p "$OUT/vendor" "$OUT/examples" \
         "$OUT/src/common" \
         "$OUT/src/plugins/SoftwareGenerator"

echo "building HFSM Playground -> $OUT"

# 1. the page itself
cp "$REPO_ROOT/web/index.html" "$REPO_ROOT/web/app.js" "$REPO_ROOT/web/app.css" "$OUT/"
say "page"

# 2. the generator: copied verbatim, never edited for the browser
cp "$REPO_ROOT"/src/common/*.js "$OUT/src/common/"
cp -R "$REPO_ROOT/src/plugins/SoftwareGenerator/templates" \
      "$OUT/src/plugins/SoftwareGenerator/templates"
say "generator ($(ls "$OUT/src/common" | wc -l | tr -d ' ') common modules + templates)"

# 3. third-party runtime deps (vendored: the app must work offline)
find_first() {
  for candidate in "$@"; do
    if [ -f "$candidate" ]; then printf '%s' "$candidate"; return 0; fi
  done
  echo "ERROR: none of these exist: $*" >&2
  echo "Run 'npm install' (and 'bower install') first." >&2
  exit 1
}

cp "$(find_first "$REPO_ROOT/node_modules/requirejs/require.js")" "$OUT/vendor/require.js"
cp "$(find_first "$REPO_ROOT/node_modules/requirejs-text/text.js")" "$OUT/vendor/text.js"
cp "$(find_first "$REPO_ROOT/bower_components/handlebars/handlebars.min.js" \
                 "$REPO_ROOT/node_modules/handlebars/dist/handlebars.min.js")" \
   "$OUT/vendor/handlebars.min.js"
cp "$(find_first "$REPO_ROOT/node_modules/underscore/underscore-umd.js" \
                 "$REPO_ROOT/node_modules/underscore/underscore.js")" \
   "$OUT/vendor/underscore-umd.js"
say "vendor (requirejs, text, handlebars, underscore)"

# CodeMirror for syntax highlighting -- editor for the model,
# read-only views for the generated code. The directory layout is
# preserved because the mode files resolve '../../lib/codemirror'
# relative to themselves under AMD; flattening it would load the
# library twice and the modes would register on the wrong copy.
CM_SRC="$(dirname "$(find_first "$REPO_ROOT/node_modules/codemirror/lib/codemirror.js")")/.."
mkdir -p "$OUT/vendor/codemirror/lib" \
         "$OUT/vendor/codemirror/mode/javascript" \
         "$OUT/vendor/codemirror/mode/clike" \
         "$OUT/vendor/codemirror/mode/xml" \
         "$OUT/vendor/codemirror/mode/shell"
cp "$CM_SRC/lib/codemirror.js"  "$OUT/vendor/codemirror/lib/"
cp "$CM_SRC/lib/codemirror.css" "$OUT/vendor/codemirror/lib/"
cp "$CM_SRC/mode/javascript/javascript.js" "$OUT/vendor/codemirror/mode/javascript/"
cp "$CM_SRC/mode/clike/clike.js"           "$OUT/vendor/codemirror/mode/clike/"
cp "$CM_SRC/mode/xml/xml.js"               "$OUT/vendor/codemirror/mode/xml/"
cp "$CM_SRC/mode/shell/shell.js"           "$OUT/vendor/codemirror/mode/shell/"
say "codemirror (json, c++, xml, shell modes)"

# 4. example models -- the same fixtures the test suite generates from,
#    so the playground can never demo something CI does not cover
cp "$REPO_ROOT"/test/fixtures/*.json "$OUT/examples/"
say "examples ($(ls "$OUT/examples" | wc -l | tr -d ' ') models)"

echo "done. serve with:  python3 -m http.server -d $OUT 8080"
