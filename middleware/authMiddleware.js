const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../model/User');

const protect = async (req, res, next) => {
  let token;
  console.log('protect: Authorization header:', req.headers.authorization);
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('protect: Extracted token:', token);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('protect: Decoded token:', decoded);
      
      const userId = decoded.id || decoded._id;
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.error('protect: Invalid user ID in token:', userId);
        return res.status(401).json({ message: 'Not authorized, invalid user ID in token', success: false });
      }
      
      req.user = await User.findById(userId).select('-password');
      if (!req.user) {
        console.error('protect: User not found for ID:', userId);
        return res.status(401).json({ message: 'Not authorized, user not found', success: false });
      }
      
      console.log('protect: req.user set:', req.user);
      next();
    } catch (error) {
      console.error('protect: Token verification error:', {
        message: error.message,
        name: error.name,
        expiredAt: error.expiredAt,
      });
      return res.status(401).json({ message: 'Not authorized, token failed', success: false });
    }
  } else {
    console.error('protect: No token provided');
    return res.status(401).json({ message: 'Not authorized, no token', success: false });
  }
};

module.exports = { protect };