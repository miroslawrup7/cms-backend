const bcrypt = require('bcryptjs');
const User = require('../models/User');
const validateFields = require('../utils/validate');
const sanitize = require('sanitize-html');

// Get user profile
const getProfile = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new Error('Użytkownik nie istnieje');
  return user;
};

// Update user profile
const updateProfile = async (userId, updateData) => {
  let { username } = updateData;
  const errors = [];

  if (username != null) {
    username = String(username).trim();
    if (username.length < 3) errors.push('Nazwa użytkownika musi mieć co najmniej 3 znaki.');
  }

  if (errors.length) throw new Error(errors.join(' '));

  const user = await User.findById(userId);
  if (!user) throw new Error('Użytkownik nie istnieje');

  if (username != null) user.username = sanitize(username);
  await user.save();

  const safeUser = user.toObject();
  delete safeUser.password;
  return safeUser;
};

// Change password
const changePassword = async (userId, oldPassword, newPassword) => {
  const errors = validateFields({
    oldPassword: [oldPassword, 'Stare hasło jest wymagane.'],
    newPassword: [newPassword, 'Nowe hasło jest wymagane.'],
  });

  if (newPassword && String(newPassword).length < 6) {
    errors.push('Nowe hasło musi mieć co najmniej 6 znaków.');
  }

  if (errors.length) throw new Error(errors.join(' '));

  const user = await User.findById(userId);
  if (!user) throw new Error('Użytkownik nie istnieje');

  const isMatch = await bcrypt.compare(String(oldPassword), user.password);
  if (!isMatch) throw new Error('Stare hasło jest nieprawidłowe.');

  user.password = await bcrypt.hash(String(newPassword), 10);
  await user.save();
};

// Admin: List all users
const listUsers = async () => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  return users;
};

// Admin: Change user role
const changeRole = async (userId, role) => {
  // ✅ POPRAWIONE: Używamy zmiennej errors
  const errors = validateFields({
    role: [role, 'Rola jest wymagana.'],
  });

  if (errors.length) {
    throw new Error(errors.join(' '));
  }

  const allowedRoles = ['user', 'author', 'admin'];
  if (!allowedRoles.includes(String(role))) {
    throw new Error('Nieprawidłowa rola.');
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('Użytkownik nie istnieje.');

  user.role = role;
  await user.save();

  const safeUser = user.toObject();
  delete safeUser.password;
  return safeUser;
};

// Admin: Delete user
const deleteUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('Użytkownik nie istnieje.');

  await user.deleteOne();
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  listUsers,
  changeRole,
  deleteUser,
};