// ── Pulsar ───────────────────────────────────────────────────────────────────
// parser.test.js
// Stefan Cutovic
// Test suite for the Pulsar parser: verifies valid syntax is accepted and invalid syntax is rejected.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parse from '../src/parser.js'

const syntaxChecks = [
  // Variable declarations with types
  ['number variable', 'let x as number be 5'],
  ['decimal number variable', 'let x as number be 3.14'],
  ['string variable', 'let name as string be "hello"'],
  ['boolean true variable', 'let flag as boolean be true'],
  ['boolean false variable', 'let flag as boolean be false'],
  [
    'list containing number variable',
    'let scores as list containing number be [1, 2, 3]',
  ],
  [
    'list containing string variable',
    'let names as list containing string be ["a", "b"]',
  ],
  [
    'list containing boolean variable',
    'let flags as list containing boolean be [true, false]',
  ],
  [
    'nested list type',
    'let matrix as list containing list containing number be []',
  ],
  [
    'map linking string to number',
    'let scores as map linking string to number be {"math" -> 95}',
  ],
  [
    'map linking string to string',
    'let labels as map linking string to string be {"a" -> "alpha"}',
  ],
  [
    'map linking string to boolean',
    'let flags as map linking string to boolean be {"active" -> true}',
  ],
  [
    'map as function param type',
    'define function: f(m as map linking string to number) outputs void { display m }',
  ],
  [
    'map as function return type',
    'define function: f() outputs map linking string to number { output {"x" -> 1} }',
  ],
  [
    'nested map in list',
    'let x as list containing map linking string to number be [{"a" -> 1}]',
  ],

  // Reassignment (no type annotation needed)
  ['reassignment', 'let x as number be 5\nx be 10'],

  // Arithmetic
  ['addition', 'let x as number be 1 + 2'],
  ['subtraction', 'let x as number be 5 - 3'],
  ['multiplication', 'let x as number be 4 * 3'],
  ['division', 'let x as number be 10 / 2'],
  ['modulo', 'let x as number be 10 % 3'],
  ['chained arithmetic', 'let x as number be 1 + 2 * 3 - 4'],
  ['parenthesized expression', 'let x as number be (1 + 2) * 3'],
  ['negation', 'let x as number be -5'],

  // Comparisons
  [
    'is greater than',
    'let x as number be 5\nlet y as boolean be x is greater than 3',
  ],
  [
    'is less than',
    'let x as number be 5\nlet y as boolean be x is less than 10',
  ],
  [
    'is greater than or equal to',
    'let x as number be 5\nlet y as boolean be x is greater than or equal to 5',
  ],
  [
    'is less than or equal to',
    'let x as number be 5\nlet y as boolean be x is less than or equal to 5',
  ],
  ['is equal', 'let x as number be 5\nlet y as boolean be x is 5'],
  ['is not equal', 'let x as number be 5\nlet y as boolean be x is not 3'],

  // Boolean operators
  ['boolean and', 'let x as boolean be true and false'],
  ['boolean or', 'let x as boolean be true or false'],
  ['boolean not', 'let x as boolean be not true'],

  // Display
  ['display string', 'display "hello"'],
  ['display number', 'display 42'],
  ['display variable', 'let x as number be 5\ndisplay x'],

  // If statements
  ['short if', 'let flag as boolean be true\nif flag { display flag }'],
  [
    'if otherwise',
    'let flag as boolean be true\nif flag { display "yes" } otherwise { display "no" }',
  ],

  // While loop
  ['while loop', 'let go as boolean be true\nas long as go { display go }'],
  ['while with stop', 'let go as boolean be true\nas long as go { stop }'],

  // ForEach loop
  [
    'foreach loop',
    'let items as list containing number be [1, 2]\ngo through each item in items { display item }',
  ],

  // Function declarations
  [
    'function no params void',
    'define function: greet() outputs void { display "hi" }',
  ],
  [
    'function one param',
    'define function: double(x as number) outputs number { output x * 2 }',
  ],
  [
    'function two params',
    'define function: add(x as number, y as number) outputs number { output x + y }',
  ],
  [
    'function returns string',
    'define function: label(n as number) outputs string { output "val" }',
  ],
  [
    'function returns boolean',
    'define function: isPos(n as number) outputs boolean { output n is greater than 0 }',
  ],
  [
    'function returns list',
    'define function: wrap(x as number) outputs list containing number { output [x] }',
  ],
  [
    'function call as statement',
    'define function: greet() outputs void { display "hi" }\ngreet()',
  ],
  [
    'function call in expression',
    'define function: f(x as number) outputs number { output x }\nlet y as number be f(5)',
  ],

  // Group declarations
  ['group one field', 'group Point: x as number'],
  ['group two fields', 'group Point: x as number, y as number'],
  [
    'group mixed types',
    'group Student: name as string, gpa as number, enrolled as boolean',
  ],

  // Collections
  ['empty list', 'let x as list containing number be []'],
  ['list containing numbers', 'let x as list containing number be [1, 2, 3]'],
  ['map literal', 'let m as list containing number be []\ndisplay m'],

  // Comments
  ['inline comment', 'let x as number be 5 // this is x'],
  ['comment on own line', '// a comment\nlet x as number be 5'],

  // Multiple statements
  [
    'multiple statements',
    'let x as number be 1\nlet y as number be 2\ndisplay x',
  ],

  // Nested structures
  [
    'if inside while',
    'let go as boolean be true\nas long as go { if go { stop } }',
  ],
  ['nested arithmetic parens', 'let x as number be (1 + 2) * (3 - 4)'],
]

const syntaxErrors = [
  ['missing as in var decl', 'let x number be 5', /Line 1/],
  ['missing type in var decl', 'let x as be 5', /Line 1/],
  ['missing be in var decl', 'let x as number 5', /Line 1/],
  ['missing outputs in func decl', 'define function: f() number {}', /Line 1/],
  ['missing type in param', 'define function: f(x) outputs void {}', /Line 1/],
  ['keyword as identifier', 'let let as number be 5', /Line 1/],
  [
    'missing block brace',
    'let go as boolean be true\nif go display "hi"',
    /Line 2/,
  ],
  ['unclosed string', 'let x as string be "hello', /Line 1/],
  ['number used as type name', 'let x as 5 be 5', /Line 1/],
  [
    'map missing linking keyword',
    'let x as map string to number be {}',
    /Line 1/,
  ],
  [
    'map missing to keyword',
    'let x as map linking string number be {}',
    /Line 1/,
  ],
]

describe('The parser', () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`matches ${scenario}`, () => {
      assert.ok(parse(source).succeeded())
    })
  }

  for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => parse(source), errorMessagePattern)
    })
  }
})
