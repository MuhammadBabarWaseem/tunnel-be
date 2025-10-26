const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'a149cd5b170d7355b66b388a647cdb5b2996e944f17844670b1c91dd830b9b2d';
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = generateToken;

