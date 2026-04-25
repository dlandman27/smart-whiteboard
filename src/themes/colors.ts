import type { ThemeVars } from './presets'

export const LIGHT: ThemeVars = {
  widgetBg:           '#ffffff',
  widgetBorder:       '#e8e5e1',
  widgetBorderActive: '#d1cdc7',
  widgetHighlight:    'rgba(255,255,255,0.85)',
  widgetRestBorder:   'transparent',
  shadowSm:           '0 1px 3px rgba(0,0,0,0.08)',
  shadowMd:           '0 4px 12px rgba(0,0,0,0.10)',
  shadowLg:           '0 20px 40px rgba(0,0,0,0.14)',
  backdropFilter:     'none',

  textPrimary: '#1a1a1a',
  textMuted:   '#a09890',

  surfaceSubtle: '#f3f1ee',
  surfaceHover:  '#ede9e4',
  surfaceDanger: '#fef2f2',

  accent:     '#3b82f6',
  accentText: '#ffffff',
  danger:     '#ef4444',
  success:    '#22c55e',
  info:       '#3b82f6',

  actionBg:     '#ffffff',
  actionBorder: '#e8e5e1',

  settingsBg:      '#ffffff',
  settingsBorder:  '#e8e5e1',
  settingsDivider: '#f3f1ee',
  settingsLabel:   '#a09890',
  scrollThumb:     '#d1cdc7',

  clockFaceFill:   '#ffffff',
  clockFaceStroke: '#e8e5e1',
  clockTickMajor:  '#a09890',
  clockTickMinor:  '#e8e5e1',
  clockHands:      '#1a1a1a',
  clockSecond:     '#3b82f6',
  clockCenter:     '#1a1a1a',

  noteDefaultBg: '#fef9c3',
}

export const DARK: ThemeVars = {
  widgetBg:           '#242424',
  widgetBorder:       '#2d2d2d',
  widgetBorderActive: '#3d3d3d',
  widgetHighlight:    'rgba(255,255,255,0.06)',
  widgetRestBorder:   'rgba(255,255,255,0.06)',
  shadowSm:           '0 1px 3px rgba(0,0,0,0.4)',
  shadowMd:           '0 4px 16px rgba(0,0,0,0.5)',
  shadowLg:           '0 20px 48px rgba(0,0,0,0.7)',
  backdropFilter:     'none',

  textPrimary: '#f0eeeb',
  textMuted:   '#6b6866',

  surfaceSubtle: '#212121',
  surfaceHover:  '#2a2a2a',
  surfaceDanger: '#3a1a1a',

  accent:     '#60a5fa',
  accentText: '#191919',
  danger:     '#f87171',
  success:    '#4ade80',
  info:       '#60a5fa',

  actionBg:     '#242424',
  actionBorder: '#2d2d2d',

  settingsBg:      '#242424',
  settingsBorder:  '#2d2d2d',
  settingsDivider: '#2a2a2a',
  settingsLabel:   '#6b6866',
  scrollThumb:     '#3d3d3d',

  clockFaceFill:   '#242424',
  clockFaceStroke: '#2d2d2d',
  clockTickMajor:  '#6b6866',
  clockTickMinor:  '#2d2d2d',
  clockHands:      '#f0eeeb',
  clockSecond:     '#60a5fa',
  clockCenter:     '#f0eeeb',

  noteDefaultBg: '#2a2416',
}

// Canvas bg/dot colors for dot-grid backgrounds
export const LIGHT_BG = { bg: '#f9f8f7', dot: '#e4e0db' }
export const DARK_BG  = { bg: '#191919', dot: '#2a2a2a' }
