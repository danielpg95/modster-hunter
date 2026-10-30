import type { ClientModule } from 'claude-code'

// P5-52 spike: a surface module that counts the pointer events its region gets,
// to see whether the Desktop Code tab hands a Client clicks at all.

interface ProbeState {
  downs: number
  moves: number
  last: string
}

const PointerProbe: ClientModule<null, ProbeState> = (_props, surface) => {
  const { Box, Text } = surface.elements
  const state = surface.state ?? { downs: 0, moves: 0, last: 'none yet' }
  surface.onPointer((p) => {
    const now = surface.state ?? state
    surface.setState({
      downs: now.downs + (p.type === 'down' ? 1 : 0),
      moves: now.moves + (p.type === 'move' ? 1 : 0),
      last: `${p.type} at ${p.x},${p.y}${p.button ? ` (${p.button})` : ''}`,
    })
    if (p.type === 'down') surface.post({ downs: now.downs + 1 })
  })
  return (
    <Box borderStyle="round" flexDirection="column" paddingX={1}>
      <Text>Click or hover inside this box.</Text>
      <Text>{`downs ${state.downs} · moves ${state.moves} · last: ${state.last}`}</Text>
    </Box>
  )
}

export default PointerProbe
