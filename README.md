# dev::cards

Spaced repetition для разработчиков. Карточки с кодом, вопросы в стиле компилятора, прогресс в браузере без бэкенда.

**[→ Открыть приложение](https://nckdistributable.github.io/dev-cards/)**

---

## Как пользоваться

Открой ссылку выше на телефоне → через меню браузера добавь на домашний экран. Работает офлайн.

Сессия перемешивает карточки из всех курсов по алгоритму [FSRS](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm). После ответа выбираешь одну из четырёх оценок — **Снова / Трудно / Хорошо / Легко** — и карточка уходит на повторение через соответствующий интервал.

---

## Добавить карточки

Через Claude Code:

```
/add-cards 10 карточек по теме rust/traits уровня intermediate
```

Вручную — добавь объекты в `courses/<course>/<topic>/cards.json`, открой PR. CI проверит схему, уникальность id и Rust-сниппеты через `cargo check`.

Правила и примеры — в [`CLAUDE.md`](./CLAUDE.md).

---

## Разработка

```bash
npm install
npm run dev
```

```bash
npm run validate    # проверка схемы и дедупликация
npm run check-rust  # cargo check всех Rust-сниппетов
```

---

## Стек

| | |
|---|---|
| UI | React 18 + Vite + TypeScript |
| SRS | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) |
| Хранилище | IndexedDB через [idb](https://github.com/jakearchibald/idb) |
| PWA | vite-plugin-pwa + Workbox |
| Деплой | GitHub Actions → GitHub Pages |

Прогресс привязан к `card.id` — обновление контента карточек его не сбрасывает.
