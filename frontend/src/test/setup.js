// Vitest közös beállítások (minden tesztfájl előtt lefut)
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// A Ticket oldal modulbetöltéskor Modal.setAppElement('#root')-ot hív,
// ezért a #root elemnek léteznie kell (mint az index.html-ben)
if (!document.getElementById('root')) {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
}

// Minden teszt után: renderelt komponensek és localStorage törlése,
// hogy a tesztek ne függjenek egymástól és a sorrendtől
afterEach(() => {
  cleanup()
  localStorage.clear()
})
