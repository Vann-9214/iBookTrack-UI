import { ZodError } from 'zod';

/**
 * Middleware to validate request body, query parameters, and route parameters using Zod schemas.
 * 
 * @param {Object} schema - Object containing Zod schemas for body, query, and params.
 * @param {import('zod').ZodSchema} [schema.body]
 * @param {import('zod').ZodSchema} [schema.query]
 * @param {import('zod').ZodSchema} [schema.params]
 * @returns {Function} Express middleware function
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors
        });
      }
      next(error);
    }
  };
};
