// ticketSlice reducer tesztek (a lezárásos regresszióval)
import { describe, it, expect } from 'vitest'
import reducer, { closeTicket, getTickets, getTicket } from './ticketSlice'

const closed = { _id: '1', product: 'iPhone', status: 'closed' }
// Az AsyncThunk fulfilled action: (payload, requestId, arg)
const closeFulfilled = closeTicket.fulfilled(closed, 'req-1', '1')

describe('ticketSlice', () => {
  it('kezdőállapot: nincs betöltött lista és ticket', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({
      tickets: null,
      ticket: null,
    })
  })

  // Regresszió: F5 után a /ticket/:id oldalon a lista még null volt, és a
  // closeTicket.fulfilled reducer TypeError-t dobott (README régi hibák, 6.)
  it('closeTicket.fulfilled null tickets listával nem dob hibát, és frissíti a ticketet', () => {
    const state = { tickets: null, ticket: { ...closed, status: 'new' } }
    let next
    expect(() => {
      next = reducer(state, closeFulfilled)
    }).not.toThrow()
    expect(next.ticket).toEqual(closed)
    expect(next.tickets).toBeNull()
  })

  it('closeTicket.fulfilled betöltött listánál csak a lezárt ticketet cseréli', () => {
    const other = { _id: '2', product: 'iPad', status: 'new' }
    const third = { _id: '3', product: 'iMac', status: 'open' }
    const state = {
      tickets: [{ ...closed, status: 'new' }, other, third],
      ticket: null,
    }
    const next = reducer(state, closeFulfilled)
    expect(next.tickets).toEqual([closed, other, third])
    // A nem érintett elemek referenciája is változatlan
    expect(next.tickets[1]).toBe(other)
    expect(next.tickets[2]).toBe(third)
  })

  it('getTickets.pending törli az egyedi ticketet', () => {
    const next = reducer(
      { tickets: null, ticket: closed },
      getTickets.pending('req-2')
    )
    expect(next.ticket).toBeNull()
  })

  it('getTickets.fulfilled és getTicket.fulfilled beállítja az állapotot', () => {
    let next = reducer(undefined, getTickets.fulfilled([closed], 'req-3'))
    expect(next.tickets).toEqual([closed])
    next = reducer(next, getTicket.fulfilled(closed, 'req-4', '1'))
    expect(next.ticket).toEqual(closed)
  })
})
