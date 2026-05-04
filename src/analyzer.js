// analyzer.js
// Accepts the Ohm match object from the parser and produces the fully-analyzed
// Pulsar program representation. Performs all static checks:
//   - Scope resolution (undeclared / redeclared identifiers)
//   - Type checking on assignments, arguments, return values, operators
//   - Argument count matching
//   - stop only inside loops, output only inside functions
//   - Return type compatibility
//   - Duplicate group fields
//   - No calling a non-function

import * as fs from 'node:fs'
import * as ohm from 'ohm-js'
import * as core from './core.js'

const grammar = ohm.grammar(fs.readFileSync('src/pulsar.ohm'))

// ── Context (scope chain) ─────────────────────────────────────────────────────

class Context {
  constructor({
    parent      = null,
    locals      = new Map(),
    inLoop      = false,
    inFunction  = false,
    returnType  = core.VOID_TYPE,
  } = {}) {
    this.parent     = parent
    this.locals     = locals
    this.inLoop     = inLoop
    this.inFunction = inFunction
    this.returnType = returnType
  }

  add(name, entity) {
    this.locals.set(name, entity)
  }

  lookup(name) {
    return this.locals.get(name) ?? this.parent?.lookup(name)
  }

  newChild(overrides = {}) {
    return new Context({
      parent:     this,
      locals:     new Map(),
      inLoop:     this.inLoop,
      inFunction: this.inFunction,
      returnType: this.returnType,
      ...overrides,
    })
  }

  static root() {
    return new Context()
  }
}

// ── Error gate ────────────────────────────────────────────────────────────────

function must(condition, message, errorLocation) {
  if (!condition) {
    const prefix = errorLocation?.at?.source?.getLineAndColumnMessage?.() ?? ''
    throw new Error(`${prefix}${message}`)
  }
}

Object.assign(must, {
  notAlreadyDeclared(context, name, at) {
    must(!context.locals.has(name), `Identifier '${name}' already declared in this scope`, at)
  },

  haveBeenDeclared(entity, name, at) {
    must(entity != null, `Identifier '${name}' has not been declared`, at)
  },

  beAFunction(entity, name, at) {
    must(
      entity?.kind === 'FunctionDeclaration',
      `'${name}' is not a function`,
      at
    )
  },

  beInLoop(context, at) {
    must(context.inLoop, `'stop' can only appear inside a loop`, at)
  },

  beInFunction(context, at) {
    must(context.inFunction, `'output' can only appear inside a function`, at)
  },

  haveType(exp, expected, at) {
    must(
      core.typesMatch(exp.type, expected),
      `Expected ${core.typeDescription(expected)} but got ${core.typeDescription(exp.type)}`,
      at
    )
  },

  beNumeric(exp, at) {
    must(
      exp.type === core.NUMBER_TYPE,
      `Expected number but got ${core.typeDescription(exp.type)}`,
      at
    )
  },

  beBoolean(exp, at) {
    must(
      exp.type === core.BOOLEAN_TYPE,
      `Expected boolean but got ${core.typeDescription(exp.type)}`,
      at
    )
  },

  beString(exp, at) {
    must(
      exp.type === core.STRING_TYPE,
      `Expected string but got ${core.typeDescription(exp.type)}`,
      at
    )
  },

  beNumericOrString(exp, at) {
    must(
      exp.type === core.NUMBER_TYPE || exp.type === core.STRING_TYPE,
      `Expected number or string but got ${core.typeDescription(exp.type)}`,
      at
    )
  },

  beAssignable(sourceType, targetType, at) {
    must(
      core.typesMatch(sourceType, targetType),
      `Cannot assign ${core.typeDescription(sourceType)} to ${core.typeDescription(targetType)}`,
      at
    )
  },

  haveCorrectArgCount(given, expected, name, at) {
    must(
      given === expected,
      `Function '${name}' expects ${expected} argument(s) but got ${given}`,
      at
    )
  },

  haveDistinctFields(fields, groupName, at) {
    const names = fields.map(f => f.name)
    const unique = new Set(names)
    must(unique.size === names.length, `Group '${groupName}' has duplicate fields`, at)
  },

  beAList(exp, at) {
    must(
      exp.type?.kind === 'ListType',
      `Expected a list but got ${core.typeDescription(exp.type)}`,
      at
    )
  },

  beAMap(exp, at) {
    must(
      exp.type?.kind === 'MapType',
      `Expected a map but got ${core.typeDescription(exp.type)}`,
      at
    )
  },

  fieldExists(group, fieldName, at) {
    const field = group.fields.find(f => f.name === fieldName)
    must(field != null, `Group '${group.name}' has no field '${fieldName}'`, at)
    return field
  },

  notVoidReturn(exp, at) {
    must(
      exp.type !== core.VOID_TYPE,
      `Cannot output a void expression`,
      at
    )
  },
})

