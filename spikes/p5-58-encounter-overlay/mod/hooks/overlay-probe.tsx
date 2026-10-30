import type { ClientModule } from 'claude-code'

// P5-58 spike: a surface module laid over the scene that draws nothing and
// posts every click (with the cell it landed in) and every key to the mod.

const OverlayProbe: ClientModule<{ site: string; outline: boolean; rows: number }> = ({ site, outline, rows }, surface) => {
  const { Box, Text } = surface.elements
  surface.onPointer((p) => {
    if (p.type !== 'down') return
    surface.post({ site, kind: 'down', x: p.fine?.x ?? p.x, y: p.fine?.y ?? p.y, columns: surface.columns, rows: surface.rows, button: p.button ?? 'none' })
  })
  surface.onKey((k) => {
    surface.post({ site, kind: 'key', key: k.key, columns: surface.columns, rows: surface.rows })
  })
  // Blank rows give the region its height (an empty Box collapses on desktop); the outline shows where it is
  return (
    <Box flexDirection="column" width="100%" {...(outline ? { borderStyle: 'single', borderColor: '#ff00ff' } : {})}>
      {Array.from({ length: rows }, (_, i) => (
        <Text key={`r${i}`}>{'\u00a0'}</Text>
      ))}
    </Box>
  )
}

export default OverlayProbe
