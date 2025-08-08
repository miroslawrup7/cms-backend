const bcrypt = require('bcryptjs')
const PendingUser = require('../models/PendingUser')
const User = require('../models/User')
const { sanitizeTitle } = require('../utils/sanitize')
const { sendMail } = require('../utils/mailer')
const { approvedUserEmail, rejectedUserEmail } = require('../utils/emailTemplates')

// GET /api/admin/pending-users
const getPendingUsers = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query

    const query = {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [total, users] = await Promise.all([
      PendingUser.countDocuments(query),
      PendingUser.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
    ])

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      users
    })
  } catch (err) {
    console.error('Błąd pobierania oczekujących użytkowników:', err)
    res.status(500).json({ message: 'Błąd serwera podczas pobierania wniosków.' })
  }
}


// POST /api/admin/approve/:id
const approveUser = async (req, res) => {
  try {
    const { id } = req.params
    const pending = await PendingUser.findById(id)
    if (!pending) return res.status(404).json({ message: 'Wniosek nie istnieje.' })

    const exists = await User.findOne({ email: pending.email })
    if (exists) {
      await pending.deleteOne()
      return res.status(400).json({ message: 'Email jest już zajęty w systemie.' })
    }

    const hashed = await bcrypt.hash(String(pending.password), 10)
    const user = new User({
      username: sanitizeTitle(pending.username),
      email: pending.email,
      password: hashed,
      role: pending.role
    })
    await user.save()

    await pending.deleteOne()

    // wysyłka maila (best-effort)
    try {
      const tpl = approvedUserEmail({ username: user.username, email: user.email })
      await sendMail({ to: user.email, subject: tpl.subject, text: tpl.text, html: tpl.html })
    } catch (mailErr) {
      console.warn('approveUser: mail send failed:', mailErr?.message || mailErr)
    }

    return res.json({ message: 'Użytkownik zatwierdzony i dodany do systemu.', userId: user._id })
  } catch (err) {
    console.error('Błąd approveUser:', err)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

// DELETE /api/admin/reject/:id
const rejectUser = async (req, res) => {
  try {
    const { id } = req.params
    const pending = await PendingUser.findById(id)
    if (!pending) return res.status(404).json({ message: 'Wniosek nie istnieje.' })

    // najpierw wyślij maila (opcjonalne – jeśli chcesz mimo braku maila kontynuować, trzymaj w try/catch)
    try {
      const tpl = rejectedUserEmail({ username: pending.username, email: pending.email })
      await sendMail({ to: pending.email, subject: tpl.subject, text: tpl.text, html: tpl.html })
    } catch (mailErr) {
      console.warn('rejectUser: mail send failed:', mailErr?.message || mailErr)
    }

    await pending.deleteOne()
    return res.json({ message: 'Wniosek został odrzucony.' })
  } catch (err) {
    console.error('Błąd rejectUser:', err)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser
}
