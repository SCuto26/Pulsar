// ── Pulsar ───────────────────────────────────────────────────────────────────
// parser.js
// Stefan Cutovic
// Loads the Pulsar grammar and matches source code against it, returning an Ohm match object.

import * as fs from 'node:fs'
import * as ohm from 'ohm-js'

const grammar = ohm.grammar(fs.readFileSync('src/pulsar.ohm'))

export default function parse(sourceCode) {
  const match = grammar.match(sourceCode)
  if (!match.succeeded()) throw new Error(match.message)
  return match
}