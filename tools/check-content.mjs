#!/usr/bin/env node
// Checks the built-in content in plugin/content/ with the mod's own loader:
// every file valid, each biome's odds table printed and sanity-checked.
//
//   npm run check:content           (Node 22.18+)
//
// Fails (exit 1) on any content issue, or when the P2-09 rules break: each
// biome has a common, an uncommon and a rare Modster, at least one legendary
// across all biomes, and every sprite has 2–4 frames. Every built-in Modster
// also needs a complete dex with a unique number (decision 0017 point 4).
import './ts-resolve.mjs'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const { loadContent, formatIssue } = await import('../plugin/hooks/content/index.ts')
const { oddsTable, formatOddsTable } = await import('../plugin/hooks/game/index.ts')

const root = fileURLToPath(new URL('../plugin/content', import.meta.url))
const reader = {
  async listFolders(path) {
    if (!existsSync(path)) return []
    return readdirSync(path, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  },
  async readText(path) {
    return existsSync(path) ? readFileSync(path, 'utf8') : undefined
  },
}

const content = await loadContent(reader, root)
const problems = content.issues.filter((issue) => issue.severity === 'error').map(formatIssue)
const warnings = content.issues.filter((issue) => issue.severity === 'warning').map(formatIssue)

const modsters = new Map([...content.modsters].map(([id, loaded]) => [id, loaded.modster]))
const tiersSeen = new Set()
for (const { biome } of content.biomes.values()) {
  const rows = oddsTable(biome, modsters)
  console.log(`\n${biome.name} (${biome.id})\n${formatOddsTable(rows)}`)
  const tiers = new Set(rows.map((row) => row.tier))
  rows.forEach((row) => tiersSeen.add(row.tier))
  for (const tier of ['common', 'uncommon', 'rare']) {
    if (!tiers.has(tier)) problems.push(`biomes/${biome.id}: has no ${tier} Modster (P2-09)`)
  }
}
if (content.biomes.size > 0 && !tiersSeen.has('legendary')) problems.push('no biome has a legendary Modster (P2-09)')
for (const [id, { sprite }] of content.modsters) {
  if (sprite.frames.length < 2 || sprite.frames.length > 4) {
    problems.push(`modsters/${id}: ${sprite.frames.length} frames; built-in sprites have 2–4 (P2-09)`)
  }
}

const DEX_FIELDS = ['number', 'types', 'category', 'heightM', 'weightKg', 'entry']
const numbers = new Map()
for (const [id, { modster }] of content.modsters) {
  const missing = DEX_FIELDS.filter((field) => modster.dex?.[field] === undefined)
  if (missing.length > 0) problems.push(`modsters/${id}: dex is missing ${missing.join(', ')}; built-in Modsters need a complete dex (0017)`)
  const number = modster.dex?.number
  if (number === undefined) continue
  if (numbers.has(number)) problems.push(`modsters/${id}: dex number ${number} is also ${numbers.get(number)}'s (0017)`)
  else numbers.set(number, id)
}

console.log(`\n${content.biomes.size} biomes, ${content.modsters.size} Modsters`)
for (const line of warnings) console.log(`warning: ${line}`)
for (const line of problems) console.error(`error: ${line}`)
process.exit(problems.length > 0 ? 1 : 0)
