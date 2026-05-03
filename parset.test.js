import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parse from '../src/parser.js'

// Programs expected to be syntactically correct
const syntaxChecks = [
  // Variable declarations
  ['simple number declaration',       'let x be 5'],
  ['decimal number declaration',      'let x be 3.14'],
  ['string declaration',              'let name be "hello"'],
  ['boolean true declaration',        'let flag be true'],
  ['boolean false declaration',       'let flag be false'],
  ['negative number declaration',     'let x be -10'],

  // Reassignment
  ['reassignment',                    'let x be 5\nx be 10'],

  // Arithmetic expressions
  ['addition',                        'let x be 1 + 2'],
  ['subtraction',                     'let x be 5 - 3'],
  ['multiplication',                  'let x be 4 * 3'],
  ['division',                        'let x be 10 / 2'],
  ['modulo',                          'let x be 10 % 3'],
  ['chained arithmetic',              'let x be 1 + 2 * 3 - 4'],
  ['parenthesized expression',        'let x be (1 + 2) * 3'],

  // Comparisons
  ['is greater than',                 'let x be 5\nlet y be x is greater than 3'],
  ['is less than',                    'let x be 5\nlet y be x is less than 10'],
  ['is greater than or equal to',     'let x be 5\nlet y be x is greater than or equal to 5'],
  ['is less than or equal to',        'let x be 5\nlet y be x is less than or equal to 5'],
  ['is equal',                        'let x be 5\nlet y be x is 5'],
  ['is not equal',                    'let x be 5\nlet y be x is not 3'],

  // Boolean operators
  ['boolean and',                     'let x be true and false'],
  ['boolean or',                      'let x be true or false'],
  ['boolean not',                     'let x be not true'],
  ['chained and',                     'let x be true and false and true'],
  ['chained or',                      'let x be true or false or true'],

  // Display statement
  ['display a string',                'display "hello"'],
  ['display a number',                'display 42'],
  ['display a variable',              'let x be 5\ndisplay x'],
  ['display an expression',           'display 1 + 2'],

  // If statements
  ['short if',                        'let x be 5\nif x { display x }'],
  ['if otherwise',                    'let x be 5\nif x { display "yes" } otherwise { display "no" }'],
  ['if with complex test',            'let x be 5\nif x is greater than 3 { display x }'],

  // While loop
  ['while loop',                      'let x be 1\nas long as x { display x }'],
  ['while with stop',                 'let x be 1\nas long as x { stop }'],

  // ForEach loop
  ['foreach loop',                    'let items be 1\ngo through each item in items { display item }'],

  // Function declarations
  ['function no params',              'define function: greet() { display "hi" }'],
  ['function one param',              'define function: double(x) { output x }'],
  ['function two params',             'define function: add(x, y) { output x + y }'],
  ['function with output',            'define function: f(x) { output x * 2 }'],
  ['function call as statement',      'define function: greet() { display "hi" }\ngreet()'],
  ['function call in expression',     'define function: f(x) { output x }\nlet y be f(5)'],
  ['function call with multiple args','define function: add(x, y) { output x + y }\nlet z be add(3, 4)'],

  // Group declarations
  ['group declaration',               'group Point: x, y'],
  ['group with many fields',          'group Student: name, gpa, year, major'],

  // Collections
  ['empty list',                      'let x be []'],
  ['list of numbers',                 'let x be [1, 2, 3]'],
  ['list of strings',                 'let x be ["a", "b", "c"]'],
  ['map literal',                     'let m be {"key" -> "value"}'],
  ['map with multiple entries',       'let m be {"name" -> "Stefan", "gpa" -> 3.9}'],

  // Field access
  ['field access',                    'let x be 1\ndisplay x.field'],

  // Multiple statements
  ['multiple statements',             'let x be 1\nlet y be 2\ndisplay x\ndisplay y'],

  // Comments
  ['inline comment',                  'let x be 5 // this is x'],
  ['comment on its own line',         '// a comment\nlet x be 5'],

  // Nested structures
  ['if inside while',                 'let x be 1\nas long as x { if x { stop } }'],
  ['while inside function',           'define function: f(x) { as long as x { display x } }'],
  ['nested arithmetic',               'let x be (1 + 2) * (3 - 4)'],
]

// Programs with syntax errors the parser should detect
const syntaxErrors = [
  ['missing be in var decl',          'let x 5',                  /Line 1/],
  ['missing value in var decl',       'let x be',                 /Line 1/],
  ['keyword as identifier',           'let let be 5',             /Line 1/],
  ['missing block brace',             'if true display "hi"',     /Line 1/],
  ['unclosed string',                 'let x be "hello',          /Line 1/],
  ['missing function colon',          'define function greet() {}',/Line 1/],
  ['missing closing paren in call',   'define function: f(x) { output x }\nf(5',  /Line 2/],
  ['stop keyword as identifier',      'let stop be 5',            /Line 1/],
  ['output keyword as identifier',    'let output be 5',          /Line 1/],
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