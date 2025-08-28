// middleware/isCommentAuthor.js v.2
const Comment = require("../models/Comment");
const AppError = require("../utils/AppError");

const isCommentAuthor = async (req, res, next) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return next(new AppError("Komentarz nie znaleziony", 404));

        if (comment.author.toString() !== req.user._id.toString()) {
            return next(new AppError("Brak uprawnień do wykonania tej operacji", 403));
        }

        next();
    } catch (err) {
        next(err);
    }
};

module.exports = isCommentAuthor;
