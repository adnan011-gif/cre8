const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const generateEmailCode = () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
};

const hashEmailCode = async (code) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(code, salt);
};

const compareEmailCode = async (code, hash) => {
  return bcrypt.compare(code, hash);
};

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  generateEmailCode,
  hashEmailCode,
  compareEmailCode,
  generateVerificationToken,
};
