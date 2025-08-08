const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const PendingUser = require('../models/PendingUser')
const validateFields = require('../utils/validate')

// Rejestracja — użytkownik oczekujący na zatwierdzenie
const registerPending = async (req, res) => {
    try {
        const { username, email, password, role } = req.body

        const errors = validateFields({
            username: [username, 'Nazwa użytkownika jest wymagana.'],
            email: [email, 'Email jest wymagany.'],
            password: [password, 'Hasło jest wymagane.'],
            role: [role, 'Rola jest wymagana.']
        })

        if (errors.length > 0) return res.status(400).json({ message: errors.join(' ') })

        const exists = await PendingUser.findOne({ email })
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
            email: [email, 'Email jest wymagany.'],
            password: [password, 'Hasło jest wymagane.']
        })

        if (errors.length > 0) return res.status(400).json({ message: errors.join(' ') })

        const user = await User.findOne({ email })
        if (!user) return res.status(400).json({ message: 'Nieprawidłowy email lub hasło.' })

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) return res.status(400).json({ message: 'Nieprawidłowy email lub hasło.' })

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' })

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        })

        res.json({ message: 'Zalogowano pomyślnie.' })
    } catch (error) {
        res.status(500).json({ message: 'Błąd serwera.', error })
    }
}

// Wylogowanie
const logout = (req, res) => {
    res.clearCookie('token')
    res.json({ message: 'Wylogowano.' })
}

module.exports = {
    registerPending,
    login,
    logout
}
