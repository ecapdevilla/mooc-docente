const Joi = require('joi');

const registerSchema = Joi.object({
  nombre: Joi.string().min(3).max(255).required(),
  email: Joi.string().email().required(),
  telefono: Joi.string().pattern(/^\+?[\d\s-]{10,}$/).optional(),
  departamento: Joi.string().max(100).optional(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const progressSchema = Joi.object({
  completada: Joi.boolean(),
  puntaje: Joi.number().min(0).max(100),
});

module.exports = { validateRegister: registerSchema.validate, validateLogin: loginSchema.validate, validateProgress: progressSchema.validate };