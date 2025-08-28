const express = require("express");
const router = express.Router();
const { createArticle, getArticles, getArticleById, updateArticle, deleteArticle, toggleLikeArticle } = require("../controllers/articleController");
const upload = require("../middleware/upload");
const requireAuth = require("../middleware/authMiddleware");
const requireAuthorOrAdmin = require("../middleware/requireAuthorOrAdmin");
const validateObjectId = require("../middleware/validateObjectId");
const { validateArticle } = require("../utils/advancedValidate"); // ✅ DODANE

// Lista i pojedynczy artykuł
router.get("/", getArticles);
router.get("/:id", validateObjectId(), getArticleById); // DODANE middleware

// Tworzenie / edycja / usuwanie (z autoryzacją)
router.post("/", requireAuth, upload.array("images", 5), validateArticle, createArticle); // ✅
router.put("/:id", validateObjectId(), requireAuth, requireAuthorOrAdmin, upload.array("images", 5), validateArticle, updateArticle); // ✅
router.delete("/:id", validateObjectId(), requireAuth, requireAuthorOrAdmin, deleteArticle); // DODANE

// Lajk artykułu
router.post("/:id/like", validateObjectId(), requireAuth, toggleLikeArticle); // DODANE

module.exports = router;
