#!/usr/bin/env bash
#
# Compile and exercise the committed golden generated code.
#
# For each fixture under test/goldens/<name>/:
#   1. compile the generated C++ (plain and DEBUG) with -Wall -Wextra
#      -Werror -- generated code must be warning-clean
#   2. compile again with Address + UB sanitizers
#   3. run the DEBUG+sanitized test bench with the scripted event
#      sequence from test/traces/<name>.input
#   4. normalize the output (strip ANSI colors and menu noise) and
#      diff against test/traces/<name>.expected
#
# To update trace expectations after an intentional behavior change:
#   UPDATE_TRACES=1 scripts/run_generated_tests.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GOLDEN_DIR="$REPO_ROOT/test/goldens"
TRACE_DIR="$REPO_ROOT/test/traces"
BUILD_DIR="${BUILD_DIR:-$REPO_ROOT/build/generated-tests}"
CXX="${CXX:-g++}"
CXXFLAGS="-std=c++17 -Wall -Wextra -Werror -pthread"
SANFLAGS="-fsanitize=address,undefined -fno-sanitize-recover=all -g -O1"

normalize() {
  # strip ANSI escapes; drop menu lines, prompts, and blank lines
  sed -e $'s/\033\[[0-9;]*m//g' \
      -e 's/^selection: //' \
    | grep -v -e '^[[:space:]]*$' -e '^-----$' -e '^Select which' -e $'^\t'
}

status=0
for golden in "$GOLDEN_DIR"/*/; do
  name="$(basename "$golden")"
  echo "=== fixture: $name ==="
  build="$BUILD_DIR/$name"
  rm -rf "$build"
  mkdir -p "$build"
  cp "$golden"/*.hpp "$golden"/*.cpp "$build"/

  srcs=("$build"/*_test.cpp "$build"/*_generated_states.cpp)

  echo "--- compiling (release, -Werror)"
  "$CXX" $CXXFLAGS -O2 -o "$build/${name}_test" "${srcs[@]}"

  echo "--- compiling (debug + sanitizers)"
  "$CXX" $CXXFLAGS $SANFLAGS -DDEBUG_OUTPUT=1 \
         -o "$build/${name}_test_debug" "${srcs[@]}"

  input="$TRACE_DIR/$name.input"
  expected="$TRACE_DIR/$name.expected"
  if [ ! -f "$input" ]; then
    echo "--- no trace input for $name; skipping runtime check"
    continue
  fi

  echo "--- running scripted event sequence"
  actual="$build/${name}.trace"
  # portable hang guard (same as CI's samples job): a regression in
  # EOF handling or event draining must fail fast, not hang the job
  perl -e 'alarm shift; exec @ARGV' 60 "$build/${name}_test_debug" \
    < "$input" | normalize > "$actual"

  if [ -n "${UPDATE_TRACES:-}" ]; then
    mkdir -p "$TRACE_DIR"
    cp "$actual" "$expected"
    echo "--- updated $expected"
  elif ! diff -u "$expected" "$actual"; then
    echo "!!! trace mismatch for $name"
    status=1
  else
    echo "--- trace matches"
  fi
done

if [ "$status" -eq 0 ]; then
  echo "=== all generated-code tests passed"
fi
exit $status
