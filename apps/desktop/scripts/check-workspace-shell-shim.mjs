#!/usr/bin/env node
// Shim-vs-real prop-key parity check (design/code-review PR #103, finding V2).
//
// `tsconfig.app.json` redirects `@shipyard/workspace-shell` to a local shim
// (`src/toolbox/workspace-shell.d.ts`) because the real package's raw-TS source
// reaches into `shipyard/_shared/design`, which `tsc` can't resolve through the
// worktree `file:` symlink. That means `tsc` NEVER typechecks against the real
// shell source -- only Vite bundles it. If the shell's public props change, tsc
// stays green against the stale shim while the bundle silently diverges (a
// hand-parallel drift canary CI cannot otherwise catch).
//
// This script extracts the `WorkspaceShellProps` field names from BOTH the real
// package source and the local shim (simple brace-depth-aware regex parse -- no
// TS compiler API dependency) and fails if the shim is missing any real field.
// An extra field on the shim (over-widening) is a warning, not a failure -- the
// dangerous direction is the shim promising a prop the real component doesn't
// have, or silently dropping one it does.
//
// Run: `node scripts/check-workspace-shell-shim.mjs` (wired into CI).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
// Resolve through the installed node_modules symlink (the SAME path Vite/tsc
// resolve `@shipyard/workspace-shell` through) rather than a hand-computed
// `../../../shipyard` relative path -- portable across a plain checkout, a
// `.worktrees/<branch>` worktree (one directory level deeper), and CI's
// sparse-checked-out sibling, all of which place the real fleet-root
// `shipyard/` at a different relative depth.
const SHIM_PATH = path.resolve(here, '../src/toolbox/workspace-shell.d.ts')
const REAL_PATH = path.resolve(here, '../node_modules/@shipyard/workspace-shell/src/WorkspaceShell.tsx')

/**
 * Extract the field names of an `interface <name> { ... }` block from TS source.
 * Handles nested braces (e.g. inline object types) via depth tracking; ignores
 * comment lines. Good enough for a flat props interface -- not a general TS parser.
 */
function extractInterfaceFields(source, interfaceName) {
  const start = source.indexOf(`interface ${interfaceName}`)
  if (start === -1) {
    throw new Error(`interface ${interfaceName} not found`)
  }
  const braceStart = source.indexOf('{', start)
  let depth = 0
  let end = braceStart
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }
  const body = source.slice(braceStart + 1, end)

  const fields = new Set()
  let braceDepth = 0
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue
    // Only capture field declarations at the top level of the interface (depth 0
    // BEFORE this line's own braces are counted) -- skips nested inline types.
    if (braceDepth === 0) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\??\s*:/)
      if (m) fields.add(m[1])
    }
    for (const ch of line) {
      if (ch === '{') braceDepth++
      else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1)
    }
  }
  return fields
}

function main() {
  const realSource = readFileSync(REAL_PATH, 'utf8')
  const shimSource = readFileSync(SHIM_PATH, 'utf8')

  const realFields = extractInterfaceFields(realSource, 'WorkspaceShellProps')
  const shimFields = extractInterfaceFields(shimSource, 'WorkspaceShellProps')

  const missingFromShim = [...realFields].filter((f) => !shimFields.has(f))
  const extraInShim = [...shimFields].filter((f) => !realFields.has(f))

  if (missingFromShim.length > 0) {
    console.error(
      `FAIL: @shipyard/workspace-shell's real WorkspaceShellProps has field(s) the ` +
      `local shim (src/toolbox/workspace-shell.d.ts) is missing: ${missingFromShim.join(', ')}\n` +
      `tsc will stay green against the stale shim while Vite bundles the real (changed) ` +
      `component -- update the shim to match.`,
    )
    process.exit(1)
  }

  if (extraInShim.length > 0) {
    console.warn(
      `WARN: shim declares field(s) not present on the real WorkspaceShellProps: ` +
      `${extraInShim.join(', ')} (safe widening, but verify it's still accurate).`,
    )
  }

  console.log(
    `OK: shim WorkspaceShellProps (${shimFields.size} fields) covers every real prop ` +
    `(${realFields.size} fields).`,
  )
}

main()
