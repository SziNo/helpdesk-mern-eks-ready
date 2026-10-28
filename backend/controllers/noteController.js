const Note = require('../models/noteModel')
const Ticket = require('../models/ticketModel')

// MEGJEGYZÉS: a felhasználót nem kell külön lekérni, a protect middleware
// már a req.user-be tette, és ellenőrizte, hogy létezik.

// Ticket ellenőrzése a jegyzetekhez (404 / 401 hibával)
const checkTicket = async (req, res) => {
  const ticket = await Ticket.findById(req.params.ticketId)

  // JAVÍTÁS: a régi kód nem ellenőrizte, hogy a ticket létezik-e,
  // nemlétező ticketre TypeError (500) lett a válasz.
  if (!ticket) {
    res.status(404)
    throw new Error('Ticket not found')
  }

  if (ticket.user.toString() !== req.user.id) {
    res.status(401)
    throw new Error('User not authorized')
  }

  return ticket
}

// @desc    Egy ticket jegyzetei
// @route   GET /api/tickets/:ticketId/notes
// @access  Védett
const getNotes = async (req, res) => {
  await checkTicket(req, res)

  const notes = await Note.find({ ticket: req.params.ticketId })

  res.status(200).json(notes)
}

// @desc    Jegyzet hozzáadása egy tickethez
// @route   POST /api/tickets/:ticketId/notes
// @access  Védett
const addNote = async (req, res) => {
  await checkTicket(req, res)

  const note = await Note.create({
    text: req.body?.text,
    isStaff: false,
    ticket: req.params.ticketId,
    user: req.user.id,
  })

  res.status(200).json(note)
}

module.exports = {
  getNotes,
  addNote,
}
