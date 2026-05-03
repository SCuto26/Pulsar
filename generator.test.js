import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parse from '../src/parser.js'
import analyze from '../src/analyzer.js'
import optimize from '../src/optimizer.js'
import generate from '../src/generator.js'

// Run the full pipeline and return the JS output string
const js = src => generate(optimize(analyze(parse(src))))

// Strip leading/trailing whitespace from each line and join, making
// multi-line output comparisons insensitive to indentation style.
// Works as a tagged template literal (dedent`...`) or a plain function call.
function dedent(stringsOrStr, ...values) {
  const s = Array.isArray(stringsOrStr)
    ? stringsOrStr.reduce((result, str, i) => result + (values[i - 1] ?? '') + str)
    : stringsOrStr
  return s
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
}

const fixtures = [
  // ── Variable declarations ────────────────────────────────────────────────
  {
    name: 'number variable declaration',
    source: 'let x be 42',
    expected: 'let x_1 = 42;',
  },
  {
    name: 'string variable declaration',
    source: 'let name be "Stefan"',
    expected: 'let name_1 = "Stefan";',
  },
  {
    name: 'boolean variable declaration',
    source: 'let flag be true',
    expected: 'let flag_1 = true;',
  },
  {
    name: 'constant-folded variable',
    source: 'let x be 3 + 4',
    expected: 'let x_1 = 7;',
  },

  // ── Reassignment ────────────────────────────────────────────────────────
  {
    name: 'reassignment',
    source: 'let x be 5\nx be 10',
    expected: dedent`
      let x_1 = 5;
      x_1 = 10;
    `,
  },

  // ── Display ─────────────────────────────────────────────────────────────
  {
    name: 'display string literal',
    source: 'display "hello"',
    expected: 'console.log("hello");',
  },
  {
    name: 'display number literal',
    source: 'display 42',
    expected: 'console.log(42);',
  },
  {
    name: 'display variable',
    source: 'let x be 5\ndisplay x',
    expected: dedent`
      let x_1 = 5;
      console.log(x_1);
    `,
  },

  // ── Arithmetic expressions ───────────────────────────────────────────────
  {
    name: 'addition expression',
    source: 'let x be 5\nlet y be x + 1',
    expected: dedent`
      let x_1 = 5;
      let y_2 = (x_1 + 1);
    `,
  },
  {
    name: 'unary negation',
    source: 'let x be 5\nlet y be -x',
    expected: dedent`
      let x_1 = 5;
      let y_2 = -(x_1);
    `,
  },

  // ── Boolean operators ────────────────────────────────────────────────────
  {
    name: 'and maps to && with two non-constant operands',
    source: 'let x be 5\nlet z be 1\nlet y be x and z',
    expected: dedent`
      let x_1 = 5;
      let z_2 = 1;
      let y_3 = (x_1 && z_2);
    `,
  },
  {
    name: 'or maps to || with two non-constant operands',
    source: 'let x be 5\nlet z be 1\nlet y be x or z',
    expected: dedent`
      let x_1 = 5;
      let z_2 = 1;
      let y_3 = (x_1 || z_2);
    `,
  },
  {
    name: 'not maps to !',
    source: 'let x be 5\nlet y be not x',
    expected: dedent`
      let x_1 = 5;
      let y_2 = !(x_1);
    `,
  },

  // ── Comparison operators ─────────────────────────────────────────────────
  {
    name: 'is equal maps to ===',
    source: 'let x be 5\nlet y be x is 5',
    expected: dedent`
      let x_1 = 5;
      let y_2 = (x_1 === 5);
    `,
  },
  {
    name: 'is not equal maps to !==',
    source: 'let x be 5\nlet y be x is not 3',
    expected: dedent`
      let x_1 = 5;
      let y_2 = (x_1 !== 3);
    `,
  },
  {
    name: 'is greater than maps to >',
    source: 'let x be 5\nlet y be x is greater than 3',
    expected: dedent`
      let x_1 = 5;
      let y_2 = (x_1 > 3);
    `,
  },

  // ── If statements ─────────────────────────────────────────────────────────
  {
    name: 'short if statement',
    source: 'let x be 5\nif x { display x }',
    expected: dedent`
      let x_1 = 5;
      if (x_1) {
      console.log(x_1);
      }
    `,
  },
  {
    name: 'if otherwise statement',
    source: 'let x be 5\nif x { display "yes" } otherwise { display "no" }',
    expected: dedent`
      let x_1 = 5;
      if (x_1) {
      console.log("yes");
      } else {
      console.log("no");
      }
    `,
  },

  // ── While loop ────────────────────────────────────────────────────────────
  {
    name: 'while loop',
    source: 'let x be 1\nas long as x { display x\nstop }',
    expected: dedent`
      let x_1 = 1;
      while (x_1) {
      console.log(x_1);
      break;
      }
    `,
  },

  // ── ForEach loop ──────────────────────────────────────────────────────────
  {
    name: 'foreach loop',
    source: 'let items be [1, 2, 3]\ngo through each item in items { display item }',
    expected: dedent`
      let items_1 = [1, 2, 3];
      for (let item_2 of items_1) {
      console.log(item_2);
      }
    `,
  },

  // ── Function declarations ─────────────────────────────────────────────────
  {
    name: 'function with output',
    source: 'define function: double(n) { output n * 2 }',
    expected: dedent`
      function double_1(n_2) {
      return (n_2 * 2);
      }
    `,
  },
  {
    name: 'function call result assigned',
    source: 'define function: double(n) { output n * 2 }\nlet x be double(5)',
    expected: dedent`
      function double_1(n_2) {
      return (n_2 * 2);
      }
      let x_3 = double_1(5);
    `,
  },
  {
    name: 'function call as statement',
    source: 'define function: greet() { display "hi" }\ngreet()',
    expected: dedent`
      function greet_1() {
      console.log("hi");
      }
      greet_1();
    `,
  },

  // ── Group declarations ────────────────────────────────────────────────────
  {
    name: 'group declaration becomes class',
    source: 'group Point: x, y',
    expected: dedent`
      class Point_1 {
      constructor(x, y) {
      this.x = x;
      this.y = y;
      }
      }
    `,
  },

  // ── Collections ───────────────────────────────────────────────────────────
  {
    name: 'list literal',
    source: 'let x be [1, 2, 3]',
    expected: 'let x_1 = [1, 2, 3];',
  },
  {
    name: 'map literal',
    source: 'let m be {"name" -> "Stefan"}',
    expected: 'let m_1 = { "name": "Stefan" };',
  },

  // ── Optimizer interactions ─────────────────────────────────────────────────
  {
    name: 'while false is eliminated',
    source: 'let x be 0\nas long as false { display x }',
    expected: 'let x_1 = 0;',
  },
  {
    name: 'if true collapses to body',
    source: 'let x be 1\nif true { display x }',
    expected: dedent`
      let x_1 = 1;
      console.log(x_1);
    `,
  },
  {
    name: 'self-assignment is eliminated',
    source: 'let x be 5\nx be x\ndisplay x',
    expected: dedent`
      let x_1 = 5;
      console.log(x_1);
    `,
  },

  // ── Suffix numbering avoids JS reserved words ─────────────────────────────
  {
    name: 'multiple variables get distinct suffixes',
    source: 'let a be 1\nlet b be 2\nlet c be 3',
    expected: dedent`
      let a_1 = 1;
      let b_2 = 2;
      let c_3 = 3;
    `,
  },
]

describe('The code generator', () => {
  for (const fixture of fixtures) {
    it(`produces expected JS for ${fixture.name}`, () => {
      assert.equal(dedent(js(fixture.source)), dedent(fixture.expected))
    })
  }
})