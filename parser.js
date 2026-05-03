// parser.js
// Uses Ohm to match Pulsar source code against the grammar in pulsar.ohm.
// Returns the Ohm match object if successful, otherwise throws an error.

import * as fs from 'node:fs'
import * as ohm from 'ohm-js'

const grammar = ohm.grammar(fs.readFileSync('src/pulsar.ohm'))

// Returns the Ohm match if successful, otherwise throws an error
export default function parse(sourceCode) {
  const match = grammar.match(sourceCode)
  if (!match.succeeded()) throw new Error(match.message)
  return match
}