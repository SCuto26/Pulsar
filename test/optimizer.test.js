import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parse from '../src/parser.js'
import analyze from '../src/analyzer.js'
import optimize from '../src/optimizer.js'
import * as core from '../src/core.js'

const optimized = src => optimize(analyze(parse(src)))
const firstInit = src => optimized(src).statements[0].initializer
const stmtCount = src => optimized(src).statements.length

function unbox(v) {
  if (v instanceof Boolean) return v.valueOf()
  if (v instanceof Number) return v.valueOf()
  return v
}

describe('The optimizer', () => {
  // Constant folding
  it('folds 3 + 4 to 7', () => assert.equal(firstInit('let x as number be 3 + 4'), 7))
  it('folds 10 - 3 to 7', () => assert.equal(firstInit('let x as number be 10 - 3'), 7))
  it('folds 3 * 4 to 12', () => assert.equal(firstInit('let x as number be 3 * 4'), 12))
  it('folds 10 / 2 to 5', () => assert.equal(firstInit('let x as number be 10 / 2'), 5))
  it('folds 10 % 3 to 1', () => assert.equal(firstInit('let x as number be 10 % 3'), 1))
  it('folds -10 to -10', () => assert.equal(firstInit('let x as number be -10'), -10))
  it('folds not true to false', () => assert.equal(firstInit('let x as boolean be not true'), false))
  it('folds not false to true', () => assert.equal(firstInit('let x as boolean be not false'), true))
  it('folds 3 is 3 to true', () => assert.equal(firstInit('let x as boolean be 3 is 3'), true))
  it('folds 3 is 4 to false', () => assert.equal(firstInit('let x as boolean be 3 is 4'), false))
  it('folds 3 is not 4 to true', () => assert.equal(firstInit('let x as boolean be 3 is not 4'), true))
  it('folds 5 is greater than 3 to true', () => assert.equal(firstInit('let x as boolean be 5 is greater than 3'), true))

  // Boolean short-circuits
  it('folds false and x to false', () => {
    const r = optimized('let x as boolean be true\nlet y as boolean be false and x')
    assert.equal(unbox(r.statements[1].initializer), false)
  })
  it('folds x and true to x', () => {
    const r = optimized('let x as boolean be true\nlet y as boolean be x and true')
    assert.equal(r.statements[1].initializer.kind, 'Variable')
  })
  it('folds true or x to true', () => {
    const r = optimized('let x as boolean be true\nlet y as boolean be true or x')
    assert.equal(unbox(r.statements[1].initializer), true)
  })
  it('folds false or x to x', () => {
    const r = optimized('let x as boolean be true\nlet y as boolean be false or x')
    assert.equal(r.statements[1].initializer.kind, 'Variable')
  })

  // Algebraic simplifications
  it('simplifies x + 0 to x', () => {
    assert.equal(optimized('let x as number be 5\nlet y as number be x + 0').statements[1].initializer.kind, 'Variable')
  })
  it('simplifies 0 + x to x', () => {
    assert.equal(optimized('let x as number be 5\nlet y as number be 0 + x').statements[1].initializer.kind, 'Variable')
  })
  it('simplifies x - 0 to x', () => {
    assert.equal(optimized('let x as number be 5\nlet y as number be x - 0').statements[1].initializer.kind, 'Variable')
  })
  it('simplifies x * 1 to x', () => {
    assert.equal(optimized('let x as number be 5\nlet y as number be x * 1').statements[1].initializer.kind, 'Variable')
  })
  it('simplifies 1 * x to x', () => {
    assert.equal(optimized('let x as number be 5\nlet y as number be 1 * x').statements[1].initializer.kind, 'Variable')
  })
  it('simplifies x / 1 to x', () => {
    assert.equal(optimized('let x as number be 5\nlet y as number be x / 1').statements[1].initializer.kind, 'Variable')
  })
  it('simplifies x * 0 to 0', () => {
    assert.equal(optimized('let x as number be 5\nlet y as number be x * 0').statements[1].initializer, 0)
  })
  it('simplifies 0 * x to 0', () => {
    assert.equal(optimized('let x as number be 5\nlet y as number be 0 * x').statements[1].initializer, 0)
  })

  // Dead code elimination
  it('eliminates while-false entirely', () => {
    assert.equal(stmtCount('let x as number be 1\nas long as false { display x }'), 1)
  })
  it('collapses short-if-true to body', () => {
    const r = optimized('let x as number be 1\nif true { display x }')
    assert.equal(r.statements.length, 2)
    assert.equal(r.statements[1].kind, 'DisplayStatement')
  })
  it('eliminates short-if-false', () => {
    assert.equal(stmtCount('let x as number be 1\nif false { display x }'), 1)
  })
  it('collapses if-true/otherwise to consequent', () => {
    const r = optimized('let x as number be 1\nif true { display "yes" } otherwise { display "no" }')
    assert.equal(r.statements.length, 2)
    assert.equal(r.statements[1].kind, 'DisplayStatement')
  })
  it('collapses if-false/otherwise to alternate', () => {
    const r = optimized('let x as number be 1\nif false { display "yes" } otherwise { display x }')
    assert.equal(r.statements.length, 2)
    assert.equal(r.statements[1].kind, 'DisplayStatement')
  })
  it('eliminates self-assignment', () => {
    const r = optimized('let x as number be 5\nx be x\ndisplay x')
    assert.equal(r.statements.length, 2)
    assert.equal(r.statements[0].kind, 'VariableDeclaration')
    assert.equal(r.statements[1].kind, 'DisplayStatement')
  })

  // Optimization inside function bodies
  it('folds constants inside function body', () => {
    const r = optimized('define function: f() outputs number { output 2 + 3 }')
    assert.equal(r.statements[0].body[0].expression, 5)
  })

  // Pass-through
  it('passes through non-constant binary expression', () => {
    const r = optimized('let x as number be 5\nlet y as number be x + 1')
    assert.equal(r.statements[1].initializer.kind, 'BinaryExpression')
  })
  it('passes through a while-true loop', () => {
    const r = optimized('let go as boolean be true\nas long as go { display "x" }')
    assert.equal(r.statements[1].kind, 'WhileLoop')
  })
  it('passes through a function declaration', () => {
    const r = optimized('define function: f(x as number) outputs number { output x }')
    assert.equal(r.statements[0].kind, 'FunctionDeclaration')
  })
  it('passes through a group declaration', () => {
    const r = optimized('group Point: x as number, y as number')
    assert.equal(r.statements[0].kind, 'GroupDeclaration')
  })
  it('passes through a map expression unchanged', () => {
    const r = optimized('let m as map linking string to number be {"x" -> 1}')
    assert.equal(r.statements[0].initializer.kind, 'MapExpression')
  })
})