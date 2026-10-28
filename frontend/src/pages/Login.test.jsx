// Login űrlap: elutasított és sikeres bejelentkezés (mockolt API, hálózat nélkül)
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'
import authService from '../features/auth/authService'
import { renderWithProviders } from '../test/renderWithProviders'

// Az authService mockolva: semmilyen valódi HTTP kérés nem indul
vi.mock('../features/auth/authService', () => ({
  default: { login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}))

const fillAndSubmit = async (user) => {
  await user.type(screen.getByPlaceholderText('Enter your email'), 'elek@example.com')
  await user.type(screen.getByPlaceholderText('Enter password'), 'rossz-jelszo')
  await user.click(screen.getByRole('button', { name: 'Submit' }))
}

describe('Login oldal', () => {
  it('elutasított bejelentkezésnél a szerver hibaüzenetét mutatja', async () => {
    // Az axios 401-es hibájának szerkezete
    const error = new Error('Request failed with status code 401')
    error.response = { status: 401, data: { message: 'Invalid credentials' } }
    authService.login.mockRejectedValue(error)

    const user = userEvent.setup()
    const { store } = renderWithProviders(<Login />, { route: '/login' })
    await fillAndSubmit(user)

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    expect(authService.login).toHaveBeenCalledWith({
      email: 'elek@example.com',
      password: 'rossz-jelszo',
    })
    expect(store.getState().auth.user).toBeNull()
    // Az űrlap továbbra is látszik
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('sikeres bejelentkezésnél üdvözlő üzenet és bejelentkezett állapot', async () => {
    const loggedIn = { _id: 'u1', name: 'Teszt Elek', email: 'elek@example.com', token: 't' }
    authService.login.mockResolvedValue(loggedIn)

    const user = userEvent.setup()
    const { store } = renderWithProviders(<Login />, { route: '/login' })
    await fillAndSubmit(user)

    expect(await screen.findByText('Logged in as Teszt Elek')).toBeInTheDocument()
    expect(store.getState().auth.user).toEqual(loggedIn)
  })
})
