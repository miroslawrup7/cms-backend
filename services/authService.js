const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const validateFields = require('../utils/validate');

// Register pending user
const registerPending = async (username, email, password, role) => {
  const errors = validateFields({
    username: [username, 'Nazwa użytkownika jest wymagana.'],
    email: [email, 'Email jest wymagany.'],
    password: [password, 'Hasło jest wymagane.'],
    role: [role, 'Rola jest wymagana.'],
  });
  if (errors.length > 0) throw new Error(errors.join(' '));

  const exists = await PendingUser.findOne({ email });
  const existsReal = await User.findOne({ email });
  if (exists || existsReal) throw new Error('Email jest już zajęty.');

  const pendingUser = new PendingUser({ username, email, password, role });
  await pendingUser.save();
};

// Login user
const login = async (email, password) => {
  const errors = validateFields({
    email: [email, 'Email jest wymagany.'],
    password: [password, 'Hasło jest wymagane.'],
  });
  if (errors.length > 0) throw new Error(errors.join(' '));

  const user = await User.findOne({ email });
  if (!user) throw new Error('Nieprawidłowy email lub hasło.');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Nieprawidłowy email lub hasło.');

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  return token;
};

module.exports = {
  registerPending,
  login,
};