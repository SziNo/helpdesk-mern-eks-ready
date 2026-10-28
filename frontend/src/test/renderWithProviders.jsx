// Komponens tesztekhez: friss Redux store + memória router + toast konténer
import { render } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { ToastContainer } from 'react-toastify'
import authReducer from '../features/auth/authSlice'
import ticketReducer from '../features/tickets/ticketSlice'
import notesReducer from '../features/notes/noteSlice'

// Minden teszt saját store-t kap (nem az alkalmazás singleton store-ját)
export const createTestStore = (preloadedState) =>
  configureStore({
    reducer: {
      auth: authReducer,
      tickets: ticketReducer,
      notes: notesReducer,
    },
    preloadedState,
  })

export const renderWithProviders = (
  ui,
  { route = '/', preloadedState, store = createTestStore(preloadedState) } = {}
) => {
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      <ToastContainer />
    </Provider>
  )
  return { store, ...result }
}
