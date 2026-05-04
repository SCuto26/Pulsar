import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import parse from '../src/parser.js'
import analyze from '../src/analyzer.js'
import optimize from '../src/optimizer.js'
import generate from '../src/generator.js'

const js = src => generate(optimize(analyze(parse(src))))

function dedent(stringsOrStr, ...values) {
  const s = Array.isArray(stringsOrStr)
    ? stringsOrStr.reduce((acc, str, i) => acc + (values[i - 1] ?? '') + str)
    : stringsOrStr
  return s.split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n')
}

const fixtures = [
  {
    name: 'number variable declaration',
    source: 'let x as number be 42',
    expected: 'let x_1 = 42;',
  },
  {
    name: 'constant folded to 7',
    source: 'let x as number be 3 + 4',
    expected: 'let x_1 = 7;',
  },
  {
    name: 'string variable declaration',
    source: 'let name as string be "Stefan"',
    expected: 'let name_1 = "Stefan";',
  },
  {
    name: 'boolean variable declaration',
    source: 'let flag as boolean be true',
    expected: 'let flag_1 = true;',
  },
  {
    name: 'reassignment',
    source: 'let x as number be 5\nx be 10',
    expected: dedent`
      let x_1 = 5;
      x_1 = 10;
    `,
  },
  {
    name: 'display string literal',
    source: 'display "hello"',
    expected: 'console.log("hello");',
  },
  {
    name: 'display variable',
    source: 'let x as number be 5\ndisplay x',
    expected: dedent`
      let x_1 = 5;
      console.log(x_1);
    `,
  },
  {
    name: 'arithmetic expression',
    source: 'let x as number be 5\nlet y as number be x + 1',
    expected: dedent`
      let x_1 = 5;
      let y_2 = (x_1 + 1);
    `,
  },
  {
    name: 'unary negation',
    source: 'let x as number be 5\nlet y as number be -x',
    expected: dedent`
      let x_1 = 5;
      let y_2 = -(x_1);
    `,
  },
  {
    name: 'and maps to &&',
    source: 'let x as boolean be true\nlet z as boolean be false\nlet y as boolean be x and z',
    expected: dedent`
      let x_1 = true;
      let z_2 = false;
      let y_3 = (x_1 && z_2);
    `,
  },
  {
    name: 'or maps to ||',
    source: 'let x as boolean be true\nlet z as boolean be false\nlet y as boolean be x or z',
    expected: dedent`
      let x_1 = true;
      let z_2 = false;
      let y_3 = (x_1 || z_2);
    `,
  },
  {
    name: 'not maps to !',
    source: 'let x as boolean be true\nlet y as boolean be not x',
    expected: dedent`
      let x_1 = true;
      let y_2 = !(x_1);
    `,
  },
  {
    name: 'is equal maps to ===',
    source: 'let x as number be 5\nlet y as boolean be x is 5',
    expected: dedent`
      let x_1 = 5;
      let y_2 = (x_1 === 5);
    `,
  },
  {
    name: 'is not equal maps to !==',
    source: 'let x as number be 5\nlet y as boolean be x is not 3',
    expected: dedent`
      let x_1 = 5;
      let y_2 = (x_1 !== 3);
    `,
  },
  {
    name: 'short if statement',
    source: 'let flag as boolean be true\nif flag { display "yes" }',
    expected: dedent`
      let flag_1 = true;
      if (flag_1) {
      console.log("yes");
      }
    `,
  },
  {
    name: 'if otherwise statement',
    source: 'let flag as boolean be true\nif flag { display "yes" } otherwise { display "no" }',
    expected: dedent`
      let flag_1 = true;
      if (flag_1) {
      console.log("yes");
      } else {
      console.log("no");
      }
    `,
  },
  {
    name: 'while loop with stop',
    source: 'let go as boolean be true\nas long as go { display go\nstop }',
    expected: dedent`
      let go_1 = true;
      while (go_1) {
      console.log(go_1);
      break;
      }
    `,
  },
  {
    name: 'foreach loop',
    source: 'let items as list containing number be [1, 2]\ngo through each item in items { display item }',
    expected: dedent`
      let items_1 = [1, 2];
      for (let item_2 of items_1) {
      console.log(item_2);
      }
    `,
  },
  {
    name: 'function with typed params and return',
    source: 'define function: double(n as number) outputs number { output n * 2 }',
    expected: dedent`
      function double_1(n_2) {
      return (n_2 * 2);
      }
    `,
  },
  {
    name: 'function call result assigned',
    source: 'define function: double(n as number) outputs number { output n * 2 }\nlet x as number be double(5)',
    expected: dedent`
      function double_1(n_2) {
      return (n_2 * 2);
      }
      let x_3 = double_1(5);
    `,
  },
  {
    name: 'void function call as statement',
    source: 'define function: greet() outputs void { display "hi" }\ngreet()',
    expected: dedent`
      function greet_1() {
      console.log("hi");
      }
      greet_1();
    `,
  },
  {
    name: 'group becomes class',
    source: 'group Point: x as number, y as number',
    expected: dedent`
      class Point_1 {
      constructor(x, y) {
      this.x = x;
      this.y = y;
      }
      }
    `,
  },
  {
    name: 'list literal',
    source: 'let scores as list containing number be [1, 2, 3]',
    expected: 'let scores_1 = [1, 2, 3];',
  },
  {
    name: 'map literal',
    source: 'let m as map linking string to number be {"score" -> 99, "bonus" -> 5}',
    expected: 'let m_1 = { "score": 99, "bonus": 5 };',
  },
  {
    name: 'map linking string to string',
    source: 'let labels as map linking string to string be {"a" -> "alpha", "b" -> "beta"}',
    expected: 'let labels_1 = { "a": "alpha", "b": "beta" };',
  },
  {
    name: 'while-false eliminated by optimizer',
    source: 'let x as number be 1\nas long as false { display x }',
    expected: 'let x_1 = 1;',
  },
  {
    name: 'if-true collapses to body',
    source: 'let x as number be 1\nif true { display x }',
    expected: dedent`
      let x_1 = 1;
      console.log(x_1);
    `,
  },
  {
    name: 'self-assignment eliminated',
    source: 'let x as number be 5\nx be x\ndisplay x',
    expected: dedent`
      let x_1 = 5;
      console.log(x_1);
    `,
  },
  {
    name: 'multiple variables get distinct suffixes',
    source: 'let a as number be 1\nlet b as number be 2\nlet c as number be 3',
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