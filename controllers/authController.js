// controllers/authController.js
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const PendingUser = require('../models/PendingUser')
const validateFields = require('../utils/validate')

const isProd = process.env.NODE_ENV === 'production'

// wspólne opcje ciasteczka – lokalnie: Lax/nie-Secure, prod (Render): None/Secure + Partitioned
const baseCookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure:   isProd,
  // CHIPS – wymagane dla third-party cookies (frontend i backend na różnych domenach)
  // w dev nie ustawiamy (HTTP), w prod ustawiamy
  ...(isProd ? { partitioned: true } : {}),
  path: '/'
}

// Rejestracja — użytkownik oczekujący na zatwierdzenie
const registerPending = async (req, res) => {
  try {
    const { username, email, password, role } = req.body

    const errors = validateFields({
      username: [username, 'Nazwa użytkownika jest wymagana.'],
      email:    [email, 'Email jest wymagany.'],
      password: [password, 'Hasło jest wymagane.'],
      role:     [role, 'Rola jest wymagana.']
    })
    if (errors.length > 0) return res.status(400).json({ message: errors.join(' ') })

    const exists     = await PendingUser.findOne({ email })
    const existsReal = await User.findOne({ email })
    if (exists || existsReal) return res.status(400).json({ message: 'Email jest już zajęty.' })

    const pendingUser = new PendingUser({ username, email, password, role })
    await pendingUser.save()
    res.status(201).json({ message: 'Wniosek o rejestrację został przesłany.' })
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera.', error })
  }
}

// Logowanie
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const errors = validateFields({
      email:    [email, 'Email jest wymagany.'],
      password: [password, 'Hasło jest wymagane.']
    })
    if (errors.length > 0) return res.status(400).json({ message: errors.join(' ') })

    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Nieprawidłowy email lub hasło.' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: 'Nieprawidłowy email lub hasło.' })

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' })

    res.cookie('token', token, {
      ...baseCookieOptions,
      maxAge: 24 * 60 * 60 * 1000 // 1 dzień
    })

    res.json({ message: 'Zalogowano pomyślnie.' })
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera.', error })
  }
}

// Wylogowanie
const logout = (req, res) => {
  // wyczyść z TAKIMI SAMYMI atrybutami (sameSite/secure/partitioned/path)
  res.clearCookie('token', {
    ...baseCookieOptions
  })
  res.json({ message: 'Wylogowano.' })
}

module.exports = {
  registerPending,
  login,
  logout
}
