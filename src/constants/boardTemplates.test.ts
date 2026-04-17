import { describe, it, expect } from 'vitest'
import { BOARD_TEMPLATES, type BoardTemplate, type BoardTemplateWidget } from './boardTemplates'

describe('boardTemplates constants', () => {
  describe('BOARD_TEMPLATES', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(BOARD_TEMPLATES)).toBe(true)
      expect(BOARD_TEMPLATES.length).toBeGreaterThan(0)
    })

    it('every template has required string fields: id, name, description, icon, layoutId', () => {
      for (const tmpl of BOARD_TEMPLATES) {
        expect(typeof tmpl.id).toBe('string')
        expect(tmpl.id.length).toBeGreaterThan(0)

        expect(typeof tmpl.name).toBe('string')
        expect(tmpl.name.length).toBeGreaterThan(0)

        expect(typeof tmpl.description).toBe('string')
        expect(tmpl.description.length).toBeGreaterThan(0)

        expect(typeof tmpl.icon).toBe('string')
        expect(tmpl.icon.length).toBeGreaterThan(0)

        expect(typeof tmpl.layoutId).toBe('string')
        expect(tmpl.layoutId.length).toBeGreaterThan(0)
      }
    })

    it('every template has a widgets array', () => {
      for (const tmpl of BOARD_TEMPLATES) {
        expect(Array.isArray(tmpl.widgets)).toBe(true)
      }
    })

    it('all template ids are unique', () => {
      const ids = BOARD_TEMPLATES.map((t) => t.id)
      const unique = new Set(ids)
      expect(unique.size).toBe(ids.length)
    })

    it('includes a blank canvas template with empty widgets', () => {
      const blank = BOARD_TEMPLATES.find((t) => t.id === 'blank')
      expect(blank).toBeDefined()
      expect(blank!.widgets).toHaveLength(0)
    })
  })

  describe('template widgets', () => {
    const allWidgets = BOARD_TEMPLATES.flatMap((t) => t.widgets)

    it('every widget has a non-empty type string', () => {
      for (const w of allWidgets) {
        expect(typeof w.type).toBe('string')
        expect(w.type.length).toBeGreaterThan(0)
      }
    })

    it('every widget has a non-empty variantId string', () => {
      for (const w of allWidgets) {
        expect(typeof w.variantId).toBe('string')
        expect(w.variantId.length).toBeGreaterThan(0)
      }
    })

    it('every widget has a settings object', () => {
      for (const w of allWidgets) {
        expect(typeof w.settings).toBe('object')
        expect(w.settings).not.toBeNull()
      }
    })

    it('every widget type starts with @whiteboard/', () => {
      for (const w of allWidgets) {
        expect(w.type).toMatch(/^@whiteboard\//)
      }
    })

    it('widgets with slotId have non-empty string slotIds', () => {
      const withSlot = allWidgets.filter((w) => w.slotId !== undefined)
      for (const w of withSlot) {
        expect(typeof w.slotId).toBe('string')
        expect((w.slotId as string).length).toBeGreaterThan(0)
      }
    })
  })

  describe('individual templates', () => {
    it('family-hub template has at least 4 widgets', () => {
      const tmpl = BOARD_TEMPLATES.find((t) => t.id === 'family-hub')
      expect(tmpl).toBeDefined()
      expect(tmpl!.widgets.length).toBeGreaterThanOrEqual(4)
    })

    it('home-office template has a pomodoro widget', () => {
      const tmpl = BOARD_TEMPLATES.find((t) => t.id === 'home-office')
      expect(tmpl).toBeDefined()
      const hasPomodoro = tmpl!.widgets.some((w) => w.type.includes('pomodoro'))
      expect(hasPomodoro).toBe(true)
    })

    it('sports-fan template has sports widgets', () => {
      const tmpl = BOARD_TEMPLATES.find((t) => t.id === 'sports-fan')
      expect(tmpl).toBeDefined()
      const sportsWidgets = tmpl!.widgets.filter((w) =>
        ['nfl', 'nba', 'epl'].some((sport) => w.type.includes(sport))
      )
      expect(sportsWidgets.length).toBeGreaterThan(0)
    })
  })
})
