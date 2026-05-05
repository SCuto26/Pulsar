// ── Pulsar ───────────────────────────────────────────────────────────────────
// compiler.test.js
// Stefan Cutovic
// End-to-end test suite for the Pulsar compiler pipeline — verifies all four output types and error propagation.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import compile from '../src/compiler.js'

const sample = `
define function: double(n as number) outputs number {
  output n * 2
}
let x as number be double(5)
display x
`

describe('The compiler', () => {
  // Unknown output type
  it('throws when output type is missing', () =>
    assert.throws(() => compile(sample), /Unknown output type/))
  it('throws on unknown output type', () =>
    assert.throws(() => compile(sample, 'bad'), /Unknown output type/))
  it('throws on empty string output type', () =>
    assert.throws(() => compile(sample, ''), /Unknown output type/))

  // parsed
  it('parsed returns Syntax is ok', () =>
    assert.ok(compile(sample, 'parsed').startsWith('Syntax is ok')))
  it('parsed works for minimal program', () =>
    assert.ok(compile('display "hi"', 'parsed').startsWith('Syntax is ok')))

  // analyzed
  it('analyzed returns a Program node', () =>
    assert.equal(compile(sample, 'analyzed').kind, 'Program'))
  it('analyzed result has statements', () =>
    assert.ok(compile(sample, 'analyzed').statements.length > 0))
  it('analyzed carries type information', () => {
    const r = compile('let x as number be 5', 'analyzed')
    assert.equal(r.statements[0].variable.type, 'number')
  })

  // optimized
  it('optimized returns a Program node', () =>
    assert.equal(compile(sample, 'optimized').kind, 'Program'))
  it('optimized folds constants', () => {
    assert.equal(
      compile('let x as number be 3 + 4', 'optimized').statements[0]
        .initializer,
      7
    )
  })
  it('optimized eliminates while-false', () => {
    assert.equal(
      compile(
        'let x as number be 1\nas long as false { display x }',
        'optimized'
      ).statements.length,
      1
    )
  })

  // js
  it('js returns a string', () =>
    assert.equal(typeof compile(sample, 'js'), 'string'))
  it('js output contains function', () =>
    assert.ok(compile(sample, 'js').includes('function double_')))
  it('js output contains console.log', () =>
    assert.ok(compile(sample, 'js').includes('console.log')))
  it('js for display produces console.log', () =>
    assert.equal(
      compile('display "hello"', 'js').trim(),
      'console.log("hello");'
    ))
  it('js for folded expression', () =>
    assert.equal(
      compile('let x as number be 3 + 4', 'js').trim(),
      'let x_1 = 7;'
    ))
  it('js uses return for output', () =>
    assert.ok(
      compile(
        'define function: f(x as number) outputs number { output x }',
        'js'
      ).includes('return')
    ))
  it('js uses break for stop', () =>
    assert.ok(
      compile(
        'let go as boolean be true\nas long as go { stop }',
        'js'
      ).includes('break')
    ))
  it('js uses while for as-long-as', () =>
    assert.ok(
      compile(
        'let go as boolean be true\nas long as go { display go }',
        'js'
      ).includes('while')
    ))
  it('js uses for-of for foreach', () => {
    const out = compile(
      'let nums as list containing number be [1,2]\ngo through each n in nums { display n }',
      'js'
    )
    assert.ok(out.includes('for') && out.includes('of'))
  })
  it('js uses class for group', () => {
    const out = compile('group Student: name as string, gpa as number', 'js')
    assert.ok(out.includes('class Student_') && out.includes('constructor'))
  })

  // Error propagation
  it('throws syntax error on parsed', () =>
    assert.throws(() => compile('let let as number be 5', 'parsed'), /Line 1/))
  it('throws type mismatch on analyzed', () =>
    assert.throws(
      () => compile('let x as number be "oops"', 'analyzed'),
      /Cannot assign/
    ))
  it('throws undeclared on analyzed', () =>
    assert.throws(
      () => compile('display x', 'analyzed'),
      /has not been declared/
    ))
  it('throws stop outside loop', () =>
    assert.throws(() => compile('stop', 'analyzed'), /'stop' can only appear/))
  it('throws output outside function', () =>
    assert.throws(
      () => compile('output 5', 'analyzed'),
      /'output' can only appear/
    ))
  it('throws redeclared variable', () =>
    assert.throws(
      () => compile('let x as number be 5\nlet x as number be 10', 'analyzed'),
      /already declared/
    ))
  it('throws arg count mismatch', () =>
    assert.throws(
      () =>
        compile(
          'define function: f(x as number) outputs void { display x }\nf(1,2)',
          'analyzed'
        ),
      /expects 1/
    ))
  it('throws arg type mismatch', () =>
    assert.throws(
      () =>
        compile(
          'define function: f(x as number) outputs void { display x }\nf("bad")',
          'analyzed'
        ),
      /Cannot assign/
    ))
  it('throws call of non-function', () =>
    assert.throws(
      () => compile('let x as number be 5\nx()', 'analyzed'),
      /is not a function/
    ))
  it('throws duplicate group fields', () =>
    assert.throws(
      () => compile('group Bad: x as number, x as string', 'analyzed'),
      /duplicate fields/
    ))
})
