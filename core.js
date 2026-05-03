// core.js
// Defines all AST node types for the Pulsar compiler.
// Every compiler phase (analyzer, optimizer, generator) imports from here.
// Follows the Carlos architecture from CMSI 3802 course notes.

// ── Program ──────────────────────────────────────────────────────────────────

export function program(statements) {
  return { kind: 'Program', statements }
}

// ── Declarations ─────────────────────────────────────────────────────────────

// let x be 5
export function variableDeclaration(variable, initializer) {
  return { kind: 'VariableDeclaration', variable, initializer }
}

// The variable entity itself, referenced throughout the program
export function variable(name) {
  return { kind: 'Variable', name }
}

// define function: add (x, y) { ... }
export function functionDeclaration(name, params, body) {
  return { kind: 'FunctionDeclaration', name, params, body }
}

// group Student: name, gpa, grade
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

// x + y, x and y, x is greater than y, etc.
export function binary(op, left, right) {
  return { kind: 'BinaryExpression', op, left, right }
}

// not x, -x
export function unary(op, operand) {
  return { kind: 'UnaryExpression', op, operand }
}

// add(x, y)
export function call(callee, args) {
  return { kind: 'Call', callee, args }
}

// student.name
export function fieldAccess(object, field) {
  return { kind: 'FieldAccess', object, field }
}

// [1, 2, 3]
export function listExpression(elements) {
  return { kind: 'ListExpression', elements }
}

// { "name" -> "Stefan", "gpa" -> 3.9 }
export function mapExpression(entries) {
  return { kind: 'MapExpression', entries }
}

// A single key -> value pair inside a map literal
export function mapEntry(key, value) {
  return { kind: 'MapEntry', key, value }
}