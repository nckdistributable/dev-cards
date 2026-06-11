# CLAUDE.md — dev::cards

Этот файл даёт полный контекст для работы с репо без дополнительных вопросов.

## Схема карточки

```jsonc
{
  "id": "rust-lifetimes-007",       // стабильный, kebab-case, НИКОГДА не менять
  "course": "rust",                 // папка в courses/
  "topic": "lifetimes",             // подпапка
  "level": "beginner|intermediate|advanced",
  "type": "concept|compiles|output|choice|fill",
  "concept": "2-4 предложения — объяснение концепции",
  "code": "fn main() { ... }",       // optional, ≤ 12 строк
  "question": "Вопрос на русском?",
  "options": ["Вариант А", "Вариант Б"],  // для choice/fill/compiles
  "answer": 0,                      // индекс правильного варианта
  "expected": "compiles|fails",     // ТОЛЬКО для type=compiles
  "expected_output": "42",          // ТОЛЬКО для type=output
  "explanation": "Почему: ..."
}
```

## Типы карточек

| Тип | Описание | Поля |
|---|---|---|
| `concept` | Только теория, ответ «Понятно» | concept, question, explanation |
| `compiles` | Скомпилируется ли код? | code, options=["Да","Нет"], answer, expected |
| `output` | Что выведет программа? | code, options (4 варианта), answer, expected_output |
| `choice` | Multiple choice | options (2-4), answer |
| `fill` | Вставить пропущенное слово | question с `___`, options, answer |

## Правила качества

1. **Сниппет ≤ 12 строк** — если длиннее, разбей на несколько карточек
2. **Объяснение всегда содержит «почему»** — не просто «правильно», а механизм
3. **compiles-карточки: ~50% да / 50% нет** в рамках одной темы
4. **Формулировки вопросов — на русском**, код и термины — на английском
5. **id стабилен навсегда** — прогресс пользователя привязан к id
6. **id-формат**: `{course}-{topic}-{NNN}` например `rust-ownership-003`
7. Для `compiles`-карточек с `expected: "fails"` — объяснение включает код ошибки компилятора
8. Сниппеты без `fn main` CI оборачивает автоматически

## Структура файлов

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

Каждый `cards.json` — массив объектов-карточек.

## Примеры хороших карточек

### Пример 1 — compiles (fails)

```json
{
  "id": "rust-ownership-004",
  "course": "rust",
  "topic": "ownership",
  "level": "beginner",
  "type": "compiles",
  "concept": "В Rust каждое значение имеет ровно одного владельца. При присваивании переменной, содержащей heap-данные, происходит move — исходная переменная становится недействительной.",
  "code": "fn main() {\n    let s1 = String::from(\"hello\");\n    let s2 = s1;\n    println!(\"{}\", s1);\n}",
  "question": "Скомпилируется ли этот код?",
  "options": ["Да", "Нет"],
  "answer": 1,
  "expected": "fails",
  "explanation": "Нет. После `let s2 = s1` владение String перешло к s2. Попытка использовать s1 после move приводит к ошибке компилятора: `error[E0382]: borrow of moved value: s1`."
}
```

### Пример 2 — output

```json
{
  "id": "rust-ownership-007",
  "course": "rust",
  "topic": "ownership",
  "level": "intermediate",
  "type": "output",
  "concept": "Реализация трейта Drop вызывается автоматически, когда переменная выходит из области видимости. Порядок drop — обратный порядку объявления.",
  "code": "struct Droppable(&'static str);\nimpl Drop for Droppable {\n    fn drop(&mut self) { println!(\"drop {}\", self.0); }\n}\nfn main() {\n    let _a = Droppable(\"a\");\n    let _b = Droppable(\"b\");\n}",
  "question": "Что выведет программа?",
  "options": ["drop a\ndrop b", "drop b\ndrop a", "drop a", "Ничего"],
  "answer": 1,
  "expected_output": "drop b\ndrop a",
  "explanation": "Переменные уничтожаются в порядке, обратном объявлению (LIFO). `_b` объявлен после `_a`, поэтому drop вызывается сначала для `_b`, потом для `_a`."
}
```

### Пример 3 — concept

```json
{
  "id": "rust-borrowing-001",
  "course": "rust",
  "topic": "borrowing",
  "level": "beginner",
  "type": "concept",
  "concept": "Borrowing позволяет использовать значение без передачи владения. Неизменяемая ссылка `&T` позволяет только читать данные. Одновременно может существовать сколько угодно неизменяемых ссылок.",
  "question": "Что такое borrowing в Rust?",
  "explanation": "Borrowing — это механизм временного доступа к данным через ссылки без передачи ownership. Компилятор гарантирует, что ссылки не переживут данные, на которые указывают (lifetime safety)."
}
```

## Пример плохой карточки с разбором

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

**Проблемы:**
- `id: "q1"` — нестабильный, не следует формату
- вопрос на английском (должен быть на русском)
- «A Rust concept» — тавтология, не несёт смысла
- `explanation: "Correct!"` — не объясняет механизм, нет «почему»
- нет полей `course`, `topic`, `level`, `concept`

**Правильный вариант:** см. Пример 3 выше.
