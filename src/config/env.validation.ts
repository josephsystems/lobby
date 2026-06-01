import * as Joi from 'joi';
import { Environment } from '../shared/constants/environment.constants';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(...Object.values(Environment))
    .default(Environment.DEVELOPMENT),
  APP_DOMAIN: Joi.string().required(),
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

  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_CA_CERT_PATH: Joi.when('DATABASE_SSL', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
});
