import { useState } from 'react'
import { FlexRow, FlexCol, Box, Text, Icon, ScrollArea, Button } from '@whiteboard/ui-kit'
import { supabase } from '../lib/supabase'
import { ThemePicker } from './ThemePicker'
import { BackgroundPicker } from './BackgroundPicker'
import { SchedulePanel } from './SchedulePanel'
import { AgentManager } from './AgentManager'
import { useThemeStore } from '../store/theme'
import { DEFAULT_BACKGROUND } from '../constants/backgrounds'
import { SPRITES, PX, PixelSprite } from './PetBar'
import { AgentManager } from './AgentManager'

// ── SectionLabel helper ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      variant="label"
      size="small"
      style={{
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight:    700,
        opacity:       0.5,
      }}
      color="muted"
    >
      {children}
    </Text>
  )
}

// ── Section: Appearance ───────────────────────────────────────────────────────

function AppearanceSection() {
  const { background, setBackground } = useThemeStore()
  return (
    <FlexCol gap="5">
      <div>
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Theme</SectionLabel>
        </div>
        <ThemePicker />
      </div>

      <Box style={{ height: 1, background: 'var(--wt-border)' }} />

      <div>
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Default Background</SectionLabel>
        </div>
        <BackgroundPicker background={background ?? DEFAULT_BACKGROUND} onSelect={setBackground} />
      </div>
    </FlexCol>
  )
}

// ── Section: General ──────────────────────────────────────────────────────────

const SPRITE_NAMES: Record<string, string> = {
  cat: 'Cat', dog: 'Dog', robot: 'Robot', bunny: 'Bunny',
  ghost: 'Ghost', owl: 'Owl', bear: 'Bear', frog: 'Frog',
  penguin: 'Penguin', alien: 'Alien', dragon: 'Dragon', fox: 'Fox',
  wizard: 'Wizard', ninja: 'Ninja', dino: 'Dino', astronaut: 'Astro',
}

function PetsSection() {
  const { petsEnabled, setPetsEnabled } = useThemeStore()

  return (
    <FlexCol gap="md">
      {/* Toggle card */}
      <div
        style={{
          background:   'var(--wt-surface)',
          border:       '1px solid var(--wt-border)',
          borderRadius: 12,
          padding:      '14px 16px',
        }}
      >
        <FlexRow align="center" style={{ justifyContent: 'space-between' }}>
          <div>
            <Text variant="label" size="medium" style={{ fontWeight: 600, color: 'var(--wt-text)' }}>
              Agent Pets
            </Text>
            <Text variant="body" size="small" color="muted" style={{ marginTop: 2 }}>
              Pixel art pets that walk along the bottom of the board
            </Text>
          </div>
          <button
            onClick={() => setPetsEnabled(!petsEnabled)}
            className="relative flex-shrink-0 transition-colors rounded-full"
            style={{
              width:           42,
              height:          24,
              backgroundColor: petsEnabled ? 'var(--wt-accent)' : 'var(--wt-border)',
              border:          'none',
              cursor:          'pointer',
              padding:         3,
            }}
          >
            <span
              className="block rounded-full bg-white transition-transform"
              style={{
                width:     18,
                height:    18,
                transform: petsEnabled ? 'translateX(18px)' : 'translateX(0)',
              }}
            />
          </button>
        </FlexRow>
      </div>

      {/* Sprite gallery */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Available Sprites</SectionLabel>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(SPRITES).map(([key, sprite]) => (
            <div
              key={key}
              className="flex flex-col items-center gap-2 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}
            >
              <PixelSprite sprite={sprite} frameIdx={0} flip={false} />
              <span className="text-[11px]" style={{ color: 'var(--wt-text-muted)' }}>
                {SPRITE_NAMES[key] ?? key}
              </span>
            </div>
          ))}
        </div>
      </div>
    </FlexCol>
  )
}

function BriefingSection() {
  const [time,  setTime]  = useState('')
  const [saved, setSaved] = useState(false)

  // load saved time once
  useState(() => {
    fetch('/api/briefing/settings').then(r => r.json()).then((d: any) => setTime(d.time ?? '')).catch(() => {})
  })

  async function save() {
    await fetch('/api/briefing/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function preview() {
    const r = await fetch('/api/briefing')
    const { text } = await r.json() as any
    if (text) {
      const { useBriefingStore } = await import('../store/briefing')
      useBriefingStore.getState().trigger(text)
    }
  }

  return (
    <div
      style={{
        background:   'var(--wt-surface)',
        border:       '1px solid var(--wt-border)',
        borderRadius: 12,
        padding:      '14px 16px',
      }}
    >
      <FlexCol gap="3">
        <div>
          <SectionLabel>Morning Briefing</SectionLabel>
          <Text variant="body" size="small" color="muted" style={{ marginTop: 6 }}>
            Walli greets you with weather, calendar, tasks, and sports at this time each day.
          </Text>
        </div>
        <FlexRow gap="sm" align="center">
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{
              flex:         1,
              padding:      '6px 10px',
              fontSize:     13,
              borderRadius: 8,
              border:       '1px solid var(--wt-border)',
              background:   'var(--wt-surface)',
              color:        'var(--wt-text)',
              outline:      'none',
            }}
          />
          <button
            onClick={save}
            style={{
              padding:      '6px 16px',
              borderRadius: 8,
              fontSize:     13,
              fontWeight:   500,
              border:       'none',
              cursor:       'pointer',
              background:   saved ? 'var(--wt-surface-hover)' : 'var(--wt-accent)',
              color:        saved ? 'var(--wt-text-muted)' : 'var(--wt-accent-text)',
            }}
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </FlexRow>
        <button
          onClick={preview}
          style={{
            padding:     '6px 14px',
            borderRadius: 8,
            fontSize:    13,
            fontWeight:  500,
            cursor:      'pointer',
            textAlign:   'left',
            background:  'var(--wt-bg)',
            color:       'var(--wt-text)',
            border:      '1px solid var(--wt-border)',
          }}
        >
          Preview briefing now
        </button>
      </FlexCol>
    </div>
  )
}

