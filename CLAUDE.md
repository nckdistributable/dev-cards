# CLAUDE.md — dev::cards

This file provides full context for working with the repo without additional questions.

## Card schema

```jsonc
{
  "id": "rust-lifetimes-007",       // stable, kebab-case, NEVER change
  "course": "rust",                 // folder in courses/
  "topic": "lifetimes",             // subfolder
  "level": "beginner|intermediate|advanced",
  "type": "concept|compiles|output|choice|fill",
  "concept": "2-4 sentences — explanation of the concept",
  "code": "fn main() { ... }",       // optional, ≤ 12 lines
  "question": "Question in Russian?",
  "options": ["Option A", "Option B"],  // for choice/fill/compiles
  "answer": 0,                      // index of the correct option
  "expected": "compiles|fails",     // ONLY for type=compiles
  "expected_output": "42",          // ONLY for type=output
  "explanation": "Why: ..."
}
```

## Card types

| Type | Description | Fields |
|---|---|---|
| `concept` | Theory only, answer is "Understood" | concept, question, explanation |
| `compiles` | Will the code compile? | code, options=["Yes","No"], answer, expected |
| `output` | What does the program print? | code, options (4 options), answer, expected_output |
| `choice` | Multiple choice | options (2-4), answer |
| `fill` | Fill in the missing word | question with `___`, options, answer |

## Quality rules

1. **Snippet ≤ 12 lines** — if longer, split into several cards
2. **An explanation always contains the "why"** — not just "correct", but the mechanism
3. **compiles cards: ~50% yes / 50% no** within a single topic
4. **Question wording is in Russian**, code and terms are in English
5. **id is stable forever** — user progress is tied to the id
6. **id format**: `{course}-{topic}-{NNN}`, for example `rust-ownership-003`
7. For `compiles` cards with `expected: "fails"` — the explanation includes the compiler error code
8. Snippets without `fn main` are wrapped automatically by CI

## File structure

```
courses/
  rust/
    ownership/cards.json
    borrowing/cards.json
    lifetimes/cards.json
  algorithms/
    big-o/cards.json
  blockchain/
    basics/cards.json
  crypto/
    hashing/cards.json
```

Each `cards.json` is an array of card objects.

## Examples of good cards

### Example 1 — compiles (fails)

```json
{
  "id": "rust-ownership-004",
  "course": "rust",
  "topic": "ownership",
  "level": "beginner",
  "type": "compiles",
  "concept": "In Rust every value has exactly one owner. When you assign a variable holding heap data, a move occurs — the original variable becomes invalid.",
  "code": "fn main() {\n    let s1 = String::from(\"hello\");\n    let s2 = s1;\n    println!(\"{}\", s1);\n}",
  "question": "Will this code compile?",
  "options": ["Yes", "No"],
  "answer": 1,
  "expected": "fails",
  "explanation": "No. After `let s2 = s1` ownership of the String moved to s2. Trying to use s1 after the move causes a compiler error: `error[E0382]: borrow of moved value: s1`."
}
```

### Example 2 — output

```json
{
  "id": "rust-ownership-007",
  "course": "rust",
  "topic": "ownership",
  "level": "intermediate",
  "type": "output",
  "concept": "A Drop trait implementation is called automatically when a variable goes out of scope. The drop order is the reverse of declaration order.",
  "code": "struct Droppable(&'static str);\nimpl Drop for Droppable {\n    fn drop(&mut self) { println!(\"drop {}\", self.0); }\n}\nfn main() {\n    let _a = Droppable(\"a\");\n    let _b = Droppable(\"b\");\n}",
  "question": "What does the program print?",
  "options": ["drop a\ndrop b", "drop b\ndrop a", "drop a", "Nothing"],
  "answer": 1,
  "expected_output": "drop b\ndrop a",
  "explanation": "Variables are destroyed in reverse declaration order (LIFO). `_b` is declared after `_a`, so drop is called first for `_b`, then for `_a`."
}
```

### Example 3 — concept

```json
{
  "id": "rust-borrowing-001",
  "course": "rust",
  "topic": "borrowing",
  "level": "beginner",
  "type": "concept",
  "concept": "Borrowing lets you use a value without transferring ownership. An immutable reference `&T` only allows reading the data. Any number of immutable references can exist at the same time.",
  "question": "What is borrowing in Rust?",
  "explanation": "Borrowing is a mechanism for temporary access to data through references without transferring ownership. The compiler guarantees that references do not outlive the data they point to (lifetime safety)."
}
```

## Example of a bad card with analysis

```json
{
  "id": "q1",
  "type": "choice",
  "question": "What is ownership?",
  "options": ["Memory management", "A Rust concept", "Both", "Neither"],
  "answer": 2,
  "explanation": "Correct!"
}
```

**Problems:**
- `id: "q1"` — unstable, does not follow the format
- the question is in English (it should be in Russian)
- "A Rust concept" — tautology, carries no meaning
- `explanation: "Correct!"` — does not explain the mechanism, no "why"
- missing the `course`, `topic`, `level`, `concept` fields

**Correct version:** see Example 3 above.
