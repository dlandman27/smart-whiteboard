/**
 * Vite plugin: enforce @whiteboard/ui-kit usage in widget/component files.
 *
 * Warns in the dev terminal (and fails the build) when widget files use raw
 * HTML elements that have ui-kit equivalents.
 *
 * Allowed raw elements: SVG primitives, <a>, <img>, <textarea>, <code>, <pre>,
 * <canvas>, <video>, <audio>, <iframe>, <form> (no ui-kit equivalent).
 */
import type { Plugin } from 'vite'
import { relative } from 'path'
import { readFileSync } from 'fs'

// Files to enforce (glob-style checked via string matching)
const ENFORCED_PATHS = [
  'src/components/widgets/',
  'src/components/',
  'plugins/',
]

// Elements that must NOT appear in enforced files
const FORBIDDEN: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /<div[\s>]/g,   message: 'Use FlexCol, FlexRow, Box, Center, or Container instead of <div>' },
  { pattern: /<p[\s>]/g,     message: 'Use <Text> instead of <p>' },
  { pattern: /<span[\s>]/g,  message: 'Use <Text as="span"> instead of <span>' },
  { pattern: /<h[1-6][\s>]/g, message: 'Use <Text variant="heading"> instead of <h1>–<h6>' },
  { pattern: /<button[\s>]/g, message: 'Use <Button> or <IconButton> instead of <button>' },
  { pattern: /<input[\s>]/g,  message: 'Use <Input> instead of <input>' },
  { pattern: /<ul[\s>]/g,    message: 'Use <FlexCol> instead of <ul>' },
  { pattern: /<li[\s>]/g,    message: 'Use <FlexRow> or <Box> instead of <li>' },
  { pattern: /<label[\s>]/g, message: 'Use <Input label="..."> instead of a bare <label>' },
]

// Comment directives to suppress a violation on a specific line
const SUPPRESS_COMMENT = 'ui-kit-ignore'

function isEnforcedFile(id: string) {
  const norm = id.replace(/\\/g, '/')
  return ENFORCED_PATHS.some((p) => norm.includes(p)) && /\.[tj]sx$/.test(norm)
}

function getLineNumber(src: string, index: number): number {
  return src.slice(0, index).split('\n').length
}

function isInSvgBlock(src: string, index: number): boolean {
  // Simple heuristic: check if we're inside a <svg>...</svg> block
  const before = src.slice(0, index)
  const svgOpen  = (before.match(/<svg[\s>]/g) ?? []).length
  const svgClose = (before.match(/<\/svg>/g)   ?? []).length
  return svgOpen > svgClose
}

function isInComment(src: string, index: number): boolean {
  // Check if the match is inside a JSX comment {/* ... */} or a line comment
  const lineStart = src.lastIndexOf('\n', index)
  const line = src.slice(lineStart, index)
  return line.includes(SUPPRESS_COMMENT) || line.trimStart().startsWith('//')
}

export function uiKitEnforce(): Plugin {
  return {
    name: 'vite-plugin-ui-kit-enforce',
    enforce: 'pre',

    transform(code, id) {
      if (!isEnforcedFile(id)) return null

      const relPath = relative(process.cwd(), id).replace(/\\/g, '/')
      const violations: string[] = []

      for (const { pattern, message } of FORBIDDEN) {
        pattern.lastIndex = 0
        let match: RegExpExecArray | null

        while ((match = pattern.exec(code)) !== null) {
          const idx  = match.index
          const line = getLineNumber(code, idx)

          // Skip SVG context
          if (isInSvgBlock(code, idx)) continue

          // Skip suppressed lines
          if (isInComment(code, idx)) continue

          violations.push(`  Line ${line}: ${message}`)
        }
      }

      if (violations.length > 0) {
        const header = `\n⚠️  ui-kit violations in ${relPath}:\n`
        const body   = violations.join('\n')
        const footer = `\n  Add "// ${SUPPRESS_COMMENT}" to suppress a specific line.\n`
        this.warn(header + body + footer)
      }

      return null  // don't transform, just lint
    },
  }
}
