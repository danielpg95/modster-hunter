import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'
import { DEX, THUMB_CHARS } from './dex'

// P5-52 spike, not part of Modster Hunter: `/interaction-spike` opens a pane of
// click and layout tests, so we can see in the Desktop Code tab which presses
// reach a mod and whether a dex grid of animated Svgs works. It draws nothing
// in the terminal and takes no hotkeys, so the game's digit keys stay as they are.

const PANE_ID = 'interaction-spike'
const GRID_FIRST = 12

const hits = atom({ plugin: 'modster-interaction-spike', key: 'hits' } as const, {})
const selected = atom({ plugin: 'modster-interaction-spike', key: 'selected' } as const, null)
const showAll = atom({ plugin: 'modster-interaction-spike', key: 'showAll' } as const, false)
const band = atom({ plugin: 'modster-interaction-spike', key: 'band' } as const, false)
const client = atom({ plugin: 'modster-interaction-spike', key: 'client' } as const, false)

// Click the green square: SMIL starts the throw inside the frame, no script
const CLICK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="90" viewBox="0 0 240 90">' +
  '<style>#m{cursor:pointer}#m:hover{fill:#f5a623}</style>' +
  '<rect id="m" x="170" y="20" width="44" height="44" rx="8" fill="#7cb342"><title>Click me</title>' +
  '<animate attributeName="opacity" values="1;0.2;1" begin="m.click" dur="0.6s"/></rect>' +
  '<circle cx="20" cy="70" r="8" fill="#9e9e9e">' +
  '<animate attributeName="cx" values="20;192" begin="m.click" dur="0.6s" fill="freeze"/>' +
  '<animate attributeName="cy" values="70;10;42" begin="m.click" dur="0.6s" fill="freeze"/></circle>' +
  '<text x="10" y="14" font-size="11" fill="#888">Click or hover the green square</text></svg>'

