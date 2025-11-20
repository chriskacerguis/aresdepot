function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.is_admin) {
    return next();
  }
  res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
}

function requireMember(req, res, next) {
  if (req.session && req.session.user && !req.session.user.is_admin) {
    return next();
  }
  res.status(403).render('error', { message: 'Access denied. Member account required.' });
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect(req.session.user.is_admin ? '/admin/dashboard' : '/members/dashboard');
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireMember,
  redirectIfAuthenticated
};
