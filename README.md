# dev::cards

PWA-приложение для изучения программирования через микро-уроки с spaced repetition (ts-fsrs). Mobile-first, оффлайн-режим, работает как PWA с установкой на домашний экран.

## Стек

- **Vite + React + TypeScript** — фронтенд
- **ts-fsrs** — FSRS-алгоритм spaced repetition
- **idb (IndexedDB)** — прогресс пользователя хранится локально
- **vite-plugin-pwa** — service worker, offline, установка на iOS/Android
- **GitHub Actions** — CI (валидация) + deploy (GitHub Pages)

## Быстрый старт

```bash
npm install
npm run dev
```

## Деплой на GitHub Pages

1. В настройках репо: **Settings → Pages → Source: GitHub Actions**
2. Проверь, что `vite.config.ts` имеет `base: '/dev-cards/'` (=название репо)
3. Merge в `main` — GitHub Actions соберёт и задеплоит автоматически
4. Приложение будет доступно по адресу `https://<user>.github.io/dev-cards/`

## Добавление карточек

### Через Claude Code (рекомендуется)

```
/add-cards 10 карточек по теме rust/traits уровня intermediate
```

Claude читает `CLAUDE.md`, генерирует карточки по схеме и добавляет в `courses/<course>/<topic>/cards.json`.

### Вручную

1. Добавь карточки в `courses/<course>/<topic>/cards.json`
2. Строго следуй схеме из `schema/card.schema.json` и `CLAUDE.md`
3. Проверь локально: `npm run validate`
4. Для Rust-сниппетов: `npm run check-rust` (CI проверяет автоматически)
5. Открой PR — CI валидирует всё автоматически

## Структура

```
dev-cards/
├── CLAUDE.md                  # схема, правила, примеры
├── schema/card.schema.json    # JSON Schema
├── courses/                   # карточки = контент = код
│   ├── rust/ownership/
│   ├── rust/borrowing/
│   ├── rust/lifetimes/
│   ├── algorithms/big-o/
│   ├── blockchain/basics/
│   └── crypto/hashing/
├── src/                       # React фронтенд
├── scripts/
│   ├── validate.ts            # валидация схемы + дедупликация
│   └── check-rust.ts          # проверка Rust-сниппетов
└── .github/workflows/
    ├── validate.yml           # CI на PR
    └── deploy.yml             # деплой на Pages
```

## Прогресс пользователя

Хранится локально в IndexedDB браузера. Обновление карточек не сбрасывает прогресс — он привязан к стабильному `card.id`.
