<p align="center">
  <img src="docs/PulsarLogo.png" alt="Pulsar Logo" width="300"/>
</p>

<h1 align="center">Pulsar</h1>

<p align="center"><em>Pseudocode. Made Real.</em></p>

<p align="center">
  <a href="https://scuto26.github.io/Pulsar/">🌐 Companion Website</a>
</p>

<p align="center"><sub>Stefan Cutovic &nbsp;·&nbsp; CMSI 3802</sub></p>


<br/>

---

<br/>


## The Story

There's an irony that stuck with me throughout every CS course I took: educators use pseudocode to teach the fundamentals of logic and computation, then immediately disqualify it from exams because it "isn't real code." That contradiction was the starting point for Pulsar. If pseudocode is expressive enough to explain an algorithm to a human, it should be expressive enough to explain it to a machine. Pulsar is that — a fully compiled, statically typed language built on the premise that readable code and rigorous code are not opposites. It isn't a stepping stone to other languages. It's an alternative entry point into the world of real programming, one that doesn't ask you to learn a new notation before you can start thinking in logic.

The name came from thinking about what makes a language trustworthy. A pulsar is a rotating neutron star that emits radio waves on a precise, calculable interval — you don't need to observe it constantly to know when the next pulse arrives. That predictability is what I wanted Pulsar the language to have. You shouldn't need to consult the spec every time you write a line. After a few programs the pattern becomes obvious, and you know what comes next.


<br/>

---

<br/>


## What Sets Pulsar Apart

Every keyword in Pulsar was chosen to read as natural English. Comparisons spell out their meaning, operators are words not symbols, and every construct reads the way you would say it out loud. If you can describe what your program does, you can write it in Pulsar.

<div align="center">

| Construct | Pulsar |
|:---------:|:------:|
| Variable declaration | `let score as number be 95` |
| Comparison | `score is greater than or equal to 90` |
| Loop | `as long as active { ... }` |
| Iteration | `go through each item in items { ... }` |
| Function with return type | `define function: add(x as number) outputs number { ... }` |
| Typed map | `let grades as map linking string to number be {"math" -> 95}` |

</div>


<br/>

---

<br/>


## Static Analysis

Pulsar enforces a full set of static constraints at compile time — before a single line of JavaScript is generated.

- **Type mismatch on assignment** — assigning a string to a number variable is a compile error
- **Argument type checking** — every call site is verified against declared parameter types
- **Argument count matching** — too many or too few arguments are caught before runtime
- **Return type enforcement** — a function declared to output a number cannot return a string
- **Scope resolution** — undeclared and redeclared identifiers are flagged with line numbers
- **Boolean-only conditionals** — `if` and `as long as` require boolean expressions, not numbers
- **stop / output placement** — `stop` must be in a loop; `output` must be in a function
- **Duplicate group fields** — a group cannot declare the same field name twice
- **List homogeneity** — all elements in a list literal must share the same type
- **No calling non-functions** — attempting to call a variable as a function is a compile error


<br/>

---

<br/>


## Generated Output

Pulsar compiles to clean, readable JavaScript. Here's what the compiler produces.

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Generated JavaScript</th>
</tr>
<tr>
<td>

```pulsar
define function: double(n as number) outputs number {
  output n * 2
}
let x as number be double(5)
display x
```

</td>
<td>

```javascript
function double_1(n_2) {
  return (n_2 * 2);
}
let x_3 = double_1(5);
console.log(x_3);
```

</td>
</tr>
</table>
</div>

<br/>

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Generated JavaScript</th>
</tr>
<tr>
<td>

```pulsar
let scores as list containing number be [72, 95, 88, 61, 100, 77]
let total as number be 0

go through each score in scores {
  total be total + score
}

display total
```

</td>
<td>

```javascript
let scores_1 = [72, 95, 88, 61, 100, 77];
let total_2 = 0;
for (let score_3 of scores_1) {
  total_2 = (total_2 + score_3);
}
console.log(total_2);
```

</td>
</tr>
</table>
</div>


<br/>

---

<br/>


## Examples


### Declarations

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
let name as string be "Stefan"
let age as number be 21
let gpa as number be 3.9
let enrolled as boolean be true

let isHonors as boolean be
  gpa is greater than or equal to 3.5

let isAdult as boolean be
  age is greater than or equal to 18

let greeting as string be
  "Hello, " + name

