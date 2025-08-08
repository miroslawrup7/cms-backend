const express = require('express')
const router = express.Router()
const requireAuth = require('../middleware/authMiddleware')
const requireAdmin = require('../middleware/requireAdmin')

const {
  getPendingUsers,
  approveUser,
  rejectUser
} = require('../controllers/adminController')

router.get('/pending-users', requireAuth, requireAdmin, getPendingUsers)
router.post('/approve/:id', requireAuth, requireAdmin, approveUser)
router.delete('/reject/:id', requireAuth, requireAdmin, rejectUser)

module.exports = router