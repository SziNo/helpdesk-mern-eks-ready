// extractErrorMessage és toastError tesztek
import { describe, it, expect, vi } from 'vitest'
import { toast } from 'react-toastify'
import { extractErrorMessage, toastError } from './utils'

// A toast.error-t figyeljük, valódi toast nem jelenik meg
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }))

describe('extractErrorMessage', () => {
  it('az axios válasz üzenetét részesíti előnyben', () => {
    const error = new Error('Request failed with status code 401')
    error.response = { data: { message: 'Invalid credentials' } }
    expect(extractErrorMessage(error)).toBe('Invalid credentials')
  })

  it('egyébként az Error üzenetét adja', () => {
    expect(extractErrorMessage(new TypeError('Hálózati hiba'))).toBe('Hálózati hiba')
  })
})

describe('toastError', () => {
  it('string (rejectWithValue) esetén azt jeleníti meg', () => {
    toastError('Ticket not found')
    expect(toast.error).toHaveBeenCalledWith('Ticket not found')
  })

  it('Error objektum esetén az üzenetét jeleníti meg (nem az objektumot)', () => {
    toastError(new TypeError("Cannot read properties of null (reading 'map')"))
    expect(toast.error).toHaveBeenCalledWith(
      "Cannot read properties of null (reading 'map')"
    )
  })

  it('RTK SerializedError (sima objektum) esetén is szöveget ad', () => {
    toastError({ name: 'TypeError', message: 'Szerializált hiba' })
    expect(toast.error).toHaveBeenCalledWith('Szerializált hiba')
  })

  it('axios-szerű hibánál a szerver üzenetét adja', () => {
    toastError({ message: 'Request failed', response: { data: { message: 'Not authorized' } } })
    expect(toast.error).toHaveBeenCalledWith('Not authorized')
  })

  it('hiányzó hiba vagy üres üzenet esetén általános szöveget ad', () => {
    toastError(undefined)
    toastError('')
    toastError({ message: '' })
    expect(toast.error).toHaveBeenCalledTimes(3)
    for (const [message] of toast.error.mock.calls) {
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    }
  })
})
