// noteSlice reducer tesztek
import { describe, it, expect } from 'vitest'
import reducer, { createNote, getNotes } from './noteSlice'

const note = { _id: 'n1', text: 'Újraindítás nem segített' }
const createFulfilled = createNote.fulfilled(note, 'req-1', {
  noteText: note.text,
  ticketId: '1',
})

describe('noteSlice', () => {
  // Regresszió: ha a jegyzetek lekérése hibára futott (notes === null),
  // a createNote.fulfilled push-a TypeError-t dobott (README régi hibák, 6.)
  it('createNote.fulfilled null notes listával nem dob hibát, új listát kezd', () => {
    let next
    expect(() => {
      next = reducer({ notes: null }, createFulfilled)
    }).not.toThrow()
    expect(next.notes).toEqual([note])
  })

  it('createNote.fulfilled meglévő listához hozzáfűz', () => {
    const existing = { _id: 'n0', text: 'Első' }
    const next = reducer({ notes: [existing] }, createFulfilled)
    expect(next.notes).toEqual([existing, note])
  })

  it('getNotes.pending null-ra állítja, getNotes.fulfilled beállítja a listát', () => {
    let next = reducer({ notes: [note] }, getNotes.pending('req-2', '1'))
    expect(next.notes).toBeNull()
    next = reducer(next, getNotes.fulfilled([], 'req-3', '1'))
    expect(next.notes).toEqual([])
  })
})
