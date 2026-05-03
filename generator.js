// generator.js
// Walks the optimized AST and emits JavaScript source code as the target output.
//
// Key design decisions (following Carlos generator architecture, CMSI 3802):
//   - Each statement generator pushes lines onto an output array; expressions
//     return strings so they can be embedded inline.
//   - Every Pulsar variable/function gets a numeric suffix (x_1, add_2, etc.)
//     to avoid collisions with JavaScript reserved words.
//   - Pulsar's keyword operators map to their JS equivalents:
//       and → &&,  or → ||,  not → !,  == → ===,  != → !==
//   - display → console.log
//   - output (return) → return
//   - stop (break) → break
//   - group → class with a constructor that assigns each field
//   - foreach loop → for...of
//   - while loop → while

export default function generate(program) {
  // Lines of target JavaScript are accumulated here and joined at the end.
  const output = []

  // Maps each AST entity object to a unique JS identifier suffix so that
  // Pulsar names never collide with JS reserved words (e.g. a Pulsar variable
  // called "class" becomes "class_1" in the output).
  const targetName = (mapping => {
    return entity => {
      if (!mapping.has(entity)) {
        mapping.set(entity, mapping.size + 1)
      }
      return `${entity.name}_${mapping.get(entity)}`
    }
  })(new Map())

  // gen() dispatches to the generators table.
  // For statements it returns nothing (side effect: pushes to output).
  // For expressions it returns a JS string fragment.
  const gen = node => generators?.[node?.kind]?.(node) ?? node

  const generators = {

    // ── Program ──────────────────────────────────────────────────────────────
    Program(p) {
      for (const s of p.statements) {
        const result = gen(s)
        if (typeof result === 'string') output.push(`${result};`)
      }
    },

    // ── Declarations ─────────────────────────────────────────────────────────

    // let x be 5  →  let x_1 = 5;
    VariableDeclaration(d) {
      output.push(`let ${gen(d.variable)} = ${gen(d.initializer)};`)
    },

    // define function: add(x, y) { ... }  →  function add_1(x_2, y_3) { ... }
    FunctionDeclaration(d) {
      const name = targetName(d)
      const params = d.params.map(p => targetName(p)).join(', ')
      output.push(`function ${name}(${params}) {`)
      d.body.forEach(s => {
        const result = gen(s)
        // If gen() returned a string (expression used as statement, e.g. a call),
        // push it as a statement line.
        if (typeof result === 'string') output.push(`${result};`)
      })
      output.push('}')
    },

    // group Student: name, gpa  →  class Student_1 { constructor(name, gpa) { ... } }
    GroupDeclaration(d) {
      const name = targetName(d)
      output.push(`class ${name} {`)
      output.push(`constructor(${d.fields.join(', ')}) {`)
      for (const field of d.fields) {
        output.push(`this.${field} = ${field};`)
      }
      output.push('}')
      output.push('}')
    },

    // ── Statements ────────────────────────────────────────────────────────────

    // x be 10  →  x_1 = 10;
    Assignment(s) {
      output.push(`${gen(s.target)} = ${gen(s.source)};`)
    },

    // display "hello"  →  console.log("hello");
    DisplayStatement(s) {
      output.push(`console.log(${gen(s.expression)});`)
    },

    // output result  →  return result_1;
    OutputStatement(s) {
      output.push(`return ${gen(s.expression)};`)
    },

    // stop  →  break;
    StopStatement(_s) {
      output.push('break;')
    },

    // if test { ... } otherwise { ... }
    IfStatement(s) {
      const genBlock = stmts => {
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

    // if test { ... }
    ShortIfStatement(s) {
      output.push(`if (${gen(s.test)}) {`)
      for (const stmt of s.consequent) {
        const result = gen(stmt)
        if (typeof result === 'string') output.push(`${result};`)
      }
      output.push('}')
    },

    // as long as test { ... }  →  while (test) { ... }
    WhileLoop(s) {
      output.push(`while (${gen(s.test)}) {`)
      for (const stmt of s.body) {
        const result = gen(stmt)
        if (typeof result === 'string') output.push(`${result};`)
      }
      output.push('}')
    },

    // go through each item in myList { ... }  →  for (let item_1 of myList_2) { ... }
    ForEachLoop(s) {
      output.push(`for (let ${gen(s.iterator)} of ${gen(s.collection)}) {`)
      for (const stmt of s.body) {
        const result = gen(stmt)
        if (typeof result === 'string') output.push(`${result};`)
      }
      output.push('}')
    },

    // ── Expressions ───────────────────────────────────────────────────────────

    BinaryExpression(e) {
      // Map Pulsar operators to their JavaScript equivalents
      const opMap = {
        and: '&&',
        or: '||',
        '==': '===',
        '!=': '!==',
      }
      const op = opMap[e.op] ?? e.op
      return `(${gen(e.left)} ${op} ${gen(e.right)})`
    },

    UnaryExpression(e) {
      // Map Pulsar unary operators to JavaScript
      const opMap = { not: '!' }
      const op = opMap[e.op] ?? e.op
      return `${op}(${gen(e.operand)})`
    },

    // add(x, y) — used as expression, returns string
    // When used as a top-level statement, the Program/body forEach wraps it.
    Call(c) {
      // Use targetName directly: the callee is a named entity (FunctionDeclaration
      // or GroupDeclaration). Dispatching through gen() would re-emit its body.
      const callee = targetName(c.callee)
      const args = c.args.map(gen).join(', ')
      return `${callee}(${args})`
    },

    // student.name  →  student_1.name
    FieldAccess(e) {
      return `${gen(e.object)}.${e.field}`
    },

    // [1, 2, 3]
    ListExpression(e) {
      return `[${e.elements.map(gen).join(', ')}]`
    },

    // { "name" -> "Stefan" }  →  { "name": "Stefan" }
    MapExpression(e) {
      return `{ ${e.entries.map(gen).join(', ')} }`
    },

    MapEntry(e) {
      // e.key already includes surrounding quotes from the source string
      return `${e.key}: ${gen(e.value)}`
    },

    // ── Variable reference ────────────────────────────────────────────────────
    Variable(v) {
      return targetName(v)
    },
  }

  gen(program)
  return output.join('\n')
}