display greeting
display isHonors
display isAdult
```

</td>
<td>

```swift
let name: String = "Stefan"
let age: Int = 21
let gpa: Double = 3.9
let enrolled: Bool = true

let isHonors: Bool =
  gpa >= 3.5

let isAdult: Bool =
  age >= 18

let greeting: String =
  "Hello, " + name

print(greeting)
print(isHonors)
print(isAdult)
```

</td>
</tr>
</table>
</div>

<br/>


### While Loop

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
let current as number be 5
let done as boolean be false

as long as not done {
  display current
  current be current - 1

  if current is less than or equal to 0 {
    done be true
    stop
  }
}

display "Countdown complete"
```

</td>
<td>

```swift
var current: Int = 5
var done: Bool = false

while !done {
  print(current)
  current -= 1

  if current <= 0 {
    done = true
    break
  }
}

print("Countdown complete")
```

</td>
</tr>
</table>
</div>

<br/>


### Foreach

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
let scores as list containing number be
  [72, 95, 88, 61, 100, 77]

let total as number be 0
let highest as number be 0

go through each score in scores {
  total be total + score
}

go through each score in scores {
  if score is greater than highest {
    highest be score
  }
}

display total
display highest
```

</td>
<td>

```swift
let scores: [Double] =
  [72, 95, 88, 61, 100, 77]

var total: Double = 0
var highest: Double = 0

for score in scores {
  total += score
}

for score in scores {
  if score > highest {
    highest = score
  }
}

print(total)
print(highest)
```

</td>
</tr>
</table>
</div>

<br/>


### Branching

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
define function: letterGrade(score as number) outputs string {
  if score is greater than or equal to 90 {
    output "A"
  } otherwise {
    if score is greater than or equal to 80 {
      output "B"
    } otherwise {
      if score is greater than or equal to 70 {
        output "C"
      } otherwise {
        output "F"
      }
    }
  }
}

display letterGrade(95)
display letterGrade(82)
display letterGrade(65)
```

</td>
<td>

```swift
func letterGrade(score: Double) -> String {
  if score >= 90 {
    return "A"
  } else if score >= 80 {
    return "B"
  } else if score >= 70 {
    return "C"
  } else {
    return "F"
  }
}

print(letterGrade(score: 95))
print(letterGrade(score: 82))
print(letterGrade(score: 65))
```

</td>
</tr>
</table>
</div>

<br/>


### Groups

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
group Student: name as string,
               gpa as number,
               year as number

define function: standing(year as number) outputs string {
  if year is 1 { output "Freshman" }
  otherwise {
    if year is 2 { output "Sophomore" }
    otherwise {
      if year is 3 { output "Junior" }
      otherwise { output "Senior" }
    }
  }
}

define function: isHonors(gpa as number) outputs boolean {
  output gpa is greater than or equal to 3.5
}

define function: report(name as string, gpa as number, year as number) outputs void {
  display name
  display standing(year)
  display isHonors(gpa)
}
```

</td>
<td>

```swift
struct Student {
  var name: String
  var gpa: Double
  var year: Int
}

func standing(year: Int) -> String {
  if year == 1 { return "Freshman" }
  else if year == 2 { return "Sophomore" }
  else if year == 3 { return "Junior" }
  else { return "Senior" }
}

func isHonors(gpa: Double) -> Bool {
  return gpa >= 3.5
}

func report(name: String, gpa: Double, year: Int) {
  print(name)
  print(standing(year: year))
  print(isHonors(gpa: gpa))
}
```

</td>
</tr>
</table>
</div>

<br/>


### Maps

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
let grades as map linking string to number be {
  "math"    -> 95,
  "science" -> 88,
  "english" -> 91
}

let labels as map linking string to string be {
  "A" -> "Excellent",
  "B" -> "Good",
  "C" -> "Passing"
}

let flags as map linking string to boolean be {
  "honors"    -> true,
  "enrolled"  -> true,
  "graduated" -> false
}

display grades
display labels
display flags
```

</td>
<td>

```swift
let grades: [String: Double] = [
  "math":    95,
  "science": 88,
  "english": 91
]

let labels: [String: String] = [
  "A": "Excellent",
  "B": "Good",
  "C": "Passing"
]

let flags: [String: Bool] = [
  "honors":    true,
  "enrolled":  true,
  "graduated": false
]

print(grades)
print(labels)
print(flags)
```

</td>
</tr>
</table>
</div>
