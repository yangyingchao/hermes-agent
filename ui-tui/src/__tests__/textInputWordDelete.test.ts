import { describe, expect, it } from 'vitest'

import { InputEvent } from '../../packages/hermes-ink/src/ink/events/input-event.js'
import { INITIAL_STATE, parseMultipleKeypresses } from '../../packages/hermes-ink/src/ink/parse-keypress.js'
import { deleteWordForward } from '../components/textInput.js'

function parseOne(sequence: string) {
  const [keys] = parseMultipleKeypresses(INITIAL_STATE, sequence)
  expect(keys).toHaveLength(1)

  return keys[0]!
}

// The web dashboard maps Ctrl+Delete to ESC d (see
// web/src/lib/pty-keyboard-shortcuts.ts). hermes-ink decodes that bare
// meta-letter form via META_KEY_CODE_RE. If this contract ever changes the
// `k.meta && inp === 'd'` binding in textInput.tsx stops firing and
// Ctrl+Delete regresses to typing a literal "d".
describe('Ctrl+Delete → ESC d decode contract', () => {
  it('decodes ESC d as meta+"d" so the composer binding is reached', () => {
    const event = new InputEvent(parseOne('\x1bd'))

    expect(event.key.meta).toBe(true)
    expect(event.key.ctrl).toBe(false)
    expect(event.input).toBe('d')
  })
})

// Ctrl+D (0x04) must reach the `mod && inp === 'd'` delete-char branch; if
// hermes-ink ever stops decoding it as ctrl+"d" the binding silently dies.
describe('Ctrl+D decode contract', () => {
  it('decodes 0x04 as ctrl+"d" so the delete-char branch is reached', () => {
    const event = new InputEvent(parseOne('\x04'))

    expect(event.key.ctrl).toBe(true)
    expect(event.key.meta).toBe(false)
    expect(event.input).toBe('d')
  })
})

describe('deleteWordForward', () => {
  it('deletes the word to the right of the cursor', () => {
    // cursor before "hello" → removes "hello" and the trailing space.
    expect(deleteWordForward('foo hello world', 4)).toEqual({ cursor: 4, value: 'foo world' })
  })

  it('deletes from mid-word to the next word boundary', () => {
    // cursor inside "hello" (after "he") → removes "llo" + trailing space.
    expect(deleteWordForward('foo hello world', 6)).toEqual({ cursor: 6, value: 'foo heworld' })
  })

  it('is a no-op when the cursor is already at the end', () => {
    expect(deleteWordForward('foo bar', 7)).toEqual({ cursor: 7, value: 'foo bar' })
  })
})
