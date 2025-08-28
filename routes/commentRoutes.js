const express = require("express");
const router = express.Router();
const { addComment, getComments, deleteComment, updateComment } = require("../controllers/commentController");
const requireAuth = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");
const { validateComment } = require("../utils/advancedValidate"); // ✅ DODANE

// Komentarze do artykułu (id = articleId)
router.get("/:id", validateObjectId(), getComments); // DODANE
router.post("/:id", validateObjectId(), requireAuth, validateComment, addComment); // ✅

// Operacje na konkretnym komentarzu (id = commentId)
router.put("/:id", validateObjectId(), requireAuth, validateComment, updateComment); // ✅
router.delete("/:id", validateObjectId(), requireAuth, deleteComment);

module.exports = router;
