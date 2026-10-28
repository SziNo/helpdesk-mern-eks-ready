import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import ticketService from './ticketService'
// MEGJEGYZÉS: az extractErrorMessage függvény spórolja meg az ismétlést
import { extractErrorMessage } from '../../utils'

// MEGJEGYZÉS: nincs szükség isLoading, isSuccess, isError és message mezőkre,
// mert az AsyncThunkAction teljesült / elutasított promise-át a
// komponensben kezeljük
const initialState = {
  tickets: null,
  ticket: null,
}

// Új ticket létrehozása
export const createTicket = createAsyncThunk(
  'tickets/create',
  async (ticketData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await ticketService.createTicket(ticketData, token)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  }
)

// A felhasználó ticketjei
export const getTickets = createAsyncThunk(
  'tickets/getAll',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await ticketService.getTickets(token)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  }
)

// Egy ticket lekérése
export const getTicket = createAsyncThunk(
  'tickets/get',
  async (ticketId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await ticketService.getTicket(ticketId, token)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  }
)

// Ticket lezárása
export const closeTicket = createAsyncThunk(
  'tickets/close',
  async (ticketId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await ticketService.closeTicket(ticketId, token)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  }
)

// MEGJEGYZÉS: a loading és isSuccess állapot kikerült, mert a ticketek
// megléte / hiánya alapján kikövetkeztethető; így reset függvény sem kell

export const ticketSlice = createSlice({
  name: 'ticket',
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(getTickets.pending, (state) => {
        // MEGJEGYZÉS: a lista oldalon töröljük az egyedi ticketet, ez kiváltja
        // az egyedi ticket betöltési állapotát
        state.ticket = null
      })
      .addCase(getTickets.fulfilled, (state, action) => {
        state.tickets = action.payload
      })
      .addCase(getTicket.fulfilled, (state, action) => {
        state.ticket = action.payload
      })
      .addCase(closeTicket.fulfilled, (state, action) => {
        state.ticket = action.payload
        // JAVÍTÁS: a lista csak akkor frissül, ha már be van töltve. Ha a
        // /ticket/:id oldalon frissítettek (F5), a tickets még null, és a régi
        // kód itt TypeError-t dobott, így a lezárás után nem jött toast és
        // átirányítás sem. A /tickets oldal úgyis újratölti a listát.
        if (state.tickets) {
          state.tickets = state.tickets.map((ticket) =>
            ticket._id === action.payload._id ? action.payload : ticket
          )
        }
      })
  },
})

export default ticketSlice.reducer
