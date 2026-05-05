// ── Pulsar ───────────────────────────────────────────────────────────────────
// analyzer.test.js
// Stefan Cutovic
// Test suite for the Pulsar analyzer: verifies static type checking, scope rules, and AST shape.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parse from '../src/parser.js'
import analyze from '../src/analyzer.js'
import * as core from '../src/core.js'

const check = src => analyze(parse(src))

const semanticChecks = [
  // Variable declarations
  ['number variable',                   'let x as number be 5'],
  ['string variable',                   'let name as string be "Stefan"'],
  ['boolean variable',                  'let flag as boolean be true'],
  ['list containing number variable',           'let scores as list containing number be [1, 2, 3]'],
  ['list containing string variable',           'let names as list containing string be ["a", "b"]'],
  ['variable used after declaration',   'let x as number be 5\ndisplay x'],
  ['reassignment same type',            'let x as number be 5\nx be 10'],
  ['reassignment with expression',      'let x as number be 5\nx be x + 1'],

  // Arithmetic
  ['number arithmetic',                 'let x as number be 2 + 3'],
  ['chained arithmetic',                'let x as number be 2 + 3 * 4'],
  ['negation',                          'let x as number be -5'],
  ['string concatenation',              'let s as string be "hello" + " world"'],

  // Boolean operations
  ['boolean and',                       'let x as boolean be true and false'],
  ['boolean or',                        'let x as boolean be false or true'],
  ['boolean not',                       'let x as boolean be not true'],

  // Comparisons
  ['number comparison gt',              'let x as number be 5\nlet y as boolean be x is greater than 3'],
  ['number comparison lt',              'let x as number be 5\nlet y as boolean be x is less than 10'],
  ['number equality',                   'let x as number be 5\nlet y as boolean be x is 5'],
  ['number inequality',                 'let x as number be 5\nlet y as boolean be x is not 3'],
  ['string equality',                   'let s as string be "hi"\nlet y as boolean be s is "hi"'],

  // Functions
  ['void function no params',           'define function: greet() outputs void { display "hi" }'],
  ['function returns number',           'define function: double(n as number) outputs number { output n * 2 }'],
  ['function returns string',           'define function: label() outputs string { output "ok" }'],
  ['function returns boolean',          'define function: yes() outputs boolean { output true }'],
  ['function two params',               'define function: add(x as number, y as number) outputs number { output x + y }'],
  ['function call as statement',        'define function: f() outputs void { display "x" }\nf()'],
  ['function call in expression',       'define function: f(x as number) outputs number { output x }\nlet y as number be f(5)'],
  ['function call with matching types', 'define function: f(s as string) outputs void { display s }\nf("hello")'],
  ['recursive function',                'define function: f(n as number) outputs number { output f(n) }'],

  // Groups
  ['group declaration',                 'group Point: x as number, y as number'],
  ['group mixed types',                 'group Student: name as string, gpa as number'],

  // If statements — test must be boolean
  ['short if with boolean var',         'let flag as boolean be true\nif flag { display "yes" }'],
  ['if otherwise with boolean',         'let flag as boolean be false\nif flag { display "yes" } otherwise { display "no" }'],
  ['if with boolean expression',        'let x as number be 5\nif x is greater than 3 { display x }'],

  // While loop — test must be boolean
  ['while with boolean var',            'let go as boolean be true\nas long as go { display "looping" }'],
  ['while with boolean expression',     'let x as number be 5\nas long as x is greater than 0 { display x }'],
  ['while with stop',                   'let go as boolean be true\nas long as go { stop }'],

  // ForEach
  ['foreach over list containing number',       'let nums as list containing number be [1,2]\ngo through each n in nums { display n }'],
  ['foreach over list containing string',       'let words as list containing string be ["a","b"]\ngo through each w in words { display w }'],
  ['foreach with stop',                 'let nums as list containing number be [1]\ngo through each n in nums { stop }'],

  // Scoping
  ['outer var in if body',              'let x as number be 5\nlet flag as boolean be true\nif flag { display x }'],
  ['outer var in while body',           'let x as number be 5\nlet go as boolean be true\nas long as go { display x }'],
  ['stop in if inside loop',            'let go as boolean be true\nas long as go { if go { stop } }'],
]

