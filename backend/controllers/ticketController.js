const Ticket = require('../models/ticketModel')

// MEGJEGYZÉS: a felhasználót nem kell külön lekérni, a protect middleware
// már a req.user-be tette, és ellenőrizte, hogy létezik.

// Az updateTicket által módosítható mezők
const UPDATABLE_FIELDS = ['product', 'description', 'status']

// Ticket lekérése és jogosultság ellenőrzése (404 / 401 hibával)
const findOwnTicket = async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)

  if (!ticket) {
    res.status(404)
    throw new Error('Ticket not found')
  }

  if (ticket.user.toString() !== req.user.id) {
    res.status(401)
    throw new Error('Not Authorized')
  }

  return ticket
}

// @desc   A felhasználó ticketjei
// @route  GET /api/tickets
// @access Védett
const getTickets = async (req, res) => {
  const tickets = await Ticket.find({ user: req.user.id })

  res.status(200).json(tickets)
}

// @desc   Egy ticket lekérése
// @route  GET /api/tickets/:id
// @access Védett
const getTicket = async (req, res) => {
  const ticket = await findOwnTicket(req, res)

  res.status(200).json(ticket)
}

// @desc   Új ticket létrehozása
// @route  POST /api/tickets
// @access Védett
const createTicket = async (req, res) => {
  const { product, description } = req.body ?? {}

  if (!product || !description) {
    res.status(400)
    throw new Error('Please add a product and description')
  }

  const ticket = await Ticket.create({
    product,
    description,
    user: req.user.id,
    status: 'new',
  })

  res.status(201).json(ticket)
}

// @desc   Ticket törlése
// @route  DELETE /api/tickets/:id
// @access Védett
const deleteTicket = async (req, res) => {
  const ticket = await findOwnTicket(req, res)

  // JAVÍTÁS / Mongoose 7+: a document.remove() megszűnt, helyette deleteOne()
  await ticket.deleteOne()

  res.status(200).json({ success: true })
}

// @desc   Ticket módosítása
// @route  PUT /api/tickets/:id
// @access Védett
const updateTicket = async (req, res) => {
  await findOwnTicket(req, res)

  // JAVÍTÁS: a régi kód a teljes req.body-t mentette, így a kliens akár a
  // ticket tulajdonosát (user) is átírhatta. Most csak az engedélyezett mezők
  // módosíthatók, és a séma validátorai (enum) is lefutnak.
  const update = {}
  for (const field of UPDATABLE_FIELDS) {
    if (req.body?.[field] !== undefined) {
      update[field] = req.body[field]
    }
  }

  // Mongoose 9: a `new: true` opció elavult, helyette returnDocument: 'after'
  const updatedTicket = await Ticket.findByIdAndUpdate(req.params.id, update, {
    returnDocument: 'after',
    runValidators: true,
  })

  res.status(200).json(updatedTicket)
}

module.exports = {
  getTickets,
  createTicket,
  getTicket,
  deleteTicket,
  updateTicket,
}
