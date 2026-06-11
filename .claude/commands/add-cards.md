# Добавить карточки

Добавь $ARGUMENTS карточек в соответствующий `courses/<course>/<topic>/cards.json`.

## Инструкция

1. Прочитай `CLAUDE.md` для понимания схемы и правил качества
2. Прочитай существующий `courses/<course>/<topic>/cards.json` (если есть) чтобы не дублировать id и темы
3. Сгенерируй карточки строго по схеме из `schema/card.schema.json`
4. Требования к батчу:
   - Все типы вопросов представлены (concept, compiles, output, choice, fill)
   - compiles: ~50% `expected: compiles`, ~50% `expected: fails`
   - Вопросы на русском, код и термины на английском
   - Объяснение всегда содержит «почему» — механизм, а не просто «правильно»
   - Сниппеты ≤ 12 строк
5. Добавь новые карточки в массив (не заменяй существующие)
6. Прогони `npm run validate` для проверки

## Формат вызова

```
/add-cards 10 карточек по теме rust/traits уровня intermediate
/add-cards 6 карточек по теме algorithms/sorting уровня beginner
```