const semanticErrors = [
  // Type mismatch on declaration
  ['string assigned to number',         'let x as number be "hello"',                /Cannot assign/],
  ['number assigned to string',         'let s as string be 5',                      /Cannot assign/],
  ['number assigned to boolean',        'let b as boolean be 1',                     /Cannot assign/],
  ['boolean assigned to number',        'let x as number be true',                   /Cannot assign/],

  // Type mismatch on reassignment
  ['reassign wrong type',               'let x as number be 5\nx be "hello"',        /Cannot assign/],

  // Function return type mismatch
  ['return string from number fn',      'define function: f() outputs number { output "oops" }', /Cannot assign/],
  ['return number from string fn',      'define function: f() outputs string { output 42 }',     /Cannot assign/],
  ['return number from boolean fn',     'define function: f() outputs boolean { output 1 }',     /Cannot assign/],

  // Argument type mismatch
  ['string arg to number param',        'define function: f(x as number) outputs void { display x }\nf("bad")', /Cannot assign/],
  ['number arg to string param',        'define function: f(s as string) outputs void { display s }\nf(42)',    /Cannot assign/],
  ['boolean arg to number param',       'define function: f(x as number) outputs void { display x }\nf(true)', /Cannot assign/],

  // Argument count
  ['too many arguments',                'define function: f(x as number) outputs void { display x }\nf(1, 2)', /expects 1/],
  ['too few arguments',                 'define function: f(x as number) outputs void { display x }\nf()',     /expects 1/],
  ['args to void no-param fn',          'define function: f() outputs void { display "x" }\nf(1)',            /expects 0/],

  // Calling non-function
  ['call a variable',                   'let x as number be 5\nx(1)',                /'x' is not a function/],

  // Operator type errors
  ['and on numbers',                    'let x as number be 5\nlet y as boolean be x and true',       /Expected boolean/],
  ['or on number and boolean',          'let x as number be 1\nlet y as number be 2\nlet z as boolean be x or y', /Expected boolean/],
  ['not on number',                     'let x as number be 5\nlet y as boolean be not x',            /Expected boolean/],
  ['subtract strings',                  'let s as string be "a"\nlet t as string be "b"\nlet x as number be s - t', /Expected number/],
  ['compare number and string',         'let x as number be 5\nlet s as string be "hi"\nlet y as boolean be x is s', /Cannot compare/],

  // If/while test must be boolean
  ['if test is number',                 'let x as number be 5\nif x { display x }',                   /Expected boolean/],
  ['if test is string',                 'let s as string be "hi"\nif s { display s }',                /Expected boolean/],
  ['while test is number',              'let x as number be 1\nas long as x { display x }',           /Expected boolean/],

  // ForEach on non-list
  ['foreach on number',                 'let x as number be 5\ngo through each n in x { display n }', /Expected a list/],
  ['foreach on string',                 'let s as string be "hi"\ngo through each c in s { display c }', /Expected a list/],
  ['mixed map value types',               'let m as map linking string to number be {"a" -> 1, "b" -> "oops"}', /All map values must have the same type/],
  ['assign wrong map value type',         'let m as map linking string to number be {"a" -> "hello"}', /Cannot assign/],
  ['assign map to list variable',         'let m as list containing number be {"a" -> 1}', /Cannot assign/],

  // Scope errors
  ['undeclared variable',               'display x',                                 /has not been declared/],
  ['undeclared in expression',          'let x as number be y + 1',                  /has not been declared/],
  ['undeclared function call',          'foo()',                                      /has not been declared/],
  ['redeclared variable',               'let x as number be 5\nlet x as number be 10', /already declared/],
  ['redeclared function',               'define function: f() outputs void { display "a" }\ndefine function: f() outputs void { display "b" }', /already declared/],
  ['duplicate param names',             'define function: f(x as number, x as number) outputs void { display x }', /already declared/],

  // stop/output placement
  ['stop outside loop',                 'stop',                                      /'stop' can only appear inside a loop/],
  ['stop in function not in loop',      'define function: f() outputs void { stop }',  /'stop' can only appear inside a loop/],
  ['output outside function',           'output 5',                                  /'output' can only appear inside a function/],

  // Duplicate group fields
  ['duplicate group fields',            'group Bad: x as number, x as string',       /duplicate fields/],
]

