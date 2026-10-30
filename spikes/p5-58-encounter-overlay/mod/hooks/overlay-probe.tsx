import type { ClientModule } from 'claude-code'

// P5-58 spike: a surface module laid over the scene that draws nothing and
// posts every click (with the cell it landed in) and every key to the mod.

const OverlayProbe: ClientModule<string> = (site, surface) => {
  const { Box } = surface.elements
  surface.onPointer((p) => {
    if (p.type !== 'down') return
    surface.post({ site, kind: 'down', x: p.fine?.x ?? p.x, y: p.fine?.y ?? p.y, columns: surface.columns, rows: surface.rows, button: p.button ?? 'none' })
  })
  surface.onKey((k) => {
    surface.post({ site, kind: 'key', key: k.key, columns: surface.columns, rows: surface.rows })
  })
  return <Box width={surface.columns} height={surface.rows} />
}

export default OverlayProbe
