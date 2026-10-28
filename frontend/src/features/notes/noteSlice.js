import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import noteService from './noteService'
// MEGJEGYZÉS: az extractErrorMessage függvény spórolja meg az ismétlést
import { extractErrorMessage } from '../../utils'

// MEGJEGYZÉS: az isLoading, isSuccess, isError, message és reset kikerült:
// a betöltés és a siker a jegyzetek megléte / hiánya alapján látszik,
// a hibaüzenetet a komponens kapja meg az AsyncThunkActionből,
// a reset pedig sosem volt használva

const initialState = {
  notes: null,
}

// Egy ticket jegyzetei
export const getNotes = createAsyncThunk(
  'notes/getAll',
  async (ticketId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await noteService.getNotes(ticketId, token)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  }
)

// Jegyzet hozzáadása
export const createNote = createAsyncThunk(
  'notes/create',
  async ({ noteText, ticketId }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token
      return await noteService.createNote(noteText, ticketId, token)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  }
)

export const noteSlice = createSlice({
  name: 'note',
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(getNotes.pending, (state) => {
        // MEGJEGYZÉS: pending állapotban null-ra állítjuk a jegyzeteket,
        // így betöltés közben Spinner jelenhet meg
        state.notes = null
      })
      .addCase(getNotes.fulfilled, (state, action) => {
        // MEGJEGYZÉS: ha nincs jegyzet, üres tömböt kapunk, tehát a payload
        // (tömb vagy üres tömb) mindkét esetben azt jelenti, hogy a lekérés kész
        state.notes = action.payload
      })
      .addCase(createNote.fulfilled, (state, action) => {
        // JAVÍTÁS: ha a jegyzetek lekérése sikertelen volt, a notes null,
        // és a push TypeError-t dobott volna
        if (state.notes) {
          state.notes.push(action.payload)
        } else {
          state.notes = [action.payload]
        }
      })
  },
})

export default noteSlice.reducer
