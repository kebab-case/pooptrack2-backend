/*
 * Basic API routes that are sent to /api/ routes
 */

// TODO: Serve markdown (.MD) file with API examples
exports.index = (req, res) => {
  res.json({ status: 'OK' });
};
