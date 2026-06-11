import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import Ajv from 'ajv'
import { createHash } from 'crypto'

const ROOT = resolve(process.cwd())
const COURSES_DIR = join(ROOT, 'courses')
const SCHEMA_PATH = join(ROOT, 'schema', 'card.schema.json')

const ajv = new Ajv({ allErrors: true })
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'))
const validate = ajv.compile(schema)

let errors = 0
const allIds = new Set<string>()
const allHashes = new Set<string>()

function collectJsonFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectJsonFiles(full))
    } else if (entry === 'cards.json') {
      files.push(full)
    }
  }
  return files
}

const files = collectJsonFiles(COURSES_DIR)
console.log(`Found ${files.length} cards.json files`)

for (const file of files) {
  const rel = file.replace(ROOT + '/', '')
  let cards: any[]
  try {
    cards = JSON.parse(readFileSync(file, 'utf-8'))
  } catch (e) {
    console.error(`[ERROR] ${rel}: invalid JSON`)
    errors++
    continue
  }

  if (!Array.isArray(cards)) {
    console.error(`[ERROR] ${rel}: root must be an array`)
    errors++
    continue
  }

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    const loc = `${rel}[${i}]`

    // Schema validation
    if (!validate(card)) {
      console.error(`[ERROR] ${loc} schema errors:`)
      for (const err of validate.errors ?? []) {
        console.error(`  ${err.instancePath} ${err.message}`)
      }
      errors++
      continue
    }

    // Unique ID check
    if (allIds.has(card.id)) {
      console.error(`[ERROR] ${loc}: duplicate id '${card.id}'`)
      errors++
    } else {
      allIds.add(card.id)
    }

    // Deduplication by normalized hash
    const normalized = JSON.stringify({
      code: (card.code ?? '').trim().replace(/\s+/g, ' '),
      question: card.question.trim().toLowerCase(),
    })
    const hash = createHash('sha256').update(normalized).digest('hex')
    if (allHashes.has(hash)) {
      console.error(`[ERROR] ${loc}: duplicate content hash (similar to existing card)`)
      errors++
    } else {
      allHashes.add(hash)
    }

    // Answer index in bounds
    if (card.options && card.answer !== undefined) {
      if (card.answer >= card.options.length) {
        console.error(`[ERROR] ${loc}: answer index ${card.answer} out of bounds (${card.options.length} options)`)
        errors++
      }
    }

    // compiles type requires expected field
    if (card.type === 'compiles' && !card.expected) {
      console.error(`[ERROR] ${loc}: type=compiles requires 'expected' field`)
      errors++
    }
  }
}

if (errors === 0) {
  console.log(`\n✓ All ${allIds.size} cards valid`)
} else {
  console.error(`\n✗ ${errors} error(s) found`)
  process.exit(1)
}
