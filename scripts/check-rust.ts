import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

const ROOT = resolve(process.cwd())
const COURSES_DIR = join(ROOT, 'courses')

function collectJsonFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...collectJsonFiles(full))
    else if (entry === 'cards.json') files.push(full)
  }
  return files
}

const files = collectJsonFiles(COURSES_DIR)
let errors = 0
let checked = 0

for (const file of files) {
  const cards: any[] = JSON.parse(readFileSync(file, 'utf-8'))
  const rel = file.replace(ROOT + '/', '')

  for (const card of cards) {
    if (!card.code) continue
    if (card.course !== 'rust' && card.course !== 'algorithms') continue

    const needsCheck = card.type === 'compiles' || card.type === 'output'
    if (!needsCheck) continue

    // Wrap snippet in fn main if needed
    let src = card.code
    if (!src.includes('fn main')) {
      src = `fn main() {\n${src}\n}`
    }

    const dir = join(tmpdir(), `dev-cards-${card.id}`)
    const srcDir = join(dir, 'src')
    mkdirSync(srcDir, { recursive: true })
    writeFileSync(join(srcDir, 'main.rs'), src)
    writeFileSync(
      join(dir, 'Cargo.toml'),
      `[package]\nname = "check"\nversion = "0.1.0"\nedition = "2021"\n`
    )

    checked++
    try {
      if (card.type === 'compiles') {
        try {
          execSync('cargo check 2>&1', { cwd: dir, stdio: 'pipe' })
          // Compiled successfully
          if (card.expected === 'fails') {
            console.error(`[FAIL] ${rel} card ${card.id}: expected to fail but compiled`)
            errors++
          } else {
            console.log(`[OK]   ${card.id}: compiles ✓`)
          }
        } catch {
          // Failed to compile
          if (card.expected === 'compiles') {
            console.error(`[FAIL] ${rel} card ${card.id}: expected to compile but failed`)
            errors++
          } else {
            console.log(`[OK]   ${card.id}: fails ✓`)
          }
        }
      } else if (card.type === 'output') {
        const output = execSync('cargo run 2>/dev/null', { cwd: dir, encoding: 'utf-8' }).trim()
        const expected = (card.expected_output ?? '').trim()
        if (output === expected) {
          console.log(`[OK]   ${card.id}: output ✓`)
        } else {
          console.error(`[FAIL] ${rel} card ${card.id}: expected '${expected}' got '${output}'`)
          errors++
        }
      }
    } finally {
      try { rmSync(dir, { recursive: true }) } catch {}
    }
  }
}

if (errors === 0) {
  console.log(`\n✓ ${checked} Rust snippets checked`)
} else {
  console.error(`\n✗ ${errors} error(s)`)
  process.exit(1)
}
