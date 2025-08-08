// routes/articleRoutes.js
const express = require("express")
const router = express.Router()

const {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  toggleLikeArticle
} = require("../controllers/articleController")

const upload = require("../middleware/upload")
const requireAuth = require("../middleware/authMiddleware")
const requireAuthorOrAdmin = require("../middleware/requireAuthorOrAdmin")

// Lista i pojedynczy artykuł
router.get("/", getArticles)
router.get("/:id", getArticleById)

// Tworzenie / edycja / usuwanie (z autoryzacją)
router.post("/", requireAuth, upload.array("images", 5), createArticle)
router.put("/:id", requireAuth, requireAuthorOrAdmin, upload.array("images", 5), updateArticle)
router.delete("/:id", requireAuth, requireAuthorOrAdmin, deleteArticle)

// Lajk artykułu
router.post("/:id/like", requireAuth, toggleLikeArticle)

module.exports = router
