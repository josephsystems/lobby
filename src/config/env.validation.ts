import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  EMAIL_ENABLED: Joi.boolean().default(false),

  REDIS_HOST: Joi.when('EMAIL_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  REDIS_PORT: Joi.when('EMAIL_ENABLED', {
    is: true,
    then: Joi.number().required(),
    otherwise: Joi.number().optional(),
  }),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_USER: Joi.string().allow('').optional(),

  RESEND_API_KEY: Joi.when('EMAIL_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  RESEND_CONFIRMATION_TEMPLATE_ID: Joi.when('EMAIL_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
});
