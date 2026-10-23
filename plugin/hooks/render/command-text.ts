// What `/modsters` and its subcommands say (decision 0038). Plain text: a
// command's reply and a toast are drawn by the engine, not as a tree.

/** Dim after `/modsters` in the typeahead (point 8). */
export const MODSTERS_ARGUMENT_HINT = '[hunt | stop | pane | reload | help]'

/** `/modsters hunt`'s reply, also when hunting was already on (point 3). */
export function huntReply(biomeName: string | undefined): string {
  return `${biomeName ? `Hunting in ${biomeName}` : 'Hunting'} · Modsters show up while Claude works · /modsters stop to stop`
}

/** `/modsters stop`'s reply (point 4). */
export const STOP_REPLY = 'Modster Hunter stopped · /modsters hunt to play again'

/** The reply when `/config` refused to change `autoStart` (point 3). */
export function autoStartDeniedReply(on: boolean, reason: string): string {
  return `Modster Hunter: couldn't turn Auto start ${on ? 'on' : 'off'} · ${reason}`
}

/** `/modsters help`: the quickstart, one line each (point 6). */
export function helpText(autoStart: boolean): string {
  return [
    'Modster Hunter',
    '/modsters hunt    start hunting',
    '/modsters stop    stop hunting',
    '/modsters         your collection',
    '/modsters pane    a bigger encounter view',
    '/modsters reload  load your own Modsters after changes',
    '1: Throw · 2: Run, from an empty prompt',
    `Auto start is ${autoStart ? 'on' : 'off'} (/config)`,
  ].join('\n')
}

/** The reply to `/modsters <word>` with a word it doesn't know (point 7). */
export function unknownSubcommandText(word: string, autoStart: boolean): string {
  return `Modster Hunter doesn't know "${word}"\n${helpText(autoStart)}`
}

/** The welcome toast, once per player (0038 point 9, texts by 0041). */
export function welcomeText(): string {
  return 'Modster Hunter is on · Modsters show up while Claude works · /modsters stop to turn it off · /modsters help for more'
}
