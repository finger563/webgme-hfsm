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
cp "$REPO_ROOT/web/index.html" "$REPO_ROOT/web/app.js" \
   "$REPO_ROOT/web/app.css" "$REPO_ROOT/web/viz.js" "$OUT/"
say "page"

# 2. the generator: copied verbatim, never edited for the browser
cp "$REPO_ROOT"/src/common/*.js "$OUT/src/common/"
# ... including the viz contracts (ModelBackend, HostServices) and the
# LocalBackend the playground drives the visualizer through
mkdir -p "$OUT/src/common/viz"
cp "$REPO_ROOT"/src/common/viz/*.js "$OUT/src/common/viz/"
cp -R "$REPO_ROOT/src/plugins/SoftwareGenerator/templates" \
      "$OUT/src/plugins/SoftwareGenerator/templates"
say "generator ($(ls "$OUT"/src/common/*.js "$OUT"/src/common/viz/*.js | wc -l | tr -d ' ') common modules + templates)"

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

# 3b. the visualizer: the SAME widget and simulator WebGME runs, not a
#     second implementation. Phase A/B put the model behind
#     ModelBackend and the host UI behind HostServices, so the widget
#     itself no longer references WebGME -- which is what makes this
#     copy possible. Its two WebGME adapters are deliberately NOT
#     copied: nothing here can load them, and leaving them out keeps
#     the shipped tree provably free of WebGME.
VIZ_SRC="$REPO_ROOT/src/visualizers/widgets/HFSMViz"
mkdir -p "$OUT/src/visualizers/widgets"
cp -R "$VIZ_SRC" "$OUT/src/visualizers/widgets/HFSMViz"
rm -f "$OUT/src/visualizers/widgets/HFSMViz/WebGMEBackend.js" \
      "$OUT/src/visualizers/widgets/HFSMViz/WebGMEHost.js"
# the simulator styles UML states with this repo's own decorator sheet
mkdir -p "$OUT/src/decorators/UMLStateMachineDecorator/DiagramDesigner"
cp "$REPO_ROOT/src/decorators/UMLStateMachineDecorator/DiagramDesigner/UMLStateMachineDecorator.DiagramDesignerWidget.css" \
   "$OUT/src/decorators/UMLStateMachineDecorator/DiagramDesigner/"
say "visualizer (widget + simulator, WebGME adapters excluded)"

# 3c. the front-end libraries the visualizer needs. The 'bower/...'
#     layout is preserved because the widget names its dependencies
#     that way; a flat copy would need the module ids rewritten, and
#     rewriting them is exactly the drift this build exists to avoid.
WG_BOWER="$REPO_ROOT/node_modules/webgme/src/client/bower_components"
mkdir -p "$OUT/vendor/bower/cytoscape/dist" \
         "$OUT/vendor/bower/cytoscape-cose-bilkent" \
         "$OUT/vendor/bower/cytoscape-edgehandles" \
         "$OUT/vendor/bower/cytoscape-context-menus" \
         "$OUT/vendor/bower/cytoscape-panzoom" \
         "$OUT/vendor/bower/mustache.js" \
         "$OUT/vendor/bower/handlebars" \
         "$OUT/vendor/bower/blob-util/dist" \
         "$OUT/vendor/bower/highlightjs/styles"

cp "$(find_first "$REPO_ROOT/bower_components/cytoscape/dist/cytoscape.min.js")" \
   "$OUT/vendor/bower/cytoscape/dist/cytoscape.min.js"
cp "$(find_first "$REPO_ROOT/bower_components/cytoscape-cose-bilkent/cytoscape-cose-bilkent.js")" \
   "$OUT/vendor/bower/cytoscape-cose-bilkent/cytoscape-cose-bilkent.js"
cp "$(find_first "$REPO_ROOT/bower_components/cytoscape-edgehandles/cytoscape-edgehandles.js")" \
   "$OUT/vendor/bower/cytoscape-edgehandles/cytoscape-edgehandles.js"
cp "$(find_first "$REPO_ROOT/bower_components/cytoscape-context-menus/cytoscape-context-menus.js")" \
   "$OUT/vendor/bower/cytoscape-context-menus/cytoscape-context-menus.js"
cp "$(find_first "$REPO_ROOT/bower_components/cytoscape-context-menus/cytoscape-context-menus.css")" \
   "$OUT/vendor/bower/cytoscape-context-menus/cytoscape-context-menus.css"
cp "$(find_first "$REPO_ROOT/bower_components/cytoscape-panzoom/cytoscape-panzoom.js")" \
   "$OUT/vendor/bower/cytoscape-panzoom/cytoscape-panzoom.js"
cp "$(find_first "$REPO_ROOT/bower_components/cytoscape-panzoom/cytoscape.js-panzoom.css")" \
   "$OUT/vendor/bower/cytoscape-panzoom/cytoscape.js-panzoom.css"
cp "$(find_first "$REPO_ROOT/bower_components/mustache.js/mustache.min.js")" \
   "$OUT/vendor/bower/mustache.js/mustache.min.js"
cp "$OUT/vendor/handlebars.min.js" "$OUT/vendor/bower/handlebars/handlebars.min.js"
cp "$(find_first "$REPO_ROOT/bower_components/blob-util/dist/blob-util.min.js")" \
   "$OUT/vendor/bower/blob-util/dist/blob-util.min.js"
cp "$(find_first "$REPO_ROOT/bower_components/highlightjs/highlight.pack.min.js")" \
   "$OUT/vendor/bower/highlightjs/highlight.pack.min.js"
cp "$(find_first "$REPO_ROOT/bower_components/highlightjs/styles/default.css")" \
   "$OUT/vendor/bower/highlightjs/styles/default.css"

# jQuery + bootstrap's modal (the dialogs are bootstrap modals), the
# require-css plugin (the widget loads its styles through `css!`),
# and Q for the simulator's promises
# WebGME's jQuery first, deliberately: that is the one the widget
# actually runs against in the editor, and it is pinned by webgme's
# own dependencies. Ours arrives as a floating transitive dependency
# of the cytoscape plugins -- 3.6.0 here, 3.7.1 on a fresh install --
# so preferring it would make the playground drift from the editor
# depending on when someone last ran bower.
cp "$(find_first "$WG_BOWER/jquery/dist/jquery.min.js" \
                 "$REPO_ROOT/bower_components/jquery/dist/jquery.min.js")" \
   "$OUT/vendor/jquery.min.js"
cp "$(find_first "$WG_BOWER/bootstrap/dist/js/bootstrap.min.js")" "$OUT/vendor/bootstrap.min.js"
cp "$(find_first "$WG_BOWER/bootstrap/dist/css/bootstrap.min.css")" "$OUT/vendor/bootstrap.min.css"
cp "$(find_first "$WG_BOWER/require-css/css.min.js")" "$OUT/vendor/css.min.js"
cp "$(find_first "$REPO_ROOT/node_modules/q/q.js")" "$OUT/vendor/q.js"

# Font Awesome: the simulator's buttons and the graph toolbar are
# icons, and without the font they render as empty boxes sized for
# text that is not there. WebGME serves this; a static page has to
# carry it.
#
# The font files keep the 'fonts/' directory the stylesheet expects
# (it asks for '../fonts/...'). Only the three modern formats are
# copied: the stylesheet lists eot and svg first and last for very
# old browsers, which pick them by preference -- anything that can
# run cytoscape takes the woff2 and never asks for the others.
FA="$WG_BOWER/font-awesome"
mkdir -p "$OUT/vendor/font-awesome/css" "$OUT/vendor/font-awesome/fonts"
cp "$(find_first "$FA/css/font-awesome.min.css")" "$OUT/vendor/font-awesome/css/"
for face in woff2 woff ttf; do
  cp "$(find_first "$FA/fonts/fontawesome-webfont.$face")" \
     "$OUT/vendor/font-awesome/fonts/"
done
say "visualizer deps (cytoscape + 4 plugins, jquery, bootstrap, require-css, q, mustache, highlight)"

# 4. example models -- the same fixtures the test suite generates from,
#    so the playground can never demo something CI does not cover
cp "$REPO_ROOT"/test/fixtures/*.json "$OUT/examples/"
say "examples ($(ls "$OUT/examples" | wc -l | tr -d ' ') models)"

echo "done. serve with:  python3 -m http.server -d $OUT 8080"
