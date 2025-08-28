const authService = require('../services/authService');

// ZMIANA 1: Uproszczono baseCookieOptions dla lokalnego środowiska
const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  path: '/'
};

// Rejestracja — użytkownik oczekujący na zatwierdzenie
const registerPending = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    await authService.registerPending(username, email, password, role);
    res.status(201).json({ message: 'Wniosek o rejestrację został przesłany.' });
  } catch (error) {
    if (error.message.includes('Email jest już zajęty') || error.message.includes('jest wymagana')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Błąd serwera.', error });
  }
};

// Logowanie
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = await authService.login(email, password);

    res.cookie('token', token, {
      ...baseCookieOptions,
      maxAge: 24 * 60 * 60 * 1000 // 1 dzień
    });

    res.json({ message: 'Zalogowano pomyślnie.' });
  } catch (error) {
    if (error.message.includes('Nieprawidłowy email lub hasło') || error.message.includes('jest wymagane')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Błąd serwera.', error });
  }
};

// Wylogowanie
const logout = (req, res) => {
  res.clearCookie('token', {
    ...baseCookieOptions
  });
  res.json({ message: 'Wylogowano.' });
};

module.exports = {
  registerPending,
  login,
  logout
};