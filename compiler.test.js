import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import compile from '../src/compiler.js'

// A simple but non-trivial Pulsar program used across several tests
const sampleProgram = `
define function: double(n) {
  output n * 2
}
let x be double(5)
display x
`

describe('The compiler', () => {

  // ── Unknown output type ──────────────────────────────────────────────────
  it('throws when the output type is missing', () => {
    assert.throws(() => compile(sampleProgram), /Unknown output type/)
  })

  it('throws when the output type is unknown', () => {
    assert.throws(() => compile(sampleProgram, 'no such type'), /Unknown output type/)
  })

  it('throws when the output type is empty string', () => {
    assert.throws(() => compile(sampleProgram, ''), /Unknown output type/)
  })

  // ── "parsed" output type ─────────────────────────────────────────────────
  it('accepts the parsed option', () => {
    const result = compile(sampleProgram, 'parsed')
    assert.ok(result.startsWith('Syntax is ok'))
  })

  it('parsed returns a string', () => {
    assert.equal(typeof compile(sampleProgram, 'parsed'), 'string')
  })

  it('parsed works for the simplest possible program', () => {
    assert.ok(compile('display "hello"', 'parsed').startsWith('Syntax is ok'))
  })

  // ── "analyzed" output type ───────────────────────────────────────────────
  it('accepts the analyzed option', () => {
    const result = compile(sampleProgram, 'analyzed')
    assert.equal(result.kind, 'Program')
  })

  it('analyzed returns a Program node with statements', () => {
    const result = compile(sampleProgram, 'analyzed')
    assert.ok(Array.isArray(result.statements))
    assert.ok(result.statements.length > 0)
  })

  it('analyzed result contains a FunctionDeclaration', () => {
    const result = compile(sampleProgram, 'analyzed')
    assert.equal(result.statements[0].kind, 'FunctionDeclaration')
  })

  // ── "optimized" output type ──────────────────────────────────────────────
  it('accepts the optimized option', () => {
    const result = compile(sampleProgram, 'optimized')
    assert.equal(result.kind, 'Program')
  })

  it('optimized applies constant folding', () => {
    const result = compile('let x be 3 + 4', 'optimized')
    assert.equal(result.statements[0].initializer, 7)
  })

  it('optimized eliminates while-false', () => {
    const result = compile('let x be 0\nas long as false { display x }', 'optimized')
    assert.equal(result.statements.length, 1)
  })

  // ── "js" output type ─────────────────────────────────────────────────────
  it('accepts the js option', () => {
    const result = compile(sampleProgram, 'js')
    assert.equal(typeof result, 'string')
  })

  it('js output contains a function declaration', () => {
    const result = compile(sampleProgram, 'js')
    assert.ok(result.includes('function double_'))
  })

  it('js output contains console.log', () => {
    const result = compile(sampleProgram, 'js')
    assert.ok(result.includes('console.log'))
  })

  it('generates js for a simple display', () => {
    const result = compile('display "hello world"', 'js')
    assert.equal(result.trim(), 'console.log("hello world");')
  })

  it('generates js for a constant-folded expression', () => {
    const result = compile('let x be 3 + 4', 'js')
    assert.equal(result.trim(), 'let x_1 = 7;')
  })

  it('generates js with break for stop', () => {
    const result = compile('let x be 1\nas long as x { stop }', 'js')
    assert.ok(result.includes('break;'))
  })

  it('generates js with return for output', () => {
    const result = compile('define function: f(x) { output x }', 'js')
    assert.ok(result.includes('return'))
  })

  it('generates js with while for as-long-as', () => {
    const result = compile('let x be 1\nas long as x { display x }', 'js')
    assert.ok(result.includes('while'))
  })

  it('generates js with for-of for foreach', () => {
    const result = compile('let items be [1, 2]\ngo through each item in items { display item }', 'js')
    assert.ok(result.includes('for') && result.includes('of'))
  })

  it('generates js class for group declaration', () => {
    const result = compile('group Student: name, gpa', 'js')
    assert.ok(result.includes('class Student_'))
    assert.ok(result.includes('constructor'))
  })

  // ── Error propagation ────────────────────────────────────────────────────
  it('throws a syntax error for invalid source on parsed', () => {
    assert.throws(() => compile('let let let', 'parsed'), /Line 1/)
  })

  it('throws a syntax error for invalid source on analyzed', () => {
    assert.throws(() => compile('let let let', 'analyzed'), /Line 1/)
  })

  it('throws a semantic error for undeclared variable', () => {
    assert.throws(() => compile('display x', 'analyzed'), /has not been declared/)
  })

  it('throws a semantic error for stop outside loop', () => {
    assert.throws(() => compile('stop', 'analyzed'), /'stop' can only appear inside a loop/)
  })

  it('throws a semantic error for output outside function', () => {
    assert.throws(() => compile('output 5', 'analyzed'), /'output' can only appear inside a function/)
  })

  it('throws a semantic error for redeclared variable', () => {
    assert.throws(() => compile('let x be 5\nlet x be 10', 'analyzed'), /already declared/)
  })
})