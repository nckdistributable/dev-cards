# dev::cards

Spaced repetition for developers. Code flashcards, compiler-style questions, progress tracked in the browser with no backend.

**[→ Open the app](https://nckdistributable.github.io/dev-cards/)**

---

## How to use

Open the link above on your phone, then use the browser menu to add it to your home screen. It works offline.

A session shuffles cards from all courses using the [FSRS](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) algorithm. After answering, you pick one of four ratings — **Again / Hard / Good / Easy** — and the card is scheduled for review after the corresponding interval.

---

## Adding cards

Via Claude Code:

```
/add-cards 10 cards on the topic rust/traits at intermediate level
```

Manually — add objects to `courses/<course>/<topic>/cards.json` and open a PR. CI checks the schema, id uniqueness, and Rust snippets via `cargo check`.

Rules and examples are in [`CLAUDE.md`](./CLAUDE.md).

---

## Development

```bash
npm install
npm run dev
```

```bash
npm run validate    # schema check and deduplication
npm run check-rust  # cargo check of all Rust snippets
```

---

## Stack

| | |
|---|---|
| UI | React 18 + Vite + TypeScript |
| SRS | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) |
| Storage | IndexedDB via [idb](https://github.com/jakearchibald/idb) |
| PWA | vite-plugin-pwa + Workbox |
| Deploy | GitHub Actions → GitHub Pages |

Progress is tied to `card.id` — updating card content does not reset it.
