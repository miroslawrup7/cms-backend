const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

// Schemat użytkownika z podstawowymi danymi
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Nieprawidłowy format adresu e-mail"]
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ["user", "author", "admin"],
    default: "user"
  }
})

// Middleware Mongoose - przed zapisem hashuje hasło, jeśli zostało zmienione
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next()

  // jeśli to już hash bcrypt (~60 znaków, zaczyna się od $2a/$2b/$2y) – nie hashuj ponownie
  const isBcrypt = typeof this.password === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password)
  if (isBcrypt) return next()

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// Metoda instancji do porównania hasła w trakcie logowania
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model("User", userSchema)
