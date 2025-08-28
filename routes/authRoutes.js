// routes/authRoutes.js v.2
const express = require("express");
const router = express.Router();
const { login, logout, registerPending } = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../utils/advancedValidate"); // ✅ DODANE

// Logowanie
router.post("/login", validateLogin, login); // ✅ DODANA WALIDACJA

// Wylogowanie
router.post("/logout", logout);

// Rejestracja
router.post("/register-pending", validateRegister, registerPending); // ✅ DODANA WALIDACJA

module.exports = router;
