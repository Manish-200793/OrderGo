/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Max size is 5MB.' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error.',
  });
}

module.exports = errorHandler;
