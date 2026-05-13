const protect = (req, res, next) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const attachUser = (req, res, next) => {
  req.userId = req.auth.userId;
  next();
};

module.exports = { protect, attachUser };
