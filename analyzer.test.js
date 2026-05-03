import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parse from '../src/parser.js'
import analyze from '../src/analyzer.js'
import * as core from '../src/core.js'

// Convenience: run the full front-end pipeline on a source string
const check = src => analyze(parse(src))

// Programs expected to be semantically correct
const semanticChecks = [
  // Variable declarations and usage
  ['number variable',                 'let x be 5'],
  ['string variable',                 'let name be "hello"'],
  ['boolean variable',                'let flag be true'],
  ['variable used after declaration', 'let x be 5\ndisplay x'],
  ['reassignment',                    'let x be 5\nx be 10'],
  ['reassignment to expression',      'let x be 5\nx be x + 1'],
  ['multiple variables',              'let x be 1\nlet y be 2\nlet z be x + y'],

  // Arithmetic
  ['addition of variables',           'let x be 1\nlet y be 2\nlet z be x + y'],
  ['chained arithmetic',              'let x be 2 + 3 * 4 - 1'],
  ['parenthesized arithmetic',        'let x be (2 + 3) * 4'],
  ['negation',                        'let x be -5'],

  // Boolean expressions
  ['boolean and',                     'let x be true and false'],
  ['boolean or',                      'let x be false or true'],
  ['boolean not',                     'let x be not true'],
  ['chained boolean',                 'let x be true and false or true'],

  // Comparisons
  ['is greater than',                 'let x be 5\nlet y be x is greater than 3'],
  ['is less than',                    'let x be 5\nlet y be x is less than 10'],
  ['is equal',                        'let x be 5\nlet y be x is 5'],
  ['is not equal',                    'let x be 5\nlet y be x is not 3'],
  ['gte',                             'let x be 5\nlet y be x is greater than or equal to 5'],
  ['lte',                             'let x be 5\nlet y be x is less than or equal to 5'],

  // Display
  ['display string literal',          'display "hello"'],
  ['display number literal',          'display 42'],
  ['display variable',                'let x be 5\ndisplay x'],
  ['display expression',              'let x be 5\ndisplay x + 1'],

  // Functions
  ['function no params',              'define function: greet() { display "hi" }'],
  ['function with param',             'define function: double(x) { output x * 2 }'],
  ['function with two params',        'define function: add(x, y) { output x + y }'],
  ['function call as statement',      'define function: f() { display "hi" }\nf()'],
  ['function call in expression',     'define function: f(x) { output x }\nlet y be f(5)'],
  ['output inside function',          'define function: f(x) { output x }'],
  ['function using its own param',    'define function: sq(n) { output n * n }'],
  ['function call with multiple args','define function: add(x, y) { output x + y }\nlet z be add(3, 4)'],
  ['call result in expression',       'define function: f(x) { output x + 1 }\nlet y be f(3) + 1'],

  // Recursion: function can call itself (placeholder added before body is analyzed)
  ['recursive function reference',    'define function: f(x) { display f }\nf(1)'],

  // Groups
  ['group declaration',               'group Point: x, y'],
  ['group with many fields',          'group Student: name, gpa, year'],

  // If statements
  ['short if',                        'let x be 5\nif x { display x }'],
  ['if otherwise',                    'let x be 5\nif x { display "yes" } otherwise { display "no" }'],
  ['if with variable in test',        'let x be 1\nif x { display "ok" }'],
  ['nested if',                       'let x be 1\nif x { if x { display x } }'],

  // While loop
  ['while loop',                      'let x be 1\nas long as x { display x }'],
  ['while with stop',                 'let x be 1\nas long as x { stop }'],
  ['while loop using outer var',      'let x be 1\nas long as x { display x }'],

  // Stop inside nested if inside loop
  ['stop in if inside loop',          'let x be 1\nas long as x { if x { stop } }'],

  // ForEach loop
  ['foreach loop',                    'let items be 1\ngo through each item in items { display item }'],
  ['foreach with stop',               'let items be 1\ngo through each item in items { stop }'],

  // Collections
  ['list literal',                    'let x be [1, 2, 3]'],
  ['empty list',                      'let x be []'],
  ['map literal',                     'let m be {"name" -> "Stefan"}'],
  ['map multiple entries',            'let m be {"a" -> 1, "b" -> 2}'],

  // Scoping: variables declared in outer scope available inside blocks
  ['outer var accessible in if',      'let x be 5\nif x { display x }'],
  ['outer var accessible in while',   'let x be 1\nas long as x { let y be x\ndisplay y }'],
]

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  ['undeclared variable in expression',   'let x be y + 1',                   /has not been declared/],
  ['undeclared variable in display',      'display x',                         /has not been declared/],
  ['undeclared variable assignment',      'x be 10',                           /has not been declared/],
  ['undeclared call',                     'foo()',                              /has not been declared/],
  ['undeclared in if test',               'if x { display "hi" }',             /has not been declared/],
  ['undeclared collection in foreach',    'go through each x in items { display x }', /has not been declared/],
  ['redeclared variable',                 'let x be 5\nlet x be 10',           /already declared/],
  ['redeclared function',                 'define function: f() { display "a" }\ndefine function: f() { display "b" }', /already declared/],
  ['redeclared param',                    'define function: f(x, x) { output x }', /already declared/],
  ['stop outside loop',                   'stop',                              /'stop' can only appear inside a loop/],
  ['stop outside loop in function',       'define function: f() { stop }',     /'stop' can only appear inside a loop/],
  ['output outside function',             'output 5',                          /'output' can only appear inside a function/],
  ['output at top level',                 'let x be 5\noutput x',              /'output' can only appear inside a function/],
  ['field on undeclared variable',        'display x.name',                    /has not been declared/],
  // Field validation fires when the object entity is directly a GroupDeclaration.
  // Accessing through a Variable does not trigger compile-time field checks.
  ['nonexistent field on group directly',  'group Point: x, y\ndisplay Point.z', /has no field/],
]

