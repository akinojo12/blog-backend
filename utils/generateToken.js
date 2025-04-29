const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  if (!id) {
    throw new Error('User ID is required to generate a token');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  try {
    const token = jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
    return token;
  } catch (error) {
    throw new Error(`Failed to generate token: ${error.message}`);
  }
};

module.exports = generateToken;