// ── Main export ───────────────────────────────────────────────────────────────

export default function analyze(match) {
  let context = Context.root()

  const builder = match.matcher.grammar.createSemantics().addOperation('rep', {

    Program(statements) {
      return core.program(statements.children.map(s => s.rep()))
    },

    // ── Type resolution ───────────────────────────────────────────────────────

    Type_number(_) {
      return core.NUMBER_TYPE
    },

    Type_string(_) {
      return core.STRING_TYPE
    },

    Type_boolean(_) {
      return core.BOOLEAN_TYPE
    },

    Type_void(_) {
      return core.VOID_TYPE
    },

    Type_list(_list, _containing, baseType) {
      return core.listType(baseType.rep())
    },

    Type_map(_map, _linking, keyType, _to, valueType) {
      return core.mapType(keyType.rep(), valueType.rep())
    },

    // ── Declarations ─────────────────────────────────────────────────────────

    // define function: add(x as number, y as number) outputs number { ... }
    FunctionDecl(_define, _function, _colon, id, _open, params, _close, _outputs, returnType, block) {
      const name = id.sourceString
      must.notAlreadyDeclared(context, name, { at: id })

      const retType = returnType.rep()

      // Register placeholder immediately so recursive calls inside body resolve
      const fn = core.functionDeclaration(name, [], retType, [])
      context.add(name, fn)

      // Build child scope for the function body
      context = context.newChild({ inFunction: true, returnType: retType })

      const paramNodes = params.rep()
      fn.params = paramNodes

      const body = block.rep()
      fn.body = body

      context = context.parent
      return fn
    },

    Params(paramList) {
      return paramList.asIteration().children.map(p => p.rep())
    },

    // x as number
    Param(id, _as, type) {
      const name = id.sourceString
      const t    = type.rep()
      must.notAlreadyDeclared(context, name, { at: id })
      const v = core.variable(name, t)
      context.add(name, v)
      return v
    },

    // group Student: name as string, gpa as number
    GroupDecl(_group, id, _colon, fields) {
      const name = id.sourceString
      must.notAlreadyDeclared(context, name, { at: id })
      const fieldNodes = fields.asIteration().children.map(f => f.rep())
      must.haveDistinctFields(fieldNodes, name, { at: id })
      const g = core.groupDeclaration(name, fieldNodes)
      context.add(name, g)
      return g
    },

    // name as string  (inside GroupDecl)
    GroupField(id, _as, type) {
      return { name: id.sourceString, type: type.rep() }
    },

    // let x as number be 5
    VarDecl(_let, id, _as, type, _be, exp) {
      const name    = id.sourceString
      const declaredType = type.rep()
      must.notAlreadyDeclared(context, name, { at: id })
      const initializer = exp.rep()
      must.beAssignable(initializer.type, declaredType, { at: exp })
      const v = core.variable(name, declaredType)
      context.add(name, v)
      return core.variableDeclaration(v, initializer)
    },

    // x be 10
    Assignment(id, _be, exp) {
      const name   = id.sourceString
      const target = context.lookup(name)
      must.haveBeenDeclared(target, name, { at: id })
      // Only variables can be reassigned — not functions or groups
      must(
        target.kind === 'Variable',
        `Cannot reassign '${name}' — only variables can be reassigned`,
        { at: id }
      )
      const source = exp.rep()
      must.beAssignable(source.type, target.type, { at: exp })
      return core.assignment(target, source)
    },

    // display <exp>
    DisplayStmt(_display, exp) {
      return core.displayStatement(exp.rep())
    },

    // if <test> { ... } (otherwise { ... })?
    IfStmt(_if, test, consequentBlock, _otherwise, alternateBlock) {
      const testExp = test.rep()
      must.beBoolean(testExp, { at: test })

      context = context.newChild()
      const consequent = consequentBlock.rep()
      context = context.parent

      if (alternateBlock.children.length > 0) {
        context = context.newChild()
        const alternate = alternateBlock.children[0].rep()
        context = context.parent
        return core.ifStatement(testExp, consequent, alternate)
      }

      return core.shortIfStatement(testExp, consequent)
    },

    // as long as <test> { ... }
    WhileLoop(_asLongAs, test, block) {
      const testExp = test.rep()
      must.beBoolean(testExp, { at: test })
      context = context.newChild({ inLoop: true })
      const body = block.rep()
      context = context.parent
      return core.whileLoop(testExp, body)
    },

    // go through each item in myList { ... }
    ForEachLoop(_goThrough, _each, iterator, _in, collection, block) {
      const collName   = collection.sourceString
      const collEntity = context.lookup(collName)
      must.haveBeenDeclared(collEntity, collName, { at: collection })
      must.beAList(collEntity, { at: collection })

      const elemType = collEntity.type.baseType

      context = context.newChild({ inLoop: true })

      const iterName = iterator.sourceString
      must.notAlreadyDeclared(context, iterName, { at: iterator })
      const iterVar = core.variable(iterName, elemType)
      context.add(iterName, iterVar)

      const body = block.rep()
      context = context.parent

      return core.forEachLoop(iterVar, collEntity, body)
    },

    // stop
    StopStmt(stopKeyword) {
      must.beInLoop(context, { at: stopKeyword })
      return core.stopStatement
    },

    // output <exp>
    OutputStmt(_output, exp) {
      must.beInFunction(context, { at: _output })
      const value = exp.rep()
      must.notVoidReturn(value, { at: exp })
      must.beAssignable(value.type, context.returnType, { at: exp })
      return core.outputStatement(value)
    },

    // Call used as a statement
    Statement_callStmt(call) {
      return call.rep()
    },

    Block(_open, statements, _close) {
      return statements.children.map(s => s.rep())
    },

    // ── Call as expression ────────────────────────────────────────────────────

    Call(id, _open, argList, _close) {
      const name   = id.sourceString
      const callee = context.lookup(name)
      must.haveBeenDeclared(callee, name, { at: id })
      must.beAFunction(callee, name, { at: id })

      const args = argList.asIteration().children.map(a => a.rep())
      must.haveCorrectArgCount(args.length, callee.params.length, name, { at: id })

      // Type-check each argument against its declared parameter type
      for (let i = 0; i < args.length; i++) {
        must.beAssignable(
          args[i].type,
          callee.params[i].type,
          { at: argList.asIteration().children[i] }
        )
      }

      return core.call(callee, args, callee.returnType)
    },

    // ── Expressions ───────────────────────────────────────────────────────────

    Exp_or(left, _or, right) {
      const l = left.rep()
      const r = right.rep()
      must.beBoolean(l, { at: left })
      must.beBoolean(r, { at: right })
      return core.binary('or', l, r, core.BOOLEAN_TYPE)
    },

    Exp1_and(left, _and, right) {
      const l = left.rep()
      const r = right.rep()
      must.beBoolean(l, { at: left })
      must.beBoolean(r, { at: right })
      return core.binary('and', l, r, core.BOOLEAN_TYPE)
    },

    Exp2_neq(left, _is, _not, right) {
      const l = left.rep()
      const r = right.rep()
      must(
        core.typesMatch(l.type, r.type),
        `Cannot compare ${core.typeDescription(l.type)} and ${core.typeDescription(r.type)} with is not`,
        { at: _is }
      )
      return core.binary('!=', l, r, core.BOOLEAN_TYPE)
    },

    Exp2_eq(left, _is, right) {
      const l = left.rep()
      const r = right.rep()
      must(
        core.typesMatch(l.type, r.type),
        `Cannot compare ${core.typeDescription(l.type)} and ${core.typeDescription(r.type)} with is`,
        { at: _is }
      )
      return core.binary('==', l, r, core.BOOLEAN_TYPE)
    },

    Exp3_gte(left, _op, right) {
      const l = left.rep()
      const r = right.rep()
      must.beNumericOrString(l, { at: left })
      must(core.typesMatch(l.type, r.type), `Operand types must match for comparison`, { at: _op })
      return core.binary('>=', l, r, core.BOOLEAN_TYPE)
    },

    Exp3_lte(left, _op, right) {
      const l = left.rep()
      const r = right.rep()
      must.beNumericOrString(l, { at: left })
      must(core.typesMatch(l.type, r.type), `Operand types must match for comparison`, { at: _op })
      return core.binary('<=', l, r, core.BOOLEAN_TYPE)
    },

    Exp3_gt(left, _op, right) {
      const l = left.rep()
      const r = right.rep()
      must.beNumericOrString(l, { at: left })
      must(core.typesMatch(l.type, r.type), `Operand types must match for comparison`, { at: _op })
      return core.binary('>', l, r, core.BOOLEAN_TYPE)
    },

    Exp3_lt(left, _op, right) {
      const l = left.rep()
      const r = right.rep()
      must.beNumericOrString(l, { at: left })
      must(core.typesMatch(l.type, r.type), `Operand types must match for comparison`, { at: _op })
      return core.binary('<', l, r, core.BOOLEAN_TYPE)
    },

    Exp4_add(left, _op, right) {
      const l = left.rep()
      const r = right.rep()
      must.beNumericOrString(l, { at: left })
      must(core.typesMatch(l.type, r.type), `Operand types must match for +`, { at: _op })
      return core.binary('+', l, r, l.type)
    },

    Exp4_sub(left, _op, right) {
      const l = left.rep()
      const r = right.rep()
      must.beNumeric(l, { at: left })
      must.beNumeric(r, { at: right })
      return core.binary('-', l, r, core.NUMBER_TYPE)
    },

    Exp5_mul(left, _op, right) {
      const l = left.rep()
      const r = right.rep()
      must.beNumeric(l, { at: left })
      must.beNumeric(r, { at: right })
      return core.binary('*', l, r, core.NUMBER_TYPE)
    },

    Exp5_div(left, _op, right) {
      const l = left.rep()
      const r = right.rep()
      must.beNumeric(l, { at: left })
      must.beNumeric(r, { at: right })
      return core.binary('/', l, r, core.NUMBER_TYPE)
    },

    Exp5_mod(left, _op, right) {
      const l = left.rep()
      const r = right.rep()
      must.beNumeric(l, { at: left })
      must.beNumeric(r, { at: right })
      return core.binary('%', l, r, core.NUMBER_TYPE)
    },

    Exp6_not(_not, exp) {
      const operand = exp.rep()
      must.beBoolean(operand, { at: exp })
      return core.unary('not', operand, core.BOOLEAN_TYPE)
    },

    Exp6_neg(_minus, exp) {
      const operand = exp.rep()
      must.beNumeric(operand, { at: exp })
      return core.unary('-', operand, core.NUMBER_TYPE)
    },

    // ── Primary expressions ───────────────────────────────────────────────────

    Primary_call(call) {
      return call.rep()
    },

    // object.field
    Primary_field(objectId, _dot, fieldId) {
      const name   = objectId.sourceString
      const entity = context.lookup(name)
      must.haveBeenDeclared(entity, name, { at: objectId })

      // If the variable's type is a group, validate field at compile time
      const groupDecl = context.lookup(entity.type?.name ?? entity.type)
      if (groupDecl?.kind === 'GroupDeclaration') {
        const field = must.fieldExists(groupDecl, fieldId.sourceString, { at: fieldId })
        return core.fieldAccess(entity, fieldId.sourceString, field.type)
      }

      // For variables whose type is a GroupDeclaration directly
      if (entity?.kind === 'GroupDeclaration') {
        const field = must.fieldExists(entity, fieldId.sourceString, { at: fieldId })
        return core.fieldAccess(entity, fieldId.sourceString, field.type)
      }

      return core.fieldAccess(entity, fieldId.sourceString, core.ANY_TYPE)
    },

    Primary_num(numeral) {
      const n = Number(numeral.sourceString)
      return Object.assign(Object(n), { type: core.NUMBER_TYPE })
    },

    Primary_str(strlit) {
      const s = strlit.sourceString
      return Object.assign(Object(s), { type: core.STRING_TYPE })
    },

    Primary_true(_) {
      return Object.assign(Object(true), { type: core.BOOLEAN_TYPE })
    },

    Primary_false(_) {
      return Object.assign(Object(false), { type: core.BOOLEAN_TYPE })
    },

    Primary_list(_open, elements, _close) {
      const elems = elements.asIteration().children.map(e => e.rep())
      if (elems.length === 0) {
        // Empty list — type cannot be inferred here; assign any list
        return core.listExpression(elems, core.listType(core.ANY_TYPE))
      }
      // All elements must have the same type
      const baseType = elems[0].type
      for (let i = 1; i < elems.length; i++) {
        must(
          core.typesMatch(elems[i].type, baseType),
          `All list elements must have the same type`,
          { at: elements }
        )
      }
      return core.listExpression(elems, core.listType(baseType))
    },

    Primary_map(_open, entries, _close) {
      const entryNodes = entries.asIteration().children.map(e => e.rep())
      if (entryNodes.length === 0) {
        return core.mapExpression(entryNodes, core.mapType(core.STRING_TYPE, core.ANY_TYPE))
      }
      // All values must have the same type; keys are always strings (string literals)
      const valueType = entryNodes[0].value.type
      for (let i = 1; i < entryNodes.length; i++) {
        must(
          core.typesMatch(entryNodes[i].value.type, valueType),
          `All map values must have the same type`,
          { at: entries }
        )
      }
      return core.mapExpression(entryNodes, core.mapType(core.STRING_TYPE, valueType))
    },

    Primary_parens(_open, exp, _close) {
      return exp.rep()
    },

    Primary_id(id) {
      const name   = id.sourceString
      const entity = context.lookup(name)
      must.haveBeenDeclared(entity, name, { at: id })
      return entity
    },

    MapEntry(key, _arrow, value) {
      return core.mapEntry(key.sourceString, value.rep())
    },

    _terminal() {
      return this.sourceString
    },

    _iter(...children) {
      return children.map(c => c.rep())
    },
  })

  return builder(match).rep()
}