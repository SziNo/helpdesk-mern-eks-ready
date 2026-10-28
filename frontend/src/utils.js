import { toast } from 'react-toastify'

export function extractErrorMessage(error) {
  return error.response?.data?.message || error.message || error.toString()
}

// Hibaüzenet megjelenítése toastként egy elutasított AsyncThunkAction után.
// Az unwrap() kétféle értékkel utasíthat el: rejectWithValue esetén a mi
// szöveges üzenetünkkel, váratlan hibánál (pl. egy reducerben dobott
// TypeError) Error / SerializedError objektummal. Az objektumot nem lehet
// közvetlenül a toast.error-nak átadni, ezért mindig szöveget adunk át.
export function toastError(error) {
  const message =
    typeof error === 'string'
      ? error
      : error
        ? extractErrorMessage(error)
        : 'Something went wrong'
  toast.error(message || 'Something went wrong')
}