describe('The analyzer', () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(check(source))
    })
  }

  for (const [scenario, source, pattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => check(source), pattern)
    })
  }

  // ── AST shape verification ─────────────────────────────────────────────────

  it('variable declaration carries declared type', () => {
    const prog = check('let x as number be 5')
    const decl = prog.statements[0]
    assert.equal(decl.kind, 'VariableDeclaration')
    assert.equal(decl.variable.type, core.NUMBER_TYPE)
    assert.equal(decl.variable.name, 'x')
  })

  it('function declaration carries return type and param types', () => {
    const prog = check('define function: add(x as number, y as number) outputs number { output x + y }')
    const fn = prog.statements[0]
    assert.equal(fn.kind, 'FunctionDeclaration')
    assert.equal(fn.returnType, core.NUMBER_TYPE)
    assert.equal(fn.params.length, 2)
    assert.equal(fn.params[0].type, core.NUMBER_TYPE)
    assert.equal(fn.params[1].type, core.NUMBER_TYPE)
  })

  it('group declaration carries typed fields', () => {
    const prog = check('group Student: name as string, gpa as number')
    const g = prog.statements[0]
    assert.equal(g.kind, 'GroupDeclaration')
    assert.equal(g.fields[0].name, 'name')
    assert.equal(g.fields[0].type, core.STRING_TYPE)
    assert.equal(g.fields[1].name, 'gpa')
    assert.equal(g.fields[1].type, core.NUMBER_TYPE)
  })

  it('binary expression carries result type', () => {
    const prog = check('let x as number be 3 + 4')
    const init = prog.statements[0].initializer
    assert.equal(init.kind, 'BinaryExpression')
    assert.equal(init.type, core.NUMBER_TYPE)
  })

  it('call node carries return type', () => {
    const prog = check('define function: f(x as number) outputs string { output "ok" }\nlet s as string be f(1)')
    const call = prog.statements[1].initializer
    assert.equal(call.kind, 'Call')
    assert.equal(call.type, core.STRING_TYPE)
  })

  it('list expression carries list type with correct base', () => {
    const prog = check('let scores as list containing number be [1, 2, 3]')
    const list = prog.statements[0].initializer
    assert.equal(list.kind, 'ListExpression')
    assert.equal(list.type.kind, 'ListType')
    assert.equal(list.type.baseType, core.NUMBER_TYPE)
  })

  it('map expression carries map type with correct key and value types', () => {
    const prog = check('let m as map linking string to number be {"score" -> 99}')
    const mapExp = prog.statements[0].initializer
    assert.equal(mapExp.kind, 'MapExpression')
    assert.equal(mapExp.type.kind, 'MapType')
    assert.equal(mapExp.type.keyType, core.STRING_TYPE)
    assert.equal(mapExp.type.valueType, core.NUMBER_TYPE)
  })

  it('foreach iterator variable has element type of collection', () => {
    const prog = check('let nums as list containing number be [1,2]\ngo through each n in nums { display n }')
    const loop = prog.statements[1]
    assert.equal(loop.kind, 'ForEachLoop')
    assert.equal(loop.iterator.type, core.NUMBER_TYPE)
  })
})