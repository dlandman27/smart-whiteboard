// ── @whiteboard/ui-kit ────────────────────────────────────────────────────────
// Main barrel export.  Import everything from this single entry point.
//
// CSS: import '@whiteboard/ui-kit/global.css' once at your app entry point.

// ── Widget container & size primitives ───────────────────────────────────────
export { Container }                            from './Container'
export type { ContainerProps }                  from './Container'
export { useWidgetSize }                        from './useWidgetSize'
export type { WidgetSize }                      from './useWidgetSize'
export { WidgetSizeContext, useWidgetSizeContext } from './WidgetSizeContext'
export { Stat }                                 from './Stat'
export type { StatProps }                       from './Stat'

// ── Design tokens ────────────────────────────────────────────────────────────
export {
  radius, fontSize, fontFamily, fontWeight, lineHeight, space, borderWidth,
  typography, textColor,
} from './theme'
export type {
  Radius, FontSize, FontFamily, FontWeight, LineHeight, Space, BorderWidth,
  TypographyStyle, TextVariant, TextSize, TextColor,
} from './theme'
export { widgetBreakpoints, widgetSizing, getBreakpoint, WIDGET_SHAPES } from './widgetTokens'
export type { WidgetBreakpoint, WidgetConstraints, WidgetShape }         from './widgetTokens'

// ── Typography & text ────────────────────────────────────────────────────────
export { Text }                                           from './Text'
export type { TextProps, TextAlign, TextTransform }       from './Text'

// ── Buttons ──────────────────────────────────────────────────────────────────
export { Button }                   from './Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button'
export { IconButton }               from './IconButton'
export type { IconButtonVariant, IconButtonSize }      from './IconButton'

// ── Data display ─────────────────────────────────────────────────────────────
export { Card }                     from './Card'
export type { CardTone, CardRadius, CardPadding }      from './Card'
export { Chip }                     from './Chip'
export type { ChipVariant }                            from './Chip'

// ── Form controls ────────────────────────────────────────────────────────────
export { Input }                    from './Input'
export type { InputSize }                              from './Input'
export { Toggle }                   from './Toggle'
export { Checkbox }                 from './Checkbox'
export { Slider }                   from './Slider'
export { SegmentedControl }         from './SegmentedControl'
export type { SegmentedOption }                        from './SegmentedControl'

// ── Icons & media ────────────────────────────────────────────────────────────
export { Icon }                     from './Icon'

// ── Layout ───────────────────────────────────────────────────────────────────
export { Flex, FlexRow, FlexCol }   from './layouts/Flex'
export type { FlexProps, FlexDir, FlexAlign, FlexJustify, FlexGap, FlexOverflow } from './layouts/Flex'
export { Grid }                     from './layouts/Grid'
export type { GridProps, GridGap }                     from './layouts/Grid'
export { Box }                      from './layouts/Box'
export type { BoxProps, BoxOverflow }                  from './layouts/Box'
export { Center }                   from './layouts/Center'
export type { CenterProps }                            from './layouts/Center'
export { ScrollArea }               from './layouts/ScrollArea'
export type { ScrollAreaProps }                        from './layouts/ScrollArea'
export { Spacer }                   from './Spacer'
export type { SpacingSize }                            from './Spacer'

// ── Navigation & panels ──────────────────────────────────────────────────────
export { Divider }                  from './Divider'
export { MenuItem }                 from './MenuItem'
export { Panel }                    from './Panel'
export { PanelHeader }              from './PanelHeader'
export { SettingsSection }          from './SettingsSection'

// ── Utilities ────────────────────────────────────────────────────────────────
export { cn }                       from './utils/cn'