describe('The analyzer', () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(check(source))
    })
  }

  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => check(source), errorMessagePattern)
    })
  }

  // Verify the exact shape of the AST for a simple program
  it('produces the expected representation for a variable declaration', () => {
    const program = check('let x be 5')
    assert.equal(program.kind, 'Program')
    assert.equal(program.statements.length, 1)
    const decl = program.statements[0]
    assert.equal(decl.kind, 'VariableDeclaration')
    assert.equal(decl.variable.kind, 'Variable')
    assert.equal(decl.variable.name, 'x')
    assert.equal(Number(decl.initializer), 5)
  })

  it('produces the expected representation for a display statement', () => {
    const program = check('display "hello"')
    assert.equal(program.statements[0].kind, 'DisplayStatement')
  })

  it('produces the expected representation for a function declaration', () => {
    const program = check('define function: add(x, y) { output x + y }')
    const fn = program.statements[0]
    assert.equal(fn.kind, 'FunctionDeclaration')
    assert.equal(fn.name, 'add')
    assert.equal(fn.params.length, 2)
    assert.equal(fn.params[0].name, 'x')
    assert.equal(fn.params[1].name, 'y')
    assert.equal(fn.body.length, 1)
    assert.equal(fn.body[0].kind, 'OutputStatement')
  })

  it('produces the expected representation for a binary expression', () => {
    const program = check('let x be 3 + 4')
    const init = program.statements[0].initializer
    assert.equal(init.kind, 'BinaryExpression')
    assert.equal(init.op, '+')
    assert.equal(Number(init.left), 3)
    assert.equal(Number(init.right), 4)
  })

  it('produces the expected representation for an if/otherwise statement', () => {
    const program = check('let x be 1\nif x { display "yes" } otherwise { display "no" }')
    const stmt = program.statements[1]
    assert.equal(stmt.kind, 'IfStatement')
    assert.equal(stmt.consequent.length, 1)
    assert.equal(stmt.alternate.length, 1)
  })

  it('produces the expected representation for a while loop', () => {
    const program = check('let x be 1\nas long as x { display x }')
    const loop = program.statements[1]
    assert.equal(loop.kind, 'WhileLoop')
    assert.equal(loop.body.length, 1)
  })

  it('produces the expected representation for a foreach loop', () => {
    const program = check('let items be 1\ngo through each item in items { display item }')
    const loop = program.statements[1]
    assert.equal(loop.kind, 'ForEachLoop')
    assert.equal(loop.iterator.name, 'item')
  })

  it('produces the expected representation for a group declaration', () => {
    const program = check('group Student: name, gpa')
    const g = program.statements[0]
    assert.equal(g.kind, 'GroupDeclaration')
    assert.equal(g.name, 'Student')
    assert.deepEqual(g.fields, ['name', 'gpa'])
  })
})