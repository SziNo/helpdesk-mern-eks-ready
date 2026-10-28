import { useSelector } from 'react-redux'

// A bejelentkezési állapot közvetlenül a Redux store-ból számolva.
// A régi változat useEffect-ben állított state-et (csak az első renderkor),
// amit az eslint-plugin-react-hooks 7 hibának jelez (set-state-in-effect).
// A user a store-ban szinkron módon elérhető, így ellenőrzésre nem kell várni.
export const useAuthStatus = () => {
  const { user } = useSelector((state) => state.auth)

  return { loggedIn: Boolean(user), checkingStatus: false }
}
