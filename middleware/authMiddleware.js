// middleware/authMiddleware.js v.2
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

// Middleware sprawdzający czy użytkownik jest zalogowany i ważny token
const requireAuth = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return next(new AppError("Brak tokena. Dostęp zabroniony.", 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return next(new AppError("Użytkownik nie istnieje", 401));
        }

        req.user = user;
        next();
    } catch (_error) {
        next(new AppError("Nieprawidłowy token.", 401));
    }
};

module.exports = requireAuth;
