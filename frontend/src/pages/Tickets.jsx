import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { getTickets } from '../features/tickets/ticketSlice'
import Spinner from '../components/Spinner'
import BackButton from '../components/BackButton'
import TicketItem from '../components/TicketItem'

const Tickets = () => {
  const { tickets } = useSelector((state) => state.tickets)

  const dispatch = useDispatch()

  // MEGJEGYZÉS: elég egyetlen useEffect

  useEffect(() => {
    dispatch(getTickets())
  }, [dispatch])

  // MEGJEGYZÉS: nincs szükség külön betöltési állapotra: ha még nincsenek
  // ticketek, töltünk; ha vannak, a háttérben frissülnek a legújabbakra
  if (!tickets) {
    return <Spinner />
  }

  return (
    <>
      <BackButton />
      <div className='tickets'>
        <div className='ticket-headings'>
          <div>Date</div>
          <div>Product</div>
          <div>Status</div>
          <div></div>
        </div>
        {tickets.map((ticket) => (
          <TicketItem key={ticket._id} ticket={ticket} />
        ))}
      </div>
    </>
  )
}

export default Tickets
