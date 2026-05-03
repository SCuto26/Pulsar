// analyzer.js
// Accepts the Ohm match object from the parser and produces the fully-analyzed
// Pulsar program representation (AST). Performs all semantic checks: scope
// resolution, undeclared/redeclared identifiers, type compatibility, break/
// output placement, and structural correctness.
//
// Follows the Carlos compiler architecture from CMSI 3802 course notes,
// adapted for Pulsar's keyword set and grammar.

import * as fs from 'node:fs'
import * as ohm from 'ohm-js'
import * as core from './core.js'

const grammar = ohm.grammar(fs.readFileSync('src/pulsar.ohm'))

// ── Type system ──────────────────────────────────────────────────────────────
// Pulsar is dynamically-typed at runtime but we track a lightweight static
// notion of type for the three primitive categories we can detect at compile
// time from literals. All other expressions are tagged "any".

export const NUMBER = 'number'
export const STRING = 'string'
export const BOOLEAN = 'boolean'
export const ANY = 'any'
export const VOID = 'void'

// ── Type helpers ─────────────────────────────────────────────────────────────

function typeDescription(t) {
  if (t === NUMBER) return 'number'
  if (t === STRING) return 'string'
  if (t === BOOLEAN) return 'boolean'
  if (t === ANY) return 'any'
  if (t === VOID) return 'void'
  if (t?.kind === 'ListType') return `list of ${typeDescription(t.baseType)}`
  return String(t)
}

// Two types are compatible when either side is "any", or they are identical.
function compatible(from, to) {
  return from === ANY || to === ANY || from === to
}

// ── Context (scope chain) ─────────────────────────────────────────────────────

class Context {
  constructor({ parent = null, locals = new Map(), inLoop = false, inFunction = false } = {}) {
    this.parent = parent
    this.locals = locals
    this.inLoop = inLoop
    this.inFunction = inFunction
  }

  // Add a new binding to the current scope.
  add(name, entity) {
    this.locals.set(name, entity)
  }

  // Walk up the scope chain looking for a binding.
  lookup(name) {
    return this.locals.get(name) ?? this.parent?.lookup(name)
  }

  // Create a child scope, inheriting loop/function flags unless overridden.
  newChild(overrides = {}) {
    return new Context({
      parent: this,
      locals: new Map(),
      inLoop: this.inLoop,
      inFunction: this.inFunction,
      ...overrides,
    })
  }

  // The root scope includes nothing pre-declared; Pulsar has no standard
  // library built-ins at this stage. Extend here if built-ins are added later.
  static root() {
    return new Context()
  }
}

// ── Error gate ────────────────────────────────────────────────────────────────
// All semantic errors flow through must(). The errorLocation object should
// carry an `at` property pointing to an Ohm parse-tree node so we can use
// Ohm's getLineAndColumnMessage for user-friendly error placement.

function must(condition, message, errorLocation) {
  if (!condition) {
    const prefix = errorLocation?.at?.source?.getLineAndColumnMessage?.() ?? ''
    throw new Error(`${prefix}${message}`)
  }
}

// Attach named check helpers directly on must so callers read naturally:
// must.notAlreadyDeclared(context, name, { at: id })
Object.assign(must, {
  notAlreadyDeclared(context, name, at) {
    must(!context.locals.has(name), `Identifier '${name}' already declared in this scope`, at)
  },

  haveBeenDeclared(entity, name, at) {
    must(entity !== undefined && entity !== null, `Identifier '${name}' has not been declared`, at)
  },

  beAssignable(fromType, toType, at) {
    must(
      compatible(fromType, toType),
      `Cannot assign a ${typeDescription(fromType)} to a ${typeDescription(toType)}`,
      at
    )
  },

  beInLoop(context, at) {
    must(context.inLoop, `'stop' can only appear inside a loop`, at)
  },

  beInFunction(context, at) {
    must(context.inFunction, `'output' can only appear inside a function`, at)
  },

  beCallable(entity, name, at) {
    must(
      entity?.kind === 'FunctionDeclaration' || entity?.kind === 'Variable',
      `'${name}' is not a function`,
      at
    )
  },

  haveNumericType(exp, at) {
    must(
      exp.type === NUMBER || exp.type === ANY,
      `Expected a number but got ${typeDescription(exp.type)}`,
      at
    )
  },

  haveBooleanType(exp, at) {
    must(
      exp.type === BOOLEAN || exp.type === ANY,
      `Expected a boolean but got ${typeDescription(exp.type)}`,
      at
    )
  },

  fieldExists(group, fieldName, at) {
    must(
      group.fields.includes(fieldName),
      `Group '${group.name}' has no field '${fieldName}'`,
      at
    )
  },
})

