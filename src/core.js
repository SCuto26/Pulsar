// core.js
// Defines all AST node types and type constants for the Pulsar compiler.
// Every compiler phase (analyzer, optimizer, generator) imports from here.
// Follows the Carlos architecture from CMSI 3802 course notes.

// ── Type constants ────────────────────────────────────────────────────────────
// Primitive types are plain strings; compound types (list, map) are objects
// so they can carry their inner types. void is the return type for functions
// that display but do not output a value.

export const NUMBER_TYPE  = 'number'
export const STRING_TYPE  = 'string'
export const BOOLEAN_TYPE = 'boolean'
export const VOID_TYPE    = 'void'
export const ANY_TYPE     = 'any' // used internally for unresolved/error recovery

// list containing number  →  { kind: 'ListType', baseType: 'number' }
export function listType(baseType) {
  return { kind: 'ListType', baseType }
}

// map linking string to number  →  { kind: 'MapType', keyType: 'string', valueType: 'number' }
export function mapType(keyType, valueType) {
  return { kind: 'MapType', keyType, valueType }
}

// Returns true when two types are structurally equal.
export function typesMatch(t1, t2) {
  if (t1 === t2) return true
  if (t1?.kind === 'ListType' && t2?.kind === 'ListType') {
    return typesMatch(t1.baseType, t2.baseType)
  }
  if (t1?.kind === 'MapType' && t2?.kind === 'MapType') {
    return typesMatch(t1.keyType, t2.keyType) && typesMatch(t1.valueType, t2.valueType)
  }
  return false
}

// Human-readable type description for error messages.
export function typeDescription(t) {
  if (t === NUMBER_TYPE)  return 'number'
  if (t === STRING_TYPE)  return 'string'
  if (t === BOOLEAN_TYPE) return 'boolean'
  if (t === VOID_TYPE)    return 'void'
  if (t === ANY_TYPE)     return 'any'
  if (t?.kind === 'ListType') return `list containing ${typeDescription(t.baseType)}`
  if (t?.kind === 'MapType')  return `map linking ${typeDescription(t.keyType)} to ${typeDescription(t.valueType)}`
  return String(t)
}

// ── Program ──────────────────────────────────────────────────────────────────

export function program(statements) {
  return { kind: 'Program', statements }
}

// ── Declarations ─────────────────────────────────────────────────────────────

// let x as number be 5
export function variableDeclaration(variable, initializer) {
  return { kind: 'VariableDeclaration', variable, initializer }
}

// The variable entity itself — carries its declared type
export function variable(name, type) {
  return { kind: 'Variable', name, type }
}

// define function: add(x as number, y as number) outputs number { ... }
// params is an array of Variable nodes; returnType is a type constant
export function functionDeclaration(name, params, returnType, body) {
  return { kind: 'FunctionDeclaration', name, params, returnType, body }
}

// group Student: name as string, gpa as number
// fields is an array of { name, type } objects
export function groupDeclaration(name, fields) {
  return { kind: 'GroupDeclaration', name, fields }
}

// ── Statements ────────────────────────────────────────────────────────────────

// x be 10  (reassignment)
export function assignment(target, source) {
  return { kind: 'Assignment', target, source }
}

// display "hello"
export function displayStatement(expression) {
  return { kind: 'DisplayStatement', expression }
}

// output result
export function outputStatement(expression) {
  return { kind: 'OutputStatement', expression }
}

// stop
export const stopStatement = { kind: 'StopStatement' }

// if x is greater than 5 { ... } otherwise { ... }
export function ifStatement(test, consequent, alternate) {
  return { kind: 'IfStatement', test, consequent, alternate }
}

// if x is greater than 5 { ... }  (no otherwise branch)
export function shortIfStatement(test, consequent) {
  return { kind: 'ShortIfStatement', test, consequent }
}

// as long as x is less than 10 { ... }
export function whileLoop(test, body) {
  return { kind: 'WhileLoop', test, body }
}

// go through each item in myList { ... }
export function forEachLoop(iterator, collection, body) {
  return { kind: 'ForEachLoop', iterator, collection, body }
}

// ── Expressions ───────────────────────────────────────────────────────────────
// All expression nodes carry a `type` property set by the analyzer.

// x + y, x and y, x is greater than y, etc.
export function binary(op, left, right, type) {
  return { kind: 'BinaryExpression', op, left, right, type }
}

// not x, -x
export function unary(op, operand, type) {
  return { kind: 'UnaryExpression', op, operand, type }
}

// add(x, y)
export function call(callee, args, type) {
  return { kind: 'Call', callee, args, type }
}

// student.name
export function fieldAccess(object, field, type) {
  return { kind: 'FieldAccess', object, field, type }
}

// [1, 2, 3]
export function listExpression(elements, type) {
  return { kind: 'ListExpression', elements, type }
}

// { "name" -> "Stefan", "gpa" -> 3.9 }
export function mapExpression(entries, type) {
  return { kind: 'MapExpression', entries, type }
}

// A single key -> value pair inside a map literal
export function mapEntry(key, value) {
  return { kind: 'MapEntry', key, value }
}