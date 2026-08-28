'use strict';

var assert = require('assert');
var amdLoader = require('../bin/amd-loader');

var declParser;

describe('declParser', function() {

  before(function() {
    return amdLoader.load(['src/common/declParser']).then(function(mods) {
      declParser = mods[0];
    });
  });

  function parse(code) {
    return declParser.parseDeclarations(code, 'test');
  }

  it('parses simple declarations with and without initializers', function() {
    var r = parse('int count;\nbool pressed{false};\nfloat gain = 1.5f;');
    assert.deepStrictEqual(r.opaque, []);
    assert.deepStrictEqual(r.variables.map(function(v) {
      return [v.name, v.type, v.kind, v.initial];
    }), [
      ['count', 'int', 'int', ''],
      ['pressed', 'bool', 'bool', 'false'],
      ['gain', 'float', 'float', '1.5f'],
    ]);
  });

  it('parses qualified and multi-word types', function() {
    var r = parse([
      'static const unsigned int limit = 10;',
      'std::string name{"idle"};',
      'uint32_t ticks{0};',
      'long long big;',
    ].join('\n'));
    assert.deepStrictEqual(r.opaque, []);
    assert.deepStrictEqual(r.variables.map(function(v) {
      return [v.name, v.kind];
    }), [
      ['limit', 'int'],
      ['name', 'string'],
      ['ticks', 'int'],
      ['big', 'int'],
    ]);
  });

  it('classifies unsupported types as other', function() {
    var r = parse('std::vector<int> samples;\nMyDriver driver;');
    assert.deepStrictEqual(r.variables.map(function(v) {
      return [v.name, v.kind];
    }), [['samples', 'other'], ['driver', 'other']]);
  });

  it('reports functions and multi-declarator statements as opaque', function() {
    var r = parse([
      'void setup();',
      'int helper() { return 1; }',
      'int a, b;',
      'bool ok{true};',
    ].join('\n'));
    assert.deepStrictEqual(r.variables.map(function(v) { return v.name; }),
                           ['ok']);
    assert.strictEqual(r.opaque.length, 3);
  });

  it('treats type / alias declarations as opaque, not variables', function() {
    // these declare types, not variables -- aliasing `_root->Counter`
    // would not compile
    var r = parse([
      'using Counter = int;',
      'typedef int Ticks;',
      'class Driver;',
      'struct Config;',
      'enum class Mode { A, B };',
      'int real = 1;',
    ].join('\n'));
    assert.deepStrictEqual(r.variables.map(function(v) { return v.name; }),
                           ['real']);
    assert.strictEqual(r.opaque.length, 5);
  });

  it('ignores comments', function() {
    var r = parse([
      '// leading comment with int fake;',
      'int real; /* trailing int alsoFake; */',
    ].join('\n'));
    assert.deepStrictEqual(r.variables.map(function(v) { return v.name; }),
                           ['real']);
    assert.deepStrictEqual(r.opaque, []);
  });

  it('handles empty and missing input', function() {
    assert.deepStrictEqual(parse('').variables, []);
    assert.deepStrictEqual(parse(null).variables, []);
    assert.deepStrictEqual(parse('   \n  ').variables, []);
  });

  it('finds referenced payload fields in guard expressions', function() {
    var fields = ['button_id', 'long_press'];
    assert.deepStrictEqual(
      declParser.referencedFields('data.button_id == 3', fields),
      ['button_id']);
    assert.deepStrictEqual(
      declParser.referencedFields('data . long_press && x', fields),
      ['long_press']);
    // bare field name (no data.) is not a payload reference
    assert.deepStrictEqual(
      declParser.referencedFields('button_id == 3', fields), []);
    // other_data.button_id is not the payload alias
    assert.deepStrictEqual(
      declParser.referencedFields('other_data.button_id', fields), []);
  });

  it('finds referenced identifiers in guard expressions', function() {
    var names = ['count', 'pressed', 'gain'];
    // `_root->count` is a member access, not a bare reference
    assert.deepStrictEqual(
      declParser.referencedNames('_root->count > 5 && !pressed', names),
      ['pressed']);
    assert.deepStrictEqual(
      declParser.referencedNames('count > 5 && gain < 2', names),
      ['count', 'gain']);
    assert.deepStrictEqual(
      declParser.referencedNames('recount > 5', names), []);
    assert.deepStrictEqual(declParser.referencedNames('', names), []);
  });

  it('excludes member and scoped accesses from bare references', function() {
    var names = ['count'];
    // reading a MEMBER named count is not reading the variable
    assert.deepStrictEqual(
      declParser.referencedNames('stats.count > 0', names), []);
    assert.deepStrictEqual(
      declParser.referencedNames('stats->count > 0', names), []);
    assert.deepStrictEqual(
      declParser.referencedNames('Foo::count > 0', names), []);
    assert.deepStrictEqual(
      declParser.referencedNames('stats . count > 0', names), []);
    // a bare use alongside a member use still counts
    assert.deepStrictEqual(
      declParser.referencedNames('stats.count > count', names), ['count']);
  });
});
