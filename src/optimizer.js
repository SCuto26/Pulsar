// ── Pulsar ───────────────────────────────────────────────────────────────────
// optimizer.js
// Stefan Cutovic
// Transforms the analyzed AST before code generation: constant folding, algebraic simplifications, 
// and dead code removal.

import * as core from './core.js'

export default function optimize(node) {
  return optimizers?.[node?.kind]?.(node) ?? node
}

// Literals are wrapped as boxed objects during analysis so they can carry a .type property.
// Unbox to primitives before any comparison or arithmetic.
function unbox(v) {
  if (v instanceof Number)  return v.valueOf()
  if (v instanceof Boolean) return v.valueOf()
  if (v instanceof String)  return v.valueOf()
  return v
}

const isZero = n => n === 0
const isOne  = n => n === 1

const optimizers = {

  Program(p) {
    p.statements = p.statements.flatMap(optimize)
    return p
  },

  VariableDeclaration(d) {
    d.initializer = optimize(d.initializer)
    return d
  },

  FunctionDeclaration(d) {
    d.body = d.body.flatMap(optimize)
    return d
  },

  GroupDeclaration(d) {
    return d
  },

  Assignment(s) {
    s.source = optimize(s.source)
    s.target = optimize(s.target)
    // x be x is a no-op — remove it
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

  IfStatement(s) {
    s.test = optimize(s.test)
    s.consequent = s.consequent.flatMap(optimize)
    s.alternate  = s.alternate.flatMap(optimize)
    const test = unbox(s.test)
    if (test === true)  return s.consequent
    if (test === false) return s.alternate
    return s
  },

  ShortIfStatement(s) {
    s.test = optimize(s.test)
    s.consequent = s.consequent.flatMap(optimize)
    const test = unbox(s.test)
    if (test === true)  return s.consequent
    if (test === false) return []
    return s
  },

  WhileLoop(s) {
    s.test = optimize(s.test)
    if (unbox(s.test) === false) return []
    s.body = s.body.flatMap(optimize)
    return s
  },

  ForEachLoop(s) {
    s.collection = optimize(s.collection)
    s.body = s.body.flatMap(optimize)
    if (s.collection?.kind === 'ListExpression' && s.collection.elements.length === 0) {
      return []
    }
    return s
  },

  BinaryExpression(e) {
    e.left  = optimize(e.left)
    e.right = optimize(e.right)
    const L  = unbox(e.left)
    const R  = unbox(e.right)
    const op = e.op

    // Boolean short-circuits
    if (op === 'and') {
      if (L === true)  return e.right
      if (R === true)  return e.left
      if (L === false) return Object.assign(Object(false), { type: core.BOOLEAN_TYPE })
      if (R === false) return Object.assign(Object(false), { type: core.BOOLEAN_TYPE })
    }
    if (op === 'or') {
      if (L === false) return e.right
      if (R === false) return e.left
      if (L === true)  return Object.assign(Object(true), { type: core.BOOLEAN_TYPE })
      if (R === true)  return Object.assign(Object(true), { type: core.BOOLEAN_TYPE })
    }

    // Numeric constant folding
    if (typeof L === 'number' && typeof R === 'number') {
      if (op === '+')  return L + R
      if (op === '-')  return L - R
      if (op === '*')  return L * R
      if (op === '/')  return L / R
      if (op === '%')  return L % R
      if (op === '<')  return L < R
      if (op === '<=') return L <= R
      if (op === '>')  return L > R
      if (op === '>=') return L >= R
      if (op === '==') return L === R
      if (op === '!=') return L !== R
    }

    // String constant folding
    if (typeof L === 'string' && typeof R === 'string') {
      if (op === '+')  return L.slice(0, -1) + R.slice(1)
      if (op === '==') return L === R
      if (op === '!=') return L !== R
    }

    // Algebraic simplifications
    if (typeof L === 'number') {
      if (isZero(L) && op === '+') return e.right
      if (isZero(L) && op === '-') return core.unary('-', e.right, core.NUMBER_TYPE)
      if (isOne(L)  && op === '*') return e.right
      if (isZero(L) && op === '*') return 0
      if (isZero(L) && op === '/') return 0
    }

    if (typeof R === 'number') {
      if (isZero(R) && op === '+') return e.left
      if (isZero(R) && op === '-') return e.left
      if (isOne(R)  && op === '*') return e.left
      if (isOne(R)  && op === '/') return e.left
      if (isZero(R) && op === '*') return 0
    }

    return e
  },

  UnaryExpression(e) {
    e.operand = optimize(e.operand)
    const operand = unbox(e.operand)
    if (e.op === '-'   && typeof operand === 'number')  return -operand
    if (e.op === 'not' && typeof operand === 'boolean') return !operand
    return e
  },

  Call(c) {
    c.args = c.args.map(optimize)
    return c
  },

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

  Variable(v) {
    return v
  },
}