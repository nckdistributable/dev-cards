# Add cards

Add $ARGUMENTS cards to the appropriate `courses/<course>/<topic>/cards.json`.

## Instructions

1. Read `CLAUDE.md` to understand the schema and quality rules
2. Read the existing `courses/<course>/<topic>/cards.json` (if any) to avoid duplicating ids and topics
3. Generate cards strictly according to the schema in `schema/card.schema.json`
4. Batch requirements:
   - All question types are represented (concept, compiles, output, choice, fill)
   - compiles: ~50% `expected: compiles`, ~50% `expected: fails`
   - Questions in Russian, code and terms in English
   - The explanation always includes the "why" — the mechanism, not just "correct"
   - Snippets ≤ 12 lines
5. Append the new cards to the array (do not replace existing ones)
6. Run `npm run validate` to check

## Invocation format

```
/add-cards 10 cards on the topic rust/traits at the intermediate level
/add-cards 6 cards on the topic algorithms/sorting at the beginner level
```
