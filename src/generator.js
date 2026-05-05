// ── Pulsar ───────────────────────────────────────────────────────────────────
// generator.js
// Stefan Cutovic
// Walks the optimized AST and produces equivalent JavaScript source code.

import * as core from './core.js'

export default function generate(program) {
  const output = []

  // Each Pulsar entity gets a unique numeric suffix to avoid JS reserved word collisions.
  // e.g. a variable named 'class' becomes 'class_1' in the output.
  const targetName = ((mapping) => {
    return (entity) => {
      if (!mapping.has(entity)) mapping.set(entity, mapping.size + 1)
      return `${entity.name}_${mapping.get(entity)}`
    }
  })(new Map())

  const gen = (node) => generators?.[node?.kind]?.(node) ?? node

  const generators = {
    Program(p) {
      for (const s of p.statements) {
        const result = gen(s)
        // Expressions used as statements (e.g. a call) return a string — push as a line.
        if (typeof result === 'string') output.push(`${result};`)
      }
    },

    VariableDeclaration(d) {
      output.push(`let ${gen(d.variable)} = ${gen(d.initializer)};`)
    },

    FunctionDeclaration(d) {
      const name = targetName(d)
      const params = d.params.map((p) => targetName(p)).join(', ')
      output.push(`function ${name}(${params}) {`)
      for (const s of d.body) {
        const result = gen(s)
        if (typeof result === 'string') output.push(`${result};`)
      }
      output.push('}')
    },

    GroupDeclaration(d) {
      const name = targetName(d)
      const fieldNames = d.fields.map((f) => f.name)
      output.push(`class ${name} {`)
      output.push(`constructor(${fieldNames.join(', ')}) {`)
      for (const f of fieldNames) {
        output.push(`this.${f} = ${f};`)
      }
      output.push('}')
      output.push('}')
    },

    Assignment(s) {
      output.push(`${gen(s.target)} = ${gen(s.source)};`)
    },

    DisplayStatement(s) {
      output.push(`console.log(${gen(s.expression)});`)
    },

    OutputStatement(s) {
      output.push(`return ${gen(s.expression)};`)
    },

    StopStatement(_s) {
      output.push('break;')
    },

    IfStatement(s) {
      const genBlock = (stmts) => {
        for (const stmt of stmts) {
          const result = gen(stmt)
          if (typeof result === 'string') output.push(`${result};`)
        }
      }
      output.push(`if (${gen(s.test)}) {`)
      genBlock(s.consequent)
      output.push('} else {')
      genBlock(s.alternate)
      output.push('}')
    },

    ShortIfStatement(s) {
      output.push(`if (${gen(s.test)}) {`)
      for (const stmt of s.consequent) {
        const result = gen(stmt)
        if (typeof result === 'string') output.push(`${result};`)
      }
      output.push('}')
    },

    WhileLoop(s) {
      output.push(`while (${gen(s.test)}) {`)
      for (const stmt of s.body) {
        const result = gen(stmt)
        if (typeof result === 'string') output.push(`${result};`)
      }
      output.push('}')
    },

    ForEachLoop(s) {
      output.push(`for (let ${gen(s.iterator)} of ${gen(s.collection)}) {`)
      for (const stmt of s.body) {
        const result = gen(stmt)
        if (typeof result === 'string') output.push(`${result};`)
      }
      output.push('}')
    },

    BinaryExpression(e) {
      // Map Pulsar word operators to their JS symbol equivalents.
      const opMap = { and: '&&', or: '||', '==': '===', '!=': '!==' }
      const op = opMap[e.op] ?? e.op
      return `(${gen(e.left)} ${op} ${gen(e.right)})`
    },

    UnaryExpression(e) {
      const opMap = { not: '!' }
      const op = opMap[e.op] ?? e.op
      return `${op}(${gen(e.operand)})`
    },

    Call(c) {
      // Use targetName directly — dispatching through gen() would re-emit the function body.
      const callee = targetName(c.callee)
      const args = c.args.map(gen).join(', ')
      return `${callee}(${args})`
    },

    FieldAccess(e) {
      return `${gen(e.object)}.${e.field}`
    },

    ListExpression(e) {
      return `[${e.elements.map(gen).join(', ')}]`
    },

    MapExpression(e) {
      return `{ ${e.entries.map(gen).join(', ')} }`
    },

    MapEntry(e) {
      return `${e.key}: ${gen(e.value)}`
    },

    Variable(v) {
      return targetName(v)
    },
  }

  gen(program)
  return output.join('\n')
}
