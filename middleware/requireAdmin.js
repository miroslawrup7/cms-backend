// middleware/requireAdmin.js v.2
const AppError = require("../utils/AppError");

module.exports = (req, res, next) => {
    if (!req.user) {
        return next(new AppError("Brak autoryzacji", 401));
    }
    if (req.user.role !== "admin") {
        return next(new AppError("Brak dostępu — wymagane uprawnienia administratora", 403));
    }
    next();
};
