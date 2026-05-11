export const colors = {
  bg: '#faf6f0',
  panelBg: '#fdf9f4',
  headerBg: '#f5ede0',
  border: '#e2d0bc',
  labelText: '#8a6a50',
  bodyText: '#2c1a0e',
  mutedText: '#b09070',
  accent: '#7c5038',
}

export function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex-shrink-0 flex items-center px-4"
      style={{
        height: 36,
        backgroundColor: colors.headerBg,
        borderBottom: `1px solid ${colors.border}`,
        color: colors.labelText,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  )
}
