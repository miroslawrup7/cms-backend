const express = require('express')
const router = express.Router()

const requireAuth = require('../middleware/authMiddleware')
const requireAdmin = require('../middleware/requireAdmin')

const {
  getProfile,
  updateProfile,
  changePassword,
  listUsers,
  changeRole,
  deleteUser,
} = require('../controllers/userController')

// Profil zalogowanego użytkownika
router.get('/profile', requireAuth, getProfile)
router.put('/profile', requireAuth, updateProfile)
router.put('/password', requireAuth, changePassword)

// Admin – tylko dla roli 'admin'
router.get('/',        requireAuth, requireAdmin, listUsers)
router.put('/:id/role',requireAuth, requireAdmin, changeRole)
router.delete('/:id',  requireAuth, requireAdmin, deleteUser)

module.exports = router
