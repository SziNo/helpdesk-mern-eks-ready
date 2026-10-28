import { createSlice, createAsyncThunk, createAction } from '@reduxjs/toolkit'
import authService from './authService'
// MEGJEGYZÉS: az extractErrorMessage függvény spórolja meg az ismétlést
import { extractErrorMessage } from '../../utils'

// Felhasználó beolvasása a localStorage-ból
const user = JSON.parse(localStorage.getItem('user'))

// MEGJEGYZÉS: az isSuccess kikerült, mert a user megléte alapján
// kikövetkeztethető. Reset függvény sem kell (a pending ágak elintézik),
// isError és message sem, mert a hibát a komponens kapja meg az
// AsyncThunkAction elutasításából
const initialState = {
  user: user ? user : null,
  isLoading: false,
}

// Új felhasználó regisztrálása
export const register = createAsyncThunk(
  'auth/register',
  async (user, thunkAPI) => {
    try {
      return await authService.register(user)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  }
)

// Bejelentkezés
export const login = createAsyncThunk('auth/login', async (user, thunkAPI) => {
  try {
    return await authService.login(user)
  } catch (error) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error))
  }
})

// Kijelentkezés
// MEGJEGYZÉS: itt nem kell thunk, mert nincs async művelet,
// elég egy createAction
export const logout = createAction('auth/logout', () => {
  authService.logout()
  // RTK 2: a prepare callbacknek { payload } alakú objektumot kell visszaadnia;
  // payload itt nem kell
  return { payload: undefined }
})

// MEGJEGYZÉS: login / register pending vagy rejected esetén a user
// már amúgy is null, ezért ott nem kell nullázni

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload
        state.isLoading = false
      })
      .addCase(register.rejected, (state) => {
        state.isLoading = false
      })
      .addCase(login.pending, (state) => {
        state.isLoading = false
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload
        state.isLoading = false
      })
      .addCase(login.rejected, (state) => {
        state.isLoading = false
      })
  },
})

export default authSlice.reducer
