// ── Pulsar ───────────────────────────────────────────────────────────────────
// compiler.js
// Stefan Cutovic
// Wires the four compilation phases into a single pipeline and exposes them by output type.

import parse from './parser.js'
import analyze from './analyzer.js'
import optimize from './optimizer.js'
import generate from './generator.js'

// outputType controls how far through the pipeline to run:
//   'parsed'    — syntax check only
//   'analyzed'  — returns the typed AST
//   'optimized' — returns the optimized AST
//   'js'        — returns the generated JavaScript string
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
