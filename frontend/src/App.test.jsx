// Útválasztás: ismeretlen útvonalon a 404-es oldal jelenik meg
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import App from './App'
import { createTestStore } from './test/renderWithProviders'

// Az App saját BrowserRoutert használ, ezért a böngésző URL-jét állítjuk be
const renderAt = (path) => {
  window.history.pushState({}, '', path)
  return render(
    <Provider store={createTestStore()}>
      <App />
    </Provider>
  )
}

describe('App útválasztás', () => {
  it('ismeretlen útvonalon (/valami) a NotFound oldal jelenik meg', () => {
    renderAt('/valami')
    expect(screen.getByRole('heading', { name: /404/ })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /back to home/i })
    expect(link).toHaveAttribute('href', '/')
    // A fejléc továbbra is megjelenik
    expect(screen.getByRole('link', { name: 'Support Desk' })).toBeInTheDocument()
  })

  it('többszintű ismeretlen útvonalon is a NotFound oldal jelenik meg', () => {
    renderAt('/valami/mely/ut')
    expect(screen.getByRole('heading', { name: /404/ })).toBeInTheDocument()
  })

  it('ismert útvonalon (/) nem a NotFound oldal jelenik meg', () => {
    renderAt('/')
    expect(
      screen.getByRole('heading', { name: /what do you need help with/i })
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /404/ })).not.toBeInTheDocument()
  })
})
