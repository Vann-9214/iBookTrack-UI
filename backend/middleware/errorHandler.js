import { logger } from '../utils/logger.js'

export const globalErrorHandler = (err, req, res, next) => {
  // If headers have already been sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err)
  }

  // Determine status code (default to 500 Internal Server Error)
  const statusCode = err.status || err.statusCode || 500

  // Log the error securely with structured logging
  logger.error(`[ERROR] ${req.method} ${req.originalUrl} >> Status: ${statusCode}`)
  if (statusCode >= 500) {
    logger.error(err)
  }

  // Construct standard JSON response
  const response = {
    success: false,
    error: err.message || 'An unexpected error occurred.',
  }

  // Only include stack trace in explicit development mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack
  }

  res.status(statusCode).json(response)
}

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'API route not found.',
  })
}
