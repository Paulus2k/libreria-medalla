const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  try {
    req.usuario = jwt.verify((req.headers.authorization || '').replace(/^Bearer /, ''), process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ message: 'Inicia sesión nuevamente.' }); }
};