function GeneralSection() {
  return (
    <FlexCol style={{ gap: 32 }}>
      <BriefingSection />
      <Box style={{ height: 1, background: 'var(--wt-border)' }} />
      <div>
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Display</SectionLabel>
        </div>
        <SchedulePanel />
      </div>
    </FlexCol>
  )
}

function AgentsSection() {
  return (
    <FlexCol style={{ gap: 32 }}>
      <AgentManager />
      <Box style={{ height: 1, background: 'var(--wt-border)' }} />
      <PetsSection />
    </FlexCol>
  )
}

// ── Nav sections ──────────────────────────────────────────────────────────────

type Section = 'appearance' | 'general' | 'agents' | 'account'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: 'Palette' },
  { id: 'general',    label: 'General',    icon: 'SlidersHorizontal' },
  { id: 'agents',     label: 'Agents',     icon: 'Robot' },
  { id: 'account',    label: 'Account',    icon: 'User' },
]

// ── Main view ─────────────────────────────────────────────────────────────────

// ── Section: Account ─────────────────────────────────────────────────────────

function AccountSection() {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    // Reset theme to default (Dracula) so login screen looks right
    window.location.href = '/'
  }

  return (
    <FlexCol gap="5">
      <SectionLabel>Account</SectionLabel>
      <FlexCol gap="sm" style={{ maxWidth: 400 }}>
        <Text variant="body" size="medium" color="muted">
          Sign out of your account. Your boards and settings are saved in the cloud and will be here when you come back.
        </Text>
        <div>
          <Button
            variant="ghost"
            size="md"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <FlexRow align="center" gap="xs">
              <Icon icon="SignOut" size={16} />
              {signingOut ? 'Signing out...' : 'Sign out'}
            </FlexRow>
          </Button>
        </div>
      </FlexCol>
    </FlexCol>
  )
}

// ── Main view ────────────────────────────────────────────────────────────────

export function SettingsBoardView() {
  const [activeSection, setActiveSection] = useState<Section>('appearance')

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: 'var(--wt-bg)' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center px-6 gap-3"
        style={{
          height:       64,
          borderBottom: '1px solid var(--wt-border)',
        }}
      >
        <Icon icon="Gear" size={22} style={{ color: 'var(--wt-accent)', flexShrink: 0 }} />
        <div>
          <Text variant="label" size="medium" style={{ fontWeight: 700, color: 'var(--wt-text)', lineHeight: 1.2 }}>
            Settings
          </Text>
          <Text variant="body" size="small" color="muted" style={{ lineHeight: 1.4 }}>
            Customize your whiteboard
          </Text>
        </div>
      </div>

      {/* Body: left nav + content */}
      <FlexRow style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left nav */}
        <div
          className="flex-shrink-0 flex flex-col pt-5 pb-4 px-2 gap-0.5"
          style={{
            width:       220,
            borderRight: '1px solid var(--wt-border)',
          }}
        >
          {SECTIONS.map((sec) => {
            const isActive = sec.id === activeSection
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className="flex items-center gap-2.5 px-3 rounded-lg text-left transition-all"
                style={{
                  position:   'relative',
                  paddingTop:    10,
                  paddingBottom: 10,
                  background: isActive ? 'color-mix(in srgb, var(--wt-accent) 12%, transparent)' : 'transparent',
                  color:      isActive ? 'var(--wt-text)' : 'color-mix(in srgb, var(--wt-text) 65%, transparent)',
                  border:     'none',
                  cursor:     'pointer',
                  fontWeight: isActive ? 500 : 400,
                  fontSize:   14,
                }}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span
                    style={{
                      position:    'absolute',
                      left:        0,
                      top:         '50%',
                      transform:   'translateY(-50%)',
                      width:       3,
                      height:      16,
                      borderRadius: 99,
                      background:  'var(--wt-accent)',
                    }}
                  />
                )}
                <Icon
                  icon={sec.icon as any}
                  size={16}
                  style={{
                    color:      isActive ? 'var(--wt-accent)' : undefined,
                    opacity:    isActive ? 1 : 0.6,
                    flexShrink: 0,
                  }}
                />
                {sec.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ maxWidth: 720, padding: '32px 40px' }}>
            {activeSection === 'appearance' && <AppearanceSection />}
            {activeSection === 'general'    && <GeneralSection />}
            {activeSection === 'agents'     && <AgentsSection />}
            {activeSection === 'account'    && <AccountSection />}
          </div>
        </div>
      </FlexRow>
    </div>
  )
}
