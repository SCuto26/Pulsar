<h1 align="center">Examples</h1>

<p align="center"><em>Pulsar vs Swift — side by side</em></p>

---

<br/>

## Declarations

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

## While Loop

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

## Foreach

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

## Branching

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

## Groups

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

## Maps

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

<br/>

---

<br/>

## Operators

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
let x as number be 10
let y as number be 3

let sum as number be x + y
let diff as number be x - y
let product as number be x * y
let quotient as number be x / y
let remainder as number be x % y

let gt as boolean be x is greater than y
let lt as boolean be x is less than y
let eq as boolean be x is 10
let neq as boolean be x is not y
let gte as boolean be x is greater than or equal to 10
let lte as boolean be y is less than or equal to 3

let both as boolean be gt and eq
let either as boolean be lt or eq
let flipped as boolean be not lt

display sum
display product
display both
display flipped
```

</td>
<td>

```swift
let x: Int = 10
let y: Int = 3

let sum: Int = x + y
let diff: Int = x - y
let product: Int = x * y
let quotient: Double = Double(x) / Double(y)
let remainder: Int = x % y

let gt: Bool = x > y
let lt: Bool = x < y
let eq: Bool = x == 10
let neq: Bool = x != y
let gte: Bool = x >= 10
let lte: Bool = y <= 3

let both: Bool = gt && eq
let either: Bool = lt || eq
let flipped: Bool = !lt

print(sum)
print(product)
print(both)
print(flipped)
```

</td>
</tr>
</table>
</div>

<br/>

## Nested Functions

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
define function: double(n as number) outputs number {
  output n * 2
}

define function: addTen(n as number) outputs number {
  output n + 10
}

define function: transform(n as number) outputs number {
  output addTen(double(n))
}

define function: isLarge(n as number) outputs boolean {
  output transform(n) is greater than 50
}

let base as number be 15
let result as number be transform(base)
let large as boolean be isLarge(base)

display result
display large
```

</td>
<td>

```swift
func double(n: Double) -> Double {
  return n * 2
}

func addTen(n: Double) -> Double {
  return n + 10
}

func transform(n: Double) -> Double {
  return addTen(n: double(n: n))
}

func isLarge(n: Double) -> Bool {
  return transform(n: n) > 50
}

let base: Double = 15
let result: Double = transform(n: base)
let large: Bool = isLarge(n: base)

print(result)
print(large)
```

</td>
</tr>
</table>
</div>

<br/>

## List of Strings

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
let names as list containing string be
  ["Stefan", "Ana", "Luka", "Mia"]

let greeting as string be "Hello, "

go through each name in names {
  display greeting + name
}

define function: shout(s as string) outputs string {
  output s + "!"
}

go through each name in names {
  display shout(name)
}
```

</td>
<td>

```swift
let names: [String] =
  ["Stefan", "Ana", "Luka", "Mia"]

let greeting: String = "Hello, "

for name in names {
  print(greeting + name)
}

func shout(s: String) -> String {
  return s + "!"
}

for name in names {
  print(shout(s: name))
}
```

</td>
</tr>
</table>
</div>

<br/>

## Boolean Logic

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
define function: canEnroll(age as number, gpa as number) outputs boolean {
  output age is greater than or equal to 18
    and gpa is greater than or equal to 2.0
}

define function: isEligible(enrolled as boolean, credits as number) outputs boolean {
  output enrolled and credits is greater than or equal to 60
}

define function: needsAdvisor(gpa as number, credits as number) outputs boolean {
  output gpa is less than 2.5 or credits is less than 30
}

let age as number be 20
let gpa as number be 3.1
let credits as number be 75
let enrolled as boolean be true

display canEnroll(age, gpa)
display isEligible(enrolled, credits)
display needsAdvisor(gpa, credits)
display not needsAdvisor(gpa, credits)
```

</td>
<td>

```swift
func canEnroll(age: Int, gpa: Double) -> Bool {
  return age >= 18 && gpa >= 2.0
}

func isEligible(enrolled: Bool, credits: Int) -> Bool {
  return enrolled && credits >= 60
}

func needsAdvisor(gpa: Double, credits: Int) -> Bool {
  return gpa < 2.5 || credits < 30
}

let age: Int = 20
let gpa: Double = 3.1
let credits: Int = 75
let enrolled: Bool = true

print(canEnroll(age: age, gpa: gpa))
print(isEligible(enrolled: enrolled, credits: credits))
print(needsAdvisor(gpa: gpa, credits: credits))
print(!needsAdvisor(gpa: gpa, credits: credits))
```

</td>
</tr>
</table>
</div>

<br/>

## Mixed Types

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
group Course: title as string,
              credits as number,
              passed as boolean

define function: totalCredits(a as number, b as number, c as number) outputs number {
  output a + b + c
}

define function: allPassed(a as boolean, b as boolean, c as boolean) outputs boolean {
  output a and b and c
}

let t1 as string be "Compilers"
let cr1 as number be 3
let p1 as boolean be true

let t2 as string be "Networks"
let cr2 as number be 3
let p2 as boolean be true

let t3 as string be "Ethics"
let cr3 as number be 2
let p3 as boolean be false

display t1
display totalCredits(cr1, cr2, cr3)
display allPassed(p1, p2, p3)
```

</td>
<td>

```swift
struct Course {
  var title: String
  var credits: Int
  var passed: Bool
}

func totalCredits(a: Int, b: Int, c: Int) -> Int {
  return a + b + c
}

func allPassed(a: Bool, b: Bool, c: Bool) -> Bool {
  return a && b && c
}

let t1: String = "Compilers"
let cr1: Int = 3
let p1: Bool = true

let t2: String = "Networks"
let cr2: Int = 3
let p2: Bool = true

let t3: String = "Ethics"
let cr3: Int = 2
let p3: Bool = false

print(t1)
print(totalCredits(a: cr1, b: cr2, c: cr3))
print(allPassed(a: p1, b: p2, c: p3))
```

</td>
</tr>
</table>
</div>

<br/>

## String Operations

<div align="center">
<table>
<tr>
<th>Pulsar</th>
<th>Swift</th>
</tr>
<tr>
<td>

```pulsar
let first as string be "Stefan"
let last as string be "Cutovic"
let full as string be first + " " + last

let lang as string be "Pulsar"
let version as string be "1.0"
let label as string be lang + " v" + version

define function: tag(name as string, value as string) outputs string {
  output name + ": " + value
}

define function: isMatch(a as string, b as string) outputs boolean {
  output a is b
}

display full
display label
display tag("Language", lang)
display tag("Author", first)
display isMatch(lang, "Pulsar")
display isMatch(lang, "Python")
```

</td>
<td>

```swift
let first: String = "Stefan"
let last: String = "Cutovic"
let full: String = first + " " + last

let lang: String = "Pulsar"
let version: String = "1.0"
let label: String = lang + " v" + version

func tag(name: String, value: String) -> String {
  return name + ": " + value
}

func isMatch(a: String, b: String) -> Bool {
  return a == b
}

print(full)
print(label)
print(tag(name: "Language", value: lang))
print(tag(name: "Author", value: first))
print(isMatch(a: lang, b: "Pulsar"))
print(isMatch(a: lang, b: "Python"))
```

</td>
</tr>
</table>
</div>
