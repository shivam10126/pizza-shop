const config = require('../config');
const { ApiError } = require('../utils/errors');

function notFound(req, res) {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    const body = { message: err.message };
    if (err.details) body.errors = err.details;
    return res.status(err.status).json(body);
  }

  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }

  const dbCodes = ['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT'];
  if (dbCodes.includes(err.code)) {
    console.error('Database error:', err.message);
    return res.status(503).json({ message: 'Database is not reachable. Check the server configuration.' });
  }

  console.error(err);
  return res.status(500).json({
    message: 'Something went wrong on the server',
    ...(config.isProduction ? {} : { detail: err.message }),
  });
}

module.exports = { notFound, errorHandler };