function bump(key: string) {
  return (now: Record<string, number>) => ({ ...now, [key]: (now[key] ?? 0) + 1 })
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'interaction-spike', description: 'P5-52: test clicks and a dex grid in the Desktop Code tab', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'interaction-spike' }, async ($) => {
    const opened = await $.ui.open({ id: PANE_ID, title: 'P5-52 interaction spike', focus: true, closeOnEscape: true })
    return opened.isPlaced ? {} : { text: 'interaction-spike: the pane is waiting for room' }
  })

  on('ui.message', async ($, e, next) => {
    await update($, hits, bump('G'))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || !(await read($, band))) return next(e)
    const below = await next(e)
    const { Box, Text, Button, Svg } = $.ui.resolve(e)
    const count = (await read($, hits)).H ?? 0
    const first = DEX[0]
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1} alignItems="center">
          {first ? <Svg source={first.thumb} alt={first.name} height={32} /> : null}
          <Button key="spike-band-poke" label="Poke" onPress={() => update($, hits, bump('H'))} />
          <Text dimColor>{`H. band presses: ${count}`}</Text>
        </Box>
        {below}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE_ID) return next(e)
    if (e.surface !== 'desktop') {
      const { Text } = $.ui.resolve(e)
      return <Text>Open /interaction-spike in the Desktop app's Code tab.</Text>
    }
    const { Box, Text, Button, Svg, Markdown, Client } = $.ui.resolve(e)
    const got = await read($, hits)
    const reached = (key: string) => <Text dimColor>{`reached the mod: ${got[key] ?? 0}`}</Text>
    const open = await read($, selected)
    const all = await read($, showAll)
    const sample = DEX.find((m) => m.art === 'desktop sheet') ?? DEX[0]
    if (!sample) return <Text>No Modsters.</Text>

    const detail = open ? DEX.find((m) => m.id === open) : undefined
    const grid = detail ? (
      <Box flexDirection="column" gap={1}>
        <Button key="dex-back" label="← Back to the grid" onPress={() => update($, selected, () => null)} />
        <Svg source={detail.thumb} alt={detail.name} width={detail.width * 2} height={detail.height * 2} />
        <Text bold>{`#${String(detail.number).padStart(3, '0')} ${detail.name}`}</Text>
        <Text dimColor>{`${detail.rarity} · ${detail.types.join(' / ')} · ${detail.category} · ${detail.art} · ${detail.thumb.length} chars`}</Text>
        <Text>{detail.entry}</Text>
      </Box>
    ) : (
      <Box flexDirection="column" gap={1}>
        <Button
          key="dex-toggle"
          label={all ? `Show the first ${GRID_FIRST}` : `Show all ${DEX.length} (${THUMB_CHARS} chars of Svg)`}
          onPress={() => update($, showAll, (now) => !now)}
        />
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          {(all ? DEX : DEX.slice(0, GRID_FIRST)).map((m) => (
            <Box key={`cell-${m.id}`} flexDirection="column" width={16} alignItems="center">
              <Svg source={m.thumb} alt={m.name} />
              <Button key={`dex-${m.id}`} plain label={`#${String(m.number).padStart(3, '0')} ${m.name}`} onPress={() => update($, selected, () => m.id)} />
            </Box>
          ))}
        </Box>
      </Box>
    )

    return (
      <Box flexDirection="column" gap={1}>
        <Text dimColor>Round 4: F is now last, G still off until pressed. Try each letter, then note what happened next to it.</Text>
        <Text bold>Part 1: clicks</Text>

        <Text bold>A. A pane Button</Text>
        <Button key="spike-a" label="Press me" onPress={() => update($, hits, bump('A'))} />
        {reached('A')}

        <Text bold>B. An Svg drawn as an image (no isInteractive)</Text>
        <Svg source={sample.thumb} alt={`B: ${sample.name}`} />
        <Text dimColor>An Svg has no onPress. Click it and note what the app does (nothing, a viewer, a selection).</Text>

        <Text bold>C. An isInteractive Svg with a SMIL click</Text>
        <Svg source={CLICK_SVG} alt="C: click the green square" isInteractive />
        <Text dimColor>Does the rock fly when you click the square? Does the square turn orange on hover, and show a tooltip?</Text>

        <Text bold>D. A Button laid over an Svg</Text>
        <Box key="spike-d" position="relative">
          <Svg source={sample.thumb} alt={`D: ${sample.name}`} width={sample.width * 2} height={sample.height * 2} />
          <Box position="absolute" top={0} left={0}>
            <Button key="spike-d-throw" label="Throw" onPress={() => update($, hits, bump('D'))} />
          </Box>
        </Box>
        {reached('D')}

        <Text bold>E. An Svg beside a Button</Text>
        <Box flexDirection="row" gap={1} alignItems="center">
          <Svg source={sample.thumb} alt={`E: ${sample.name}`} />
          <Button key="spike-e" variant="primary" label="Throw" onPress={() => update($, hits, bump('E'))} />
        </Box>
        {reached('E')}

        <Text bold>H. A band Button</Text>
        <Button key="spike-h" label={(await read($, band)) ? 'Hide the band test' : 'Show the band test'} onPress={() => update($, band, (now) => !now)} />
        <Text dimColor>Shows a row with a Poke button above the prompt, over the game's band.</Text>

        <Text bold>Part 2: a dex grid</Text>
        <Text dimColor>Press a name to open its detail; Back returns. Try Show all to test the Svg budget.</Text>
        {grid}

        <Text bold>G. A Client (surface module) that counts pointer events</Text>
        <Text dimColor>Off until pressed (round 3): with it drawn, the Buttons after it lost their handlers (round 1) and the pane went blank (round 2).</Text>
        <Button key="spike-g-toggle" label={(await read($, client)) ? 'Remove the Client' : 'Draw the Client'} onPress={() => update($, client, (now) => !now)} />
        {(await read($, client)) ? <Client key="spike-g" module="./pointer-probe.tsx" props={null} /> : null}
        {reached('G')}

        <Text bold>F. A Markdown link the mod answers</Text>
        <Markdown key="spike-f" text={`Throw at [${sample.name}](https://modster.invalid/throw).`} onLinkPress={() => update($, hits, bump('F'))} />
        {reached('F')}
        <Text dimColor>If a browser opens instead, the press didn't reach the mod. Moved last in round 4: Buttons after it lost their handlers.</Text>

      </Box>
    )
  })
}
