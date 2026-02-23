const { auth, authorize, checkPermission, optionalAuth } = require('./auth');
const { upload, handleUploadError } = require('./upload');
const validate = require('./validate');

module.exports = {
  auth,
  authorize,
  checkPermission,
  optionalAuth,
  upload,
  handleUploadError,
  validate,
};
