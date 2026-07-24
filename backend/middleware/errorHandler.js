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

  // Never leak internal error details to the client on 5xx responses — the raw
  // message may contain DB/driver internals. Return a generic message and keep
  // the specifics in the server logs only. Client (4xx) errors keep their
  // intentional, user-facing message.
  const isServerError = statusCode >= 500
  const response = {
    success: false,
    error: isServerError
      ? 'An unexpected error occurred.'
      : (err.message || 'Request could not be processed.'),
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
