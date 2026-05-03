// optimizer.js
// Transforms the analyzed AST to improve the program before code generation.
// Performs constant folding, algebraic simplification, and dead code elimination.
//
// Follows the Carlos optimizer architecture from CMSI 3802 course notes,
// adapted for Pulsar's AST node kinds and keyword set.
//
// Optimizations applied:
//   - Constant folding for binary arithmetic and comparisons
//   - Algebraic simplifications (+0, -0, *1, /1, *0, **0, 0*, 0/, 0+, 0-)
//   - Boolean short-circuits (true and x → x, false or x → x, etc.)
//   - Unary constant folding (-number, not boolean)
//   - Dead code elimination: while-false, if-true, if-false, short-if-true/false
//   - Self-assignment elimination (x be x → no-op)

import * as core from './core.js'

export default function optimize(node) {
  return optimizers?.[node?.kind]?.(node) ?? node
}

// ── Unboxing helper ───────────────────────────────────────────────────────────
// The analyzer wraps literals with Object.assign(primitive, { type }) which
// produces boxed Number/Boolean objects. We unbox them to primitives here so
// that constant folding comparisons (=== 0, === true, etc.) work correctly.
function unbox(v) {
  if (v instanceof Number) return v.valueOf()
  if (v instanceof Boolean) return v.valueOf()
  if (v instanceof String) return v.valueOf()
  return v
}

// ── Numeric helpers ───────────────────────────────────────────────────────────

const isZero = n => n === 0
const isOne = n => n === 1

// ── Optimizer dispatch table ──────────────────────────────────────────────────

const optimizers = {

  // ── Program ────────────────────────────────────────────────────────────────
  Program(p) {
    p.statements = p.statements.flatMap(optimize)
    return p
  },

  // ── Declarations ──────────────────────────────────────────────────────────

  VariableDeclaration(d) {
    d.variable = optimize(d.variable)
    d.initializer = optimize(d.initializer)
    return d
  },

  FunctionDeclaration(d) {
    d.params = d.params.map(optimize)
    d.body = d.body.flatMap(optimize)
    return d
  },

  GroupDeclaration(d) {
    // Nothing to optimize: fields are just names
    return d
  },

  // ── Statements ─────────────────────────────────────────────────────────────

  Assignment(s) {
    s.source = optimize(s.source)
    s.target = optimize(s.target)
    // x be x → no-op: eliminate self-assignments
    if (s.source?.kind === 'Variable' && s.target?.kind === 'Variable') {
      if (s.source.name === s.target.name) return []
    }
    return s
  },

  DisplayStatement(s) {
    s.expression = optimize(s.expression)
    return s
  },

  OutputStatement(s) {
    s.expression = optimize(s.expression)
    return s
  },

  StopStatement(s) {
    return s
  },

  // if test { ... } otherwise { ... }
  IfStatement(s) {
    s.test = optimize(s.test)
    s.consequent = s.consequent.flatMap(optimize)
    s.alternate = s.alternate.flatMap(optimize)
    const test = unbox(s.test)
    if (test === true) return s.consequent
    if (test === false) return s.alternate
    return s
  },

  // if test { ... }  (no otherwise)
  ShortIfStatement(s) {
    s.test = optimize(s.test)
    s.consequent = s.consequent.flatMap(optimize)
    const test = unbox(s.test)
    if (test === true) return s.consequent
    if (test === false) return []
    return s
  },

  // as long as test { ... }
  WhileLoop(s) {
    s.test = optimize(s.test)
    // while false is a no-op
    if (unbox(s.test) === false) return []
    s.body = s.body.flatMap(optimize)
    return s
  },

  // go through each item in collection { ... }
  ForEachLoop(s) {
    s.iterator = optimize(s.iterator)
    s.collection = optimize(s.collection)
    s.body = s.body.flatMap(optimize)
    // Loop over an empty list literal → no-op
    if (s.collection?.kind === 'ListExpression' && s.collection.elements.length === 0) {
      return []
    }
    return s
  },

  // ── Expressions ────────────────────────────────────────────────────────────

  BinaryExpression(e) {
    e.left = optimize(e.left)
    e.right = optimize(e.right)

    const L = unbox(e.left)
    const R = unbox(e.right)
    const op = e.op

    // ── Boolean short-circuits ──────────────────────────────────────────────
    if (op === 'and') {
      if (L === true) return R
      if (R === true) return L
      if (L === false) return false
      if (R === false) return false
    }
    if (op === 'or') {
      if (L === false) return R
      if (R === false) return L
      if (L === true) return true
      if (R === true) return true
    }

    // ── Numeric constant folding ────────────────────────────────────────────
    if (typeof L === 'number' && typeof R === 'number') {
      if (op === '+') return L + R
      if (op === '-') return L - R
      if (op === '*') return L * R
      if (op === '/') return L / R
      if (op === '%') return L % R
      if (op === '<') return L < R
      if (op === '<=') return L <= R
      if (op === '>') return L > R
      if (op === '>=') return L >= R
      if (op === '==') return L === R
      if (op === '!=') return L !== R
    }

    // ── String constant folding ─────────────────────────────────────────────
    if (typeof L === 'string' && typeof R === 'string') {
      if (op === '+') return L.slice(0, -1) + R.slice(1) // join without duplicate quotes
      if (op === '==') return L === R
      if (op === '!=') return L !== R
    }

    // ── Algebraic simplifications (left operand is a known constant) ────────
    if (typeof L === 'number') {
      if (isZero(L) && op === '+') return R
      if (isZero(L) && op === '-') return core.unary('-', R)
      if (isOne(L) && op === '*') return R
      if (isZero(L) && op === '*') return 0
      if (isZero(L) && op === '/') return 0
    }

    // ── Algebraic simplifications (right operand is a known constant) ───────
    if (typeof R === 'number') {
      if (isZero(R) && op === '+') return L
      if (isZero(R) && op === '-') return L
      if (isOne(R) && op === '*') return L
      if (isOne(R) && op === '/') return L
      if (isZero(R) && op === '*') return 0
    }

    return e
  },

  UnaryExpression(e) {
    e.operand = optimize(e.operand)
    const operand = unbox(e.operand)
    // Constant fold numeric negation
    if (e.op === '-' && typeof operand === 'number') return -operand
    // Constant fold boolean not
    if (e.op === 'not' && typeof operand === 'boolean') return !operand
    return e
  },

  // ── Calls ──────────────────────────────────────────────────────────────────

  Call(c) {
    c.args = c.args.map(optimize)
    return c
  },

  // ── Data structures ────────────────────────────────────────────────────────

  FieldAccess(e) {
    e.object = optimize(e.object)
    return e
  },

  ListExpression(e) {
    e.elements = e.elements.map(optimize)
    return e
  },

  MapExpression(e) {
    e.entries = e.entries.map(optimize)
    return e
  },

  MapEntry(e) {
    e.value = optimize(e.value)
    return e
  },

  // ── Leaves: variables pass through unchanged ────────────────────────────────
  Variable(v) {
    return v
  },
}