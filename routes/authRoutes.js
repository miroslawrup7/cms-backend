const express = require("express")
const router = express.Router()
const { login, logout, registerPending } = require("../controllers/authController")



// Logowanie
router.post("/login", login)

// Wylogowanie
router.post("/logout", logout)

router.post("/register-pending", registerPending)

module.exports = router
