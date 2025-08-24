// Sprawdza, czy zalogowany użytkownik jest adminem
module.exports = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Brak autoryzacji" })
    }
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Brak dostępu — wymagane uprawnienia administratora" })
    }
    next()
}
