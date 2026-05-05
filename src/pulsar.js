#!/usr/bin/env node

// ── Pulsar ───────────────────────────────────────────────────────────────────
// pulsar.js
// Stefan Cutovic
// CLI entry point: reads a .pulsar file and prints the result of the requested compilation phase.

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
    if (typeof result === 'object') {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(result)
    }
  } catch (e) {
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