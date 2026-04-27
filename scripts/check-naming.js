#!/usr/bin/env node
/**
 * Checks that user-facing copy and variable names use "wiigit/wiigits"
 * not "widget/widgets". Ignores third-party API types, SDK internals,
 * and a small allow-list of unavoidable technical terms.
 */

import { execSync } from 'child_process'
import path from 'path'

// Patterns that legitimately contain "widget" and are not our copy/naming
const IGNORE_PATTERNS = [
  // Third-party SDK hooks/types we import from
  /useWidgetSettings/,
  /useWidgetSizeContext/,
  /WidgetProps/,
  /WidgetLayout/,
  /WidgetCanvas/,       // internal component name (legacy, low priority)
  /PendingWidget/,      // internal type
  // CLAUDE.md itself documents the rule
  /CLAUDE\.md/,
  // This script
  /check-naming\.js/,
  // Test files that test widget internals
  /\.test\./,
  /\.spec\./,
  // Supabase / DB column names we don't control
  /"widget_/,
  /'widget_/,
  // MCP schema keys that mirror DB shape
  /widget_type/,
  /widget_id/,
  // registry.tsx defines the system (unavoidable)
  /registry\.tsx/,
  // Type-level: WidgetLayout, WidgetDefaults, etc.
  /Widget[A-Z]/,
]

const SEARCH_DIRS = ['src', 'mcp', 'server']

// Run ripgrep for the word "widget" (case-insensitive) in source files
let raw
try {
  raw = execSync(
    `rg -n --glob "*.{ts,tsx}" -i "\\bwidgets?\\b" ${SEARCH_DIRS.join(' ')}`,
    { cwd: path.resolve(import.meta.dirname, '..'), encoding: 'utf8' }
  )
} catch (e) {
  // rg exits 1 when no matches — that's a pass
  if (e.status === 1) {
    console.log('✓ No "widget" naming violations found.')
    process.exit(0)
  }
  throw e
}

const lines = raw.split('\n').filter(Boolean)
const violations = lines.filter(line => !IGNORE_PATTERNS.some(rx => rx.test(line)))

if (violations.length === 0) {
  console.log('✓ No "widget" naming violations found.')
  process.exit(0)
} else {
  console.error(`✗ Found ${violations.length} place(s) using "widget" instead of "wiigit":\n`)
  violations.forEach(v => console.error(' ', v))
  console.error('\nRename these to "wiigit" / "wiigits" in UI copy and variable names.')
  process.exit(1)
}
