import { validationResult } from 'express-validator';
import { ValidationError } from './errorHandler.js';

export function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  
  next();
}