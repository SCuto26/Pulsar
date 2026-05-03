import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parse from '../src/parser.js'
import analyze from '../src/analyzer.js'
import optimize from '../src/optimizer.js'
import * as core from '../src/core.js'

// Run the full front-end and then optimize
const optimized = src => optimize(analyze(parse(src)))

// Helper to extract the initializer of the first variable declaration
const firstInit = src => optimized(src).statements[0].initializer

// Helper to get the first statement of the optimized program
const firstStmt = src => optimized(src).statements[0]

// Helper to count statements in the optimized program
const stmtCount = src => optimized(src).statements.length

describe('The optimizer', () => {

  // ── Constant folding: arithmetic ────────────────────────────────────────────
  it('folds addition of two constants',       () => assert.equal(firstInit('let x be 3 + 4'), 7))
  it('folds subtraction of two constants',    () => assert.equal(firstInit('let x be 10 - 3'), 7))
  it('folds multiplication of two constants', () => assert.equal(firstInit('let x be 3 * 4'), 12))
  it('folds division of two constants',       () => assert.equal(firstInit('let x be 10 / 2'), 5))
  it('folds modulo of two constants',         () => assert.equal(firstInit('let x be 10 % 3'), 1))
  it('folds nested arithmetic',               () => assert.equal(firstInit('let x be 2 + 3 * 4'), 14))

  // ── Constant folding: comparisons ───────────────────────────────────────────
  it('folds 3 is 3 to true',                  () => assert.equal(firstInit('let x be 3 is 3'), true))
  it('folds 3 is not 4 to true',              () => assert.equal(firstInit('let x be 3 is not 4'), true))
  it('folds 3 is 4 to false',                 () => assert.equal(firstInit('let x be 3 is 4'), false))

  // ── Constant folding: unary ─────────────────────────────────────────────────
  it('folds negation of a number',            () => assert.equal(firstInit('let x be -10'), -10))
  it('folds not true to false',               () => assert.equal(firstInit('let x be not true'), false))
  it('folds not false to true',               () => assert.equal(firstInit('let x be not false'), true))

  // ── Boolean short-circuits ──────────────────────────────────────────────────
  it('folds true and x to x',  () => {
    const result = optimized('let x be 5\nlet y be true and x')
    // true and x → x (the variable)
    assert.equal(result.statements[1].initializer.kind, 'Variable')
  })
  it('folds false and x to false', () => {
    const result = optimized('let x be 5\nlet y be false and x')
    assert.equal(result.statements[1].initializer, false)
  })
  it('folds x and true to x', () => {
    const result = optimized('let x be 5\nlet y be x and true')
    assert.equal(result.statements[1].initializer.kind, 'Variable')
  })
  it('folds false or x to x', () => {
    const result = optimized('let x be 5\nlet y be false or x')
    assert.equal(result.statements[1].initializer.kind, 'Variable')
  })
  it('folds true or x to true', () => {
    const result = optimized('let x be 5\nlet y be true or x')
    assert.equal(result.statements[1].initializer, true)
  })

  // ── Algebraic simplifications ───────────────────────────────────────────────
  it('simplifies x + 0 to x', () => {
    const result = optimized('let x be 5\nlet y be x + 0')
    assert.equal(result.statements[1].initializer.kind, 'Variable')
  })
  it('simplifies 0 + x to x', () => {
    const result = optimized('let x be 5\nlet y be 0 + x')
    assert.equal(result.statements[1].initializer.kind, 'Variable')
  })
  it('simplifies x - 0 to x', () => {
    const result = optimized('let x be 5\nlet y be x - 0')
    assert.equal(result.statements[1].initializer.kind, 'Variable')
  })
  it('simplifies x * 1 to x', () => {
    const result = optimized('let x be 5\nlet y be x * 1')
    assert.equal(result.statements[1].initializer.kind, 'Variable')
  })
  it('simplifies 1 * x to x', () => {
    const result = optimized('let x be 5\nlet y be 1 * x')
    assert.equal(result.statements[1].initializer.kind, 'Variable')
  })
  it('simplifies x / 1 to x', () => {
    const result = optimized('let x be 5\nlet y be x / 1')
    assert.equal(result.statements[1].initializer.kind, 'Variable')
  })
  it('simplifies x * 0 to 0', () => {
    const result = optimized('let x be 5\nlet y be x * 0')
    assert.equal(result.statements[1].initializer, 0)
  })
  it('simplifies 0 * x to 0', () => {
    const result = optimized('let x be 5\nlet y be 0 * x')
    assert.equal(result.statements[1].initializer, 0)
  })
  it('simplifies 0 / x to 0', () => {
    const result = optimized('let x be 5\nlet y be 0 / x')
    assert.equal(result.statements[1].initializer, 0)
  })

  // ── Dead code elimination: while-false ──────────────────────────────────────
  it('eliminates while false loop entirely', () => {
    // Only the var decl should remain; the loop disappears
    assert.equal(stmtCount('let x be 0\nas long as false { display x }'), 1)
  })

  // ── Dead code elimination: if-true / if-false ───────────────────────────────
  it('collapses short-if true to its body', () => {
    // if true { display x } → just the display statement
    const result = optimized('let x be 1\nif true { display x }')
    assert.equal(result.statements.length, 2)
    assert.equal(result.statements[1].kind, 'DisplayStatement')
  })
  it('eliminates short-if false entirely', () => {
    assert.equal(stmtCount('let x be 1\nif false { display x }'), 1)
  })
  it('collapses if-true/otherwise to consequent', () => {
    const result = optimized('let x be 1\nif true { display "yes" } otherwise { display "no" }')
    // The if-true collapses: only the var decl + the display "yes" remain
    assert.equal(result.statements.length, 2)
    assert.equal(result.statements[1].kind, 'DisplayStatement')
  })
  it('collapses if-false/otherwise to alternate', () => {
    const result = optimized('let x be 1\nif false { display "yes" } otherwise { display x }')
    assert.equal(result.statements.length, 2)
    assert.equal(result.statements[1].kind, 'DisplayStatement')
  })

  // ── Dead code elimination: self-assignment ──────────────────────────────────
  it('eliminates self-assignment x be x', () => {
    // let x be 5, x be x, display x → x be x removed
    const result = optimized('let x be 5\nx be x\ndisplay x')
    assert.equal(result.statements.length, 2)
    assert.equal(result.statements[0].kind, 'VariableDeclaration')
    assert.equal(result.statements[1].kind, 'DisplayStatement')
  })

  // ── Dead code elimination: foreach over empty list ──────────────────────────
  // Note: the optimizer can only elide a ForEachLoop when its collection node is
  // directly a ListExpression with no elements. After analysis the collection field
  // on ForEachLoop points to the Variable entity for 'items', not the ListExpression
  // itself — so the loop is not eliminated in this case. The optimization applies
  // when a list literal is used inline as the collection.
  it('preserves foreach when collection is a variable (cannot inspect at compile time)', () => {
    const result = optimized('let items be []\ngo through each item in items { display item }')
    // The loop remains because the collection is a Variable, not a bare ListExpression
    assert.equal(result.statements.length, 2)
    assert.equal(result.statements[1].kind, 'ForEachLoop')
  })

  // ── Optimization inside function bodies ─────────────────────────────────────
  it('folds constants inside a function body', () => {
    const result = optimized('define function: f() { display 2 + 3 }')
    const fn = result.statements[0]
    const display = fn.body[0]
    assert.equal(display.expression, 5)
  })

  // ── Optimization inside list and map literals ────────────────────────────────
  it('folds constants inside a list literal', () => {
    const result = optimized('let x be [1 + 1, 2 + 2]')
    const list = result.statements[0].initializer
    assert.equal(list.kind, 'ListExpression')
    assert.equal(list.elements[0], 2)
    assert.equal(list.elements[1], 4)
  })

  // ── Pass-through: non-optimizable constructs survive unchanged ───────────────
  it('passes through a variable reference unchanged', () => {
    const result = optimized('let x be 5\ndisplay x')
    assert.equal(result.statements[1].expression.kind, 'Variable')
  })
  it('passes through a non-constant binary expression unchanged', () => {
    const result = optimized('let x be 5\nlet y be x + 1')
    assert.equal(result.statements[1].initializer.kind, 'BinaryExpression')
  })
  it('passes through a while-true loop unchanged', () => {
    const result = optimized('let x be 1\nas long as x { display x }')
    assert.equal(result.statements[1].kind, 'WhileLoop')
  })
  it('passes through a group declaration unchanged', () => {
    const result = optimized('group Point: x, y')
    assert.equal(result.statements[0].kind, 'GroupDeclaration')
  })
  it('passes through a function declaration unchanged', () => {
    const result = optimized('define function: f(x) { output x }')
    assert.equal(result.statements[0].kind, 'FunctionDeclaration')
  })
})