// middleware/validateObjectId.js v.1
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError(`Nieprawidłowy format ID: ${id}`, 400));
    }
    
    next();
  };
};

module.exports = validateObjectId;