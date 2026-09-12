const Joi = require('joi');

const registerSchema = Joi.object({
  nombre: Joi.string()
    .min(3)
    .max(255)
    .required(),

  email: Joi.string()
    .email()
    .required(),

  telefono: Joi.string()
    .pattern(/^\+?[\d\s-]{10,}$/)
    .optional(),

  departamento: Joi.string()
    .max(100)
    .optional(),

  password: Joi.string()
    .min(8)
    .required(),
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required(),

  password: Joi.string()
    .required(),
});

const progressSchema = Joi.object({
  completada: Joi.boolean(),
  puntaje: Joi.number()
    .min(0)
    .max(100),
});

/**
 * Validar registro de usuario
 */
const validateRegister = (data) => {
  return registerSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
};

/**
 * Validar inicio de sesión
 */
const validateLogin = (data) => {
  return loginSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
};

/**
 * Validar actualización de progreso
 */
const validateProgress = (data) => {
  return progressSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
};

module.exports = {
  validateRegister,
  validateLogin,
  validateProgress,
};