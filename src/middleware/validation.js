const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

function validateAndRender(viewName) {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render(viewName, {
        errors: errors.array(),
        formData: req.body
      });
    }
    next();
  };
}

module.exports = {
  validate,
  validateAndRender
};
