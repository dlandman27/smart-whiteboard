import React, { useState } from 'react'

export function Table({ children, style, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      {...props}
      style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, ...style }}
    >
      {children}
    </table>
  )
}

export function Thead({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props}>{children}</thead>
}

export function Tbody({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props}>{children}</tbody>
}

export function Tr({ children, style, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  const [hovered, setHovered] = useState(false)

  return (
    <tr
      {...props}
      onMouseEnter={(e) => { setHovered(true); props.onMouseEnter?.(e) }}
      onMouseLeave={(e) => { setHovered(false); props.onMouseLeave?.(e) }}
      style={{
        borderBottom:    '1px solid var(--wt-border)',
        backgroundColor: hovered ? 'var(--wt-surface-hover)' : 'transparent',
        ...style,
      }}
    >
      {children}
    </tr>
  )
}

export function Th({ children, style, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      style={{
        padding:       '8px 12px',
        textAlign:     'left',
        fontSize:      11,
        fontWeight:    600,
        color:         'var(--wt-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        ...style,
      }}
    >
      {children}
    </th>
  )
}

export function Td({ children, style, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      {...props}
      style={{ padding: '10px 12px', color: 'var(--wt-text)', fontSize: 13, ...style }}
    >
      {children}
    </td>
  )
}
