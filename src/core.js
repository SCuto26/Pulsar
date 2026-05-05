// ── Pulsar ───────────────────────────────────────────────────────────────────
// core.js
// Stefan Cutovic
// Defines all AST node types, type constants, and type utilities used across every compiler phase.

// ── Type constants ────────────────────────────────────────────────────────────

export const NUMBER_TYPE = 'number'
export const STRING_TYPE = 'string'
export const BOOLEAN_TYPE = 'boolean'
export const VOID_TYPE = 'void'
export const ANY_TYPE = 'any'

export function listType(baseType) {
  return { kind: 'ListType', baseType }
}

export function mapType(keyType, valueType) {
  return { kind: 'MapType', keyType, valueType }
}

// ── Type utilities ────────────────────────────────────────────────────────────

// Structural equality check — handles nested list and map types recursively.
export function typesMatch(t1, t2) {
  if (t1 === t2) return true
  if (t1?.kind === 'ListType' && t2?.kind === 'ListType') {
    return typesMatch(t1.baseType, t2.baseType)
  }
  if (t1?.kind === 'MapType' && t2?.kind === 'MapType') {
    return (
      typesMatch(t1.keyType, t2.keyType) &&
      typesMatch(t1.valueType, t2.valueType)
    )
  }
  return false
}

// Human-readable type string used in error messages.
export function typeDescription(t) {
  if (t === NUMBER_TYPE) return 'number'
  if (t === STRING_TYPE) return 'string'
  if (t === BOOLEAN_TYPE) return 'boolean'
  if (t === VOID_TYPE) return 'void'
  if (t === ANY_TYPE) return 'any'
  if (t?.kind === 'ListType')
    return `list containing ${typeDescription(t.baseType)}`
  if (t?.kind === 'MapType')
    return `map linking ${typeDescription(t.keyType)} to ${typeDescription(t.valueType)}`
  return String(t)
}

// ── Program ───────────────────────────────────────────────────────────────────

export function program(statements) {
  return { kind: 'Program', statements }
}

// ── Declarations ──────────────────────────────────────────────────────────────

export function variableDeclaration(variable, initializer) {
  return { kind: 'VariableDeclaration', variable, initializer }
}

export function variable(name, type) {
  return { kind: 'Variable', name, type }
}

export function functionDeclaration(name, params, returnType, body) {
  return { kind: 'FunctionDeclaration', name, params, returnType, body }
}

export function groupDeclaration(name, fields) {
  return { kind: 'GroupDeclaration', name, fields }
}

// ── Statements ────────────────────────────────────────────────────────────────

export function assignment(target, source) {
  return { kind: 'Assignment', target, source }
}

export function displayStatement(expression) {
  return { kind: 'DisplayStatement', expression }
}

export function outputStatement(expression) {
  return { kind: 'OutputStatement', expression }
}

export const stopStatement = { kind: 'StopStatement' }

export function ifStatement(test, consequent, alternate) {
  return { kind: 'IfStatement', test, consequent, alternate }
}

export function shortIfStatement(test, consequent) {
  return { kind: 'ShortIfStatement', test, consequent }
}

export function whileLoop(test, body) {
  return { kind: 'WhileLoop', test, body }
}

export function forEachLoop(iterator, collection, body) {
  return { kind: 'ForEachLoop', iterator, collection, body }
}

// ── Expressions ───────────────────────────────────────────────────────────────
// All expression nodes carry a `type` property assigned during analysis.

export function binary(op, left, right, type) {
  return { kind: 'BinaryExpression', op, left, right, type }
}

export function unary(op, operand, type) {
  return { kind: 'UnaryExpression', op, operand, type }
}

export function call(callee, args, type) {
  return { kind: 'Call', callee, args, type }
}

export function fieldAccess(object, field, type) {
  return { kind: 'FieldAccess', object, field, type }
}

export function listExpression(elements, type) {
  return { kind: 'ListExpression', elements, type }
}

export function mapExpression(entries, type) {
  return { kind: 'MapExpression', entries, type }
}

export function mapEntry(key, value) {
  return { kind: 'MapEntry', key, value }
}
