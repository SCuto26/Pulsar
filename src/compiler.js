// compiler.js
// Wires all four compilation phases together into a single pipeline.
// Can be used as a library (imported by other modules) or called directly.
//
// Supported output types, matching the Carlos architecture from CMSI 3802:
//   "parsed"    — confirms the source matched the grammar, returns "Syntax is ok"
//   "analyzed"  — returns the analyzed program representation (AST)
//   "optimized" — returns the optimized program representation
//   "js"        — returns the final JavaScript translation as a string
//
// Follows the Carlos compiler.js structure from the course notes exactly.

import parse from './parser.js'
import analyze from './analyzer.js'
import optimize from './optimizer.js'
import generate from './generator.js'

export default function compile(source, outputType) {
  if (!['parsed', 'analyzed', 'optimized', 'js'].includes(outputType)) {
    throw new Error('Unknown output type')
  }

  const match = parse(source)
  if (outputType === 'parsed') return 'Syntax is ok'

  const analyzed = analyze(match)
  if (outputType === 'analyzed') return analyzed

  const optimized = optimize(analyzed)
  if (outputType === 'optimized') return optimized

  return generate(optimized)
}