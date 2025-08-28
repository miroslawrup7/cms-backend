const userService = require('../services/userService');

// GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Brak autoryzacji' });
    const user = await userService.getProfile(req.user._id);
    return res.json(user);
  } catch (err) {
    console.error('Błąd getProfile:', err);
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Brak autoryzacji' });
    const user = await userService.updateProfile(req.user._id, req.body);
    return res.json({ message: 'Profil zaktualizowany', user });
  } catch (err) {
    console.error('Błąd updateProfile:', err);
    if (err.message.includes('Nazwa użytkownika')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// PUT /api/users/password
const changePassword = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Brak autoryzacji' });
    const { oldPassword, newPassword } = req.body;
    await userService.changePassword(req.user._id, oldPassword, newPassword);
    return res.json({ message: 'Hasło zostało zmienione.' });
  } catch (err) {
    console.error('Błąd changePassword:', err);
    if (err.message.includes('Stare hasło') || err.message.includes('Nowe hasło')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// GET /api/users (admin)
const listUsers = async (req, res) => {
  try {
    const users = await userService.listUsers();
    return res.json(users);
  } catch (err) {
    console.error('Błąd listUsers:', err);
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// PUT /api/users/:id/role (admin)
const changeRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await userService.changeRole(id, role);
    return res.json({ message: 'Rola zaktualizowana.', user });
  } catch (err) {
    console.error('Błąd changeRole:', err);
    if (err.message.includes('Rola') || err.message.includes('Nieprawidłowa')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

// DELETE /api/users/:id (admin)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    return res.status(204).end();
  } catch (err) {
    console.error('Błąd deleteUser:', err);
    if (err.message.includes('Użytkownik nie istnieje')) {
      return res.status(404).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Błąd serwera' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  listUsers,
  changeRole,
  deleteUser,
};