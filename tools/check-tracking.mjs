#!/usr/bin/env node
// Checks that the roadmap, workboard, session logs and decisions index are
// well-formed and consistent with each other (decision 0010).
//
//   node tools/check-tracking.mjs          check everything; exit 1 on errors
//   node tools/check-tracking.mjs --next   print the tasks that can be claimed now
//
// No dependencies: runs on plain Node 20+.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

const errors = []
const warnings = []
const err = (where, msg) => errors.push(`${where}: ${msg}`)
const warn = (where, msg) => warnings.push(`${where}: ${msg}`)

const TASK_ID = /^P\d-\d{2}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const HANDLE = /^@[A-Za-z0-9-]+$/
const STATUSES = new Set(['in-progress', 'blocked', 'in-review'])
const STALE_DAYS = 7

// ---------------------------------------------------------------- roadmap

function parseRoadmap() {
  const lines = read('docs/ROADMAP.md').split('\n')
  const tasks = new Map()
  let phase = null
  let current = null
  lines.forEach((line, i) => {
    const where = `docs/ROADMAP.md:${i + 1}`
    const phaseMatch = line.match(/^## Phase (\d+) /)
    if (phaseMatch) {
      phase = Number(phaseMatch[1])
      current = null
      return
    }
    if (line.startsWith('#### ')) {
      const m = line.match(/^#### \[( |x)\] (P\d-\d{2}) — (.+)$/)
      if (!m) {
        err(where, 'task heading must be "#### [ ] PN-NN — Title" (em dash)')
        current = null
        return
      }
      const [, box, id, title] = m
      if (tasks.has(id)) err(where, `duplicate task ID ${id}`)
      if (phase === null) err(where, `${id} is outside a "## Phase N" section`)
      else if (Number(id[1]) !== phase) err(where, `${id} is listed under Phase ${phase}`)
      current = { id, title, done: box === 'x', deps: null, size: null, line: i + 1, items: [] }
      tasks.set(id, current)
      return
    }
    if (!current) return
    const deps = line.match(/^- \*\*Depends on:\*\* (.+)$/)
    if (deps) {
      const raw = deps[1].trim()
      current.deps = raw === '—' ? [] : raw.split(',').map((s) => s.trim())
      return
    }
    const size = line.match(/^- \*\*Size:\*\* (.+)$/)
    if (size) {
      current.size = size[1].trim()
      return
    }
    const item = line.match(/^ {2}- \[( |x)\] /)
    if (item) current.items.push(item[1] === 'x')
  })

  for (const t of tasks.values()) {
    const where = `docs/ROADMAP.md:${t.line} ${t.id}`
    if (t.deps === null) err(where, 'missing "- **Depends on:**" line')
    if (!['S', 'M', 'L'].includes(t.size)) err(where, 'Size must be S, M or L')
    if (t.items.length === 0) err(where, 'needs at least one "done when" checkbox')
    if (t.done && t.items.some((x) => !x)) err(where, 'marked [x] but has unticked "done when" items')
    for (const d of t.deps ?? []) {
      if (!TASK_ID.test(d)) err(where, `dependency "${d}" is not a task ID`)
      else if (!tasks.has(d)) err(where, `depends on unknown task ${d}`)
      else if (d === t.id) err(where, 'depends on itself')
    }
  }
  return tasks
}

// -------------------------------------------------------------- workboard

function parseWorkboard(tasks) {
  const lines = read('docs/WORKBOARD.md').split('\n')
  const rows = []
  const upNext = []
  let inTable = false
  let inUpNext = false
  const today = new Date()

  lines.forEach((line, i) => {
    const where = `docs/WORKBOARD.md:${i + 1}`
    if (line.startsWith('| Task |')) {
      inTable = true
      return
    }
    if (line.startsWith('## Up next')) {
      inUpNext = true
      inTable = false
      return
    }
    if (inTable) {
      if (!line.startsWith('|')) {
        inTable = false
        return
      }
      if (/^\|\s*-+/.test(line)) return
      const cells = line.split('|').slice(1, -1).map((c) => c.trim())
      if (cells.length !== 7) {
        err(where, `row needs 7 cells, has ${cells.length}`)
        return
      }
      const [id, owner, status, branch, started, updated, next] = cells
      rows.push({ id, owner, status, line: i + 1 })
      if (!TASK_ID.test(id)) err(where, `"${id}" is not a task ID`)
      else if (!tasks.has(id)) err(where, `${id} is not in the roadmap`)
      else {
        const t = tasks.get(id)
        if (t.done) err(where, `${id} is done in the roadmap; remove its row`)
        const open = t.deps.filter((d) => tasks.get(d) && !tasks.get(d).done)
        if (open.length) warn(where, `${id} is claimed but depends on unfinished ${open.join(', ')}`)
      }
      if (!HANDLE.test(owner)) err(where, `owner "${owner}" must be a @handle`)
      if (!STATUSES.has(status)) err(where, `status must be one of ${[...STATUSES].join(', ')}`)
      if (!branch.replace(/`/g, '')) err(where, 'branch is empty')
      for (const [name, d] of [['Started', started], ['Updated', updated]]) {
        if (!DATE.test(d)) err(where, `${name} "${d}" must be YYYY-MM-DD`)
      }
      if (DATE.test(updated)) {
        const days = (today - new Date(updated + 'T00:00:00Z')) / 86_400_000
        if (days > STALE_DAYS) warn(where, `${id} not updated for ${Math.floor(days)} days (stale)`)
      }
      if (!next) err(where, 'next step is empty')
      return
    }
    if (inUpNext) {
      const m = line.match(/^- \*\*(P\d-\d{2})\*\*/)
      if (m) upNext.push({ id: m[1], line: i + 1 })
    }
  })

  const seen = new Map()
  for (const r of rows) {
    if (seen.has(r.id)) err(`docs/WORKBOARD.md:${r.line}`, `${r.id} has more than one row (one owner per task)`)
    seen.set(r.id, r)
  }
  return { rows, upNext }
}

function claimable(tasks, rows) {
  const claimed = new Set(rows.map((r) => r.id))
  return [...tasks.values()].filter(
    (t) => !t.done && !claimed.has(t.id) && (t.deps ?? []).every((d) => tasks.get(d)?.done),
  )
}

// ------------------------------------------------------- sessions/decisions

function checkSessions() {
  const dir = join(root, 'docs/sessions')
  if (!existsSync(dir)) return
  const pattern = /^\d{4}-\d{2}-\d{2}-([A-Za-z0-9-]+)(-\d+)?\.md$/
  for (const f of readdirSync(dir)) {
    if (f === 'README.md' || f === '.gitkeep') continue
    if (!pattern.test(f)) err(`docs/sessions/${f}`, 'name must be YYYY-MM-DD-<handle>-<task-id>.md or YYYY-MM-DD-phase-<N>-review.md')
  }
}

function checkDecisions() {
  const dir = join(root, 'docs/decisions')
  const files = readdirSync(dir).filter((f) => /^\d{4}-.+\.md$/.test(f))
  const index = read('docs/decisions/README.md')
  const numbers = new Set()
  for (const f of files) {
    const n = f.slice(0, 4)
    if (numbers.has(n)) err(`docs/decisions/${f}`, `decision number ${n} is used twice`)
    numbers.add(n)
    if (!index.includes(`(${f})`)) err(`docs/decisions/README.md`, `index doesn't link ${f}`)
    const status = read(`docs/decisions/${f}`).match(/^- \*\*Status:\*\* (.+)$/m)
    if (!status) err(`docs/decisions/${f}`, 'missing "- **Status:**" line')
    else if (!/^(Proposed|Accepted|Superseded by \d{4}|Rejected)/.test(status[1])) {
      err(`docs/decisions/${f}`, `unknown status "${status[1]}"`)
    }
  }
}

// ------------------------------------------------------------------- main

const tasks = parseRoadmap()
const { rows, upNext } = parseWorkboard(tasks)
const open = claimable(tasks, rows)

if (process.argv.includes('--next')) {
  if (open.length === 0) console.log('No tasks can be claimed right now.')
  for (const t of open) console.log(`- **${t.id}** — ${t.title}`)
  process.exit(0)
}

checkSessions()
checkDecisions()

const expected = open.map((t) => t.id).sort()
const listed = upNext.map((u) => u.id).sort()
if (expected.join() !== listed.join()) {
  err(
    'docs/WORKBOARD.md "Up next"',
    `should list exactly [${expected.join(', ')}] but lists [${listed.join(', ')}]. ` +
      'Paste the output of `node tools/check-tracking.mjs --next`.',
  )
}

const done = [...tasks.values()].filter((t) => t.done).length
for (const w of warnings) console.warn(`warning  ${w}`)
for (const e of errors) console.error(`error    ${e}`)
console.log(
  `${errors.length ? '✗' : '✓'} tracking: ${tasks.size} tasks (${done} done), ` +
    `${rows.length} claimed, ${open.length} claimable, ${errors.length} errors, ${warnings.length} warnings`,
)
process.exit(errors.length ? 1 : 0)
