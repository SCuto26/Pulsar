#!/usr/bin/env node

// pulsar.js
// Command line interface for the Pulsar compiler.
// Reads a .pulsar source file, runs it through the compiler pipeline,
// and prints the result to stdout.
//
// Usage:
//   node src/pulsar.js <filename> <outputType>
//
// Output types:
//   parsed    — confirms the program is syntactically correct
//   analyzed  — prints the analyzed program representation (AST)
//   optimized — prints the optimized program representation
//   js        — prints the JavaScript translation
//
// Follows the Carlos CLI architecture from CMSI 3802 course notes.

import * as fs from 'node:fs/promises'
import compile from './compiler.js'

const help = `Pulsar compiler

Usage: pulsar <filename> <outputType>

Output types:
  parsed    confirm the source program is syntactically correct
  analyzed  print the analyzed program representation
  optimized print the optimized program representation
  js        print the JavaScript translation
`

async function compileFromFile(filename, outputType) {
  try {
    const source = await fs.readFile(filename, 'utf-8')
    const result = compile(source, outputType)
    // Objects (analyzed/optimized AST) are printed with JSON.stringify for
    // readability; strings (parsed confirmation, js output) print as-is.
    if (typeof result === 'object') {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(result)
    }
  } catch (e) {
    // Print errors in red, matching the Carlos CLI convention
    console.error(`\u001b[31m${e.message}\u001b[39m`)
    process.exitCode = 1
  }
}

if (process.argv.length === 4) {
  await compileFromFile(process.argv[2], process.argv[3])
} else {
  console.log(help)
  process.exitCode = 2
}