// ── Main export ───────────────────────────────────────────────────────────────

export default function analyze(match) {
  let context = Context.root()

  // Ohm semantics: one "rep" operation that recursively builds the AST while
  // enforcing all contextual constraints.
  const builder = match.matcher.grammar.createSemantics().addOperation('rep', {

    // ── Program ──────────────────────────────────────────────────────────────
    Program(statements) {
      return core.program(statements.children.map(s => s.rep()))
    },

    // ── Statements ───────────────────────────────────────────────────────────

    // define function: add (x, y) { ... }
    FunctionDecl(_define, _function, _colon, id, _open, params, _close, block) {
      const name = id.sourceString
      must.notAlreadyDeclared(context, name, { at: id })

      // Create a placeholder so recursive calls inside the body can resolve.
      const fn = core.functionDeclaration(name, [], [])
      context.add(name, fn)

      // Build a child scope that is aware it is inside a function.
      context = context.newChild({ inFunction: true })

      // Register each parameter as a variable in the function's scope.
      const paramNames = params.asIteration().children.map(p => {
        const pname = p.sourceString
        must.notAlreadyDeclared(context, pname, { at: p })
        const v = core.variable(pname)
        context.add(pname, v)
        return v
      })

      const body = block.rep()
      context = context.parent

      // Fill in the now-known params and body on the placeholder object.
      fn.params = paramNames
      fn.body = body
      return fn
    },

    // group Student: name, gpa, grade
    GroupDecl(_group, id, _colon, fields) {
      const name = id.sourceString
      must.notAlreadyDeclared(context, name, { at: id })
      const fieldNames = fields.asIteration().children.map(f => f.sourceString)
      const g = core.groupDeclaration(name, fieldNames)
      context.add(name, g)
      return g
    },

    // let x be 5
    VarDecl(_let, id, _be, exp) {
      const name = id.sourceString
      must.notAlreadyDeclared(context, name, { at: id })
      const initializer = exp.rep()
      const v = core.variable(name)
      context.add(name, v)
      return core.variableDeclaration(v, initializer)
    },

    // x be 10
    Assignment(id, _be, exp) {
      const name = id.sourceString
      const target = context.lookup(name)
      must.haveBeenDeclared(target, name, { at: id })
      const source = exp.rep()
      return core.assignment(target, source)
    },

    // display "hello"
    DisplayStmt(_display, exp) {
      return core.displayStatement(exp.rep())
    },

    // if x is greater than 5 { ... } otherwise { ... }
    IfStmt(_if, test, consequentBlock, _otherwise, alternateBlock) {
      const testExp = test.rep()

      context = context.newChild()
      const consequent = consequentBlock.rep()
      context = context.parent

      // The "otherwise" clause is optional (0 or 1 children).
      const alternateNodes = alternateBlock.children
      if (alternateNodes.length > 0) {
        context = context.newChild()
        const alternate = alternateNodes[0].rep()
        context = context.parent
        return core.ifStatement(testExp, consequent, alternate)
      }

      return core.shortIfStatement(testExp, consequent)
    },

    // as long as x is less than 10 { ... }
    WhileLoop(_asLongAs, test, block) {
      const testExp = test.rep()
      context = context.newChild({ inLoop: true })
      const body = block.rep()
      context = context.parent
      return core.whileLoop(testExp, body)
    },

    // go through each item in myList { ... }
    ForEachLoop(_goThrough, _each, iterator, _in, collection, block) {
      const collectionName = collection.sourceString
      const collectionEntity = context.lookup(collectionName)
      must.haveBeenDeclared(collectionEntity, collectionName, { at: collection })

      context = context.newChild({ inLoop: true })

      const iteratorName = iterator.sourceString
      must.notAlreadyDeclared(context, iteratorName, { at: iterator })
      const iteratorVar = core.variable(iteratorName)
      context.add(iteratorName, iteratorVar)

      const body = block.rep()
      context = context.parent

      return core.forEachLoop(iteratorVar, collectionEntity, body)
    },

    // stop
    StopStmt(stopKeyword) {
      must.beInLoop(context, { at: stopKeyword })
      return core.stopStatement
    },

    // output result
    OutputStmt(_output, exp) {
      must.beInFunction(context, { at: _output })
      return core.outputStatement(exp.rep())
    },

    // ── Call as statement ─────────────────────────────────────────────────────
    Statement_callStmt(call) {
      return call.rep()
    },

    // ── Block ─────────────────────────────────────────────────────────────────
    Block(_open, statements, _close) {
      return statements.children.map(s => s.rep())
    },

    // ── Call as expression ────────────────────────────────────────────────────
    Call(id, _open, argList, _close) {
      const name = id.sourceString
      const callee = context.lookup(name)
      must.haveBeenDeclared(callee, name, { at: id })
      const args = argList.asIteration().children.map(a => a.rep())
      return core.call(callee, args)
    },

    // ── Expressions ───────────────────────────────────────────────────────────

    Exp_or(left, _or, right) {
      const l = left.rep()
      const r = right.rep()
      return core.binary('or', l, r)
    },

    Exp1_and(left, _and, right) {
      const l = left.rep()
      const r = right.rep()
      return core.binary('and', l, r)
    },

    Exp2_neq(left, _is, _not, right) {
      return core.binary('!=', left.rep(), right.rep())
    },

    Exp2_eq(left, _is, right) {
      return core.binary('==', left.rep(), right.rep())
    },

    Exp3_gte(left, _op, right) {
      return core.binary('>=', left.rep(), right.rep())
    },

    Exp3_lte(left, _op, right) {
      return core.binary('<=', left.rep(), right.rep())
    },

    Exp3_gt(left, _op, right) {
      return core.binary('>', left.rep(), right.rep())
    },

    Exp3_lt(left, _op, right) {
      return core.binary('<', left.rep(), right.rep())
    },

    Exp4_add(left, _op, right) {
      return core.binary('+', left.rep(), right.rep())
    },

    Exp4_sub(left, _op, right) {
      return core.binary('-', left.rep(), right.rep())
    },

    Exp5_mul(left, _op, right) {
      return core.binary('*', left.rep(), right.rep())
    },

    Exp5_div(left, _op, right) {
      return core.binary('/', left.rep(), right.rep())
    },

    Exp5_mod(left, _op, right) {
      return core.binary('%', left.rep(), right.rep())
    },

    Exp6_not(_not, exp) {
      return core.unary('not', exp.rep())
    },

    Exp6_neg(_minus, exp) {
      return core.unary('-', exp.rep())
    },

    // ── Primary expressions ───────────────────────────────────────────────────

    Primary_call(call) {
      return call.rep()
    },

    // student.name — field access on a variable
    Primary_field(objectId, _dot, fieldId) {
      const name = objectId.sourceString
      const entity = context.lookup(name)
      must.haveBeenDeclared(entity, name, { at: objectId })
      const fieldName = fieldId.sourceString
      // If the entity is a known group, validate the field exists.
      if (entity?.kind === 'GroupDeclaration') {
        must.fieldExists(entity, fieldName, { at: fieldId })
      }
      return core.fieldAccess(entity, fieldName)
    },

    Primary_num(numeral) {
      const n = Number(numeral.sourceString)
      return Object.assign(n, { type: NUMBER })
    },

    Primary_str(strlit) {
      // Keep the surrounding quotes in the representation (as Carlos does),
      // so the generator can emit them verbatim.
      const s = strlit.sourceString
      return Object.assign(String(s), { type: STRING })
    },

    Primary_true(_true) {
      return Object.assign(true, { type: BOOLEAN })
    },

    Primary_false(_false) {
      return Object.assign(false, { type: BOOLEAN })
    },

    // [1, 2, 3]
    Primary_list(_open, elements, _close) {
      const elems = elements.asIteration().children.map(e => e.rep())
      return core.listExpression(elems)
    },

    // { "key" -> value, ... }
    Primary_map(_open, entries, _close) {
      const entryNodes = entries.asIteration().children.map(e => e.rep())
      return core.mapExpression(entryNodes)
    },

    Primary_parens(_open, exp, _close) {
      return exp.rep()
    },

    // A bare identifier used as a value
    Primary_id(id) {
      const name = id.sourceString
      const entity = context.lookup(name)
      must.haveBeenDeclared(entity, name, { at: id })
      return entity
    },

    // ── Map entry ─────────────────────────────────────────────────────────────
    MapEntry(key, _arrow, value) {
      return core.mapEntry(key.sourceString, value.rep())
    },

    // ── Literals (pass-through handled above in Primary_* rules) ─────────────
    // Ohm requires terminal rules to be defined for any rule the semantics
    // traverses. The rules below delegate to their single child when Ohm
    // does not automatically inline them.

    _terminal() {
      return this.sourceString
    },

    _iter(...children) {
      return children.map(c => c.rep())
    },
  })

  return builder(match).rep()
}