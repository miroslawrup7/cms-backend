// controllers/userController.js
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const validateFields = require('../utils/validate')
const sanitize = require('sanitize-html')

// GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Brak autoryzacji' })
    const user = await User.findById(req.user._id).select('-password')
    if (!user) return res.status(404).json({ message: 'Użytkownik nie istnieje' })
    return res.json(user)
  } catch (err) {
    console.error('Błąd getProfile:', err)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Brak autoryzacji' })

    let { username } = req.body
    const errors = []

    if (username != null) {
      username = String(username).trim()
      if (username.length < 3) errors.push('Nazwa użytkownika musi mieć co najmniej 3 znaki.')
    }
    if (errors.length) return res.status(400).json({ message: errors.join(' ') })

    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'Użytkownik nie istnieje' })

    if (username != null) user.username = sanitize(username)
    await user.save()

    const safe = user.toObject()
    delete safe.password
    return res.json({ message: 'Profil zaktualizowany', user: safe })
  } catch (err) {
    console.error('Błąd updateProfile:', err)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

// PUT /api/users/password
const changePassword = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Brak autoryzacji' })

    const { oldPassword, newPassword } = req.body
    const errors = validateFields({
      oldPassword: [oldPassword, 'Stare hasło jest wymagane.'],
      newPassword: [newPassword, 'Nowe hasło jest wymagane.']
    })
    if (newPassword && String(newPassword).length < 6) {
      errors.push('Nowe hasło musi mieć co najmniej 6 znaków.')
    }
    if (errors.length) return res.status(400).json({ message: errors.join(' ') })

    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'Użytkownik nie istnieje' })

    const ok = await bcrypt.compare(String(oldPassword), user.password)
    if (!ok) return res.status(400).json({ message: 'Stare hasło jest nieprawidłowe.' })

    user.password = await bcrypt.hash(String(newPassword), 10)
    await user.save()
    return res.json({ message: 'Hasło zostało zmienione.' })
  } catch (err) {
    console.error('Błąd changePassword:', err)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

/* ====== Admin (role check usunięty – robi to requireAdmin) ====== */

// GET /api/users
const listUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 })
    return res.json(users)
  } catch (err) {
    console.error('Błąd listUsers:', err)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

// PUT /api/users/:id/role
const changeRole = async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    const errors = validateFields({ role: [role, 'Rola jest wymagana.'] })
    if (errors.length) return res.status(400).json({ message: errors.join(' ') })

    const allowed = ['user', 'author', 'admin']
    if (!allowed.includes(String(role))) {
      return res.status(400).json({ message: 'Nieprawidłowa rola.' })
    }

    const user = await User.findById(id)
    if (!user) return res.status(404).json({ message: 'Użytkownik nie istnieje.' })

    user.role = role
    await user.save()

    const safe = user.toObject()
    delete safe.password
    return res.json({ message: 'Rola zaktualizowana.', user: safe })
  } catch (err) {
    console.error('Błąd changeRole:', err)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(id)
    if (!user) return res.status(404).json({ message: 'Użytkownik nie istnieje.' })

    await user.deleteOne()
    return res.status(204).end()
  } catch (err) {
    console.error('Błąd deleteUser:', err)
    return res.status(500).json({ message: 'Błąd serwera' })
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  // admin:
  listUsers,
  changeRole,
  deleteUser,
}
