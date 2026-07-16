/**
 * middleware/errorHandler.js
 *
 * Centralized error-handling middleware for the Express backend.
 * Catches errors passed via next(err) or thrown synchronously in routes,
 * logs them, and returns a standardized JSON response to the client.
 */

export const errorHandler = (err, req, res, next) => {
  // Log the error for server-side debugging
  console.error(`[ERROR] ${req.method} ${req.originalUrl} >>`, err.message || err);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Determine the HTTP status code
  // If the error object has a status code (e.g. from validation), use it;
  // otherwise default to 500 (Internal Server Error)
  const statusCode = err.statusCode || err.status || 500;

  // Build the error response object
  const errorResponse = {
    error: err.message || 'Internal Server Error',
  };

  // Optionally include more details in development mode
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Send the response
  res.status(statusCode).json(errorResponse);
};
