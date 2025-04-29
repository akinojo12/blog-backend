const mongoose = require('mongoose');
const User = require('../model/User');
const { validationResult } = require('express-validator');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      success: false,
    });
  }

  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists', success: false });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (!mongoose.Types.ObjectId.isValid(user._id)) {
      console.error('registerUser: Invalid user ID created:', user._id);
      return res.status(500).json({ message: 'Invalid user ID created', success: false });
    }

    const token = generateToken(user._id);
    console.log('registerUser: Generated token:', token);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin || false,
        bio: user.bio || '',
        profilePicture: user.profilePicture || null,
        followers: user.followers || [],
        following: user.following || [],
      },
      success: true,
    });
  } catch (error) {
    console.error('registerUser: Error registering user:', error.message);
    res.status(400).json({ message: 'Invalid user data', success: false });
  }
};

const authUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      success: false,
    });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password', success: false });
    }

    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password', success: false });
    }

    if (!mongoose.Types.ObjectId.isValid(user._id)) {
      console.error('authUser: Invalid user ID in database:', user._id);
      return res.status(500).json({ message: 'Invalid user ID in database', success: false });
    }

    const token = generateToken(user._id);
    console.log('authUser: Generated token:', token);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin || false,
        bio: user.bio || '',
        profilePicture: user.profilePicture || null,
        followers: user.followers || [],
        following: user.following || [],
      },
      success: true,
    });
  } catch (error) {
    console.error('authUser: Error logging in user:', error.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const getUserProfile = async (req, res) => {
  try {
    console.log('getUserProfile: req.user:', req.user);
    if (!req.user || !mongoose.Types.ObjectId.isValid(req.user._id)) {
      console.error('getUserProfile: Invalid user ID:', req.user?._id);
      return res.status(400).json({ message: 'Invalid user ID', success: false });
    }

    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('followers', 'name')
      .populate('following', 'name');
    if (!user) {
      console.error('getUserProfile: User not found for ID:', req.user._id);
      return res.status(404).json({ message: 'User not found', success: false });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      bio: user.bio,
      profilePicture: user.profilePicture,
      followers: user.followers,
      following: user.following,
      success: true,
    });
  } catch (error) {
    console.error('getUserProfile: Error fetching user profile:', error.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    console.log('updateUserProfile: req.user:', req.user);
    if (!req.user || !mongoose.Types.ObjectId.isValid(req.user._id)) {
      console.error('updateUserProfile: Invalid user ID:', req.user?._id);
      return res.status(400).json({ message: 'Invalid user ID', success: false });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      console.error('updateUserProfile: User not found for ID:', req.user._id);
      return res.status(404).json({ message: 'User not found', success: false });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.bio = req.body.bio || user.bio;

    if (req.body.password) {
      user.password = req.body.password;
    }

    if (req.body.profilePicture) {
      user.profilePicture = req.body.profilePicture;
    }

    const updatedUser = await user.save();
    const token = generateToken(updatedUser._id);
    console.log('updateUserProfile: Generated token:', token);

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      bio: updatedUser.bio,
      profilePicture: updatedUser.profilePicture,
      followers: updatedUser.followers,
      following: updatedUser.following,
      token,
      success: true,
    });
  } catch (error) {
    console.error('updateUserProfile: Error updating user profile:', error.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/resetpassword/${resetToken}`;
    const message = `You are receiving this email because you requested the reset of your password. Click this link to reset your password: ${resetUrl}`;

    await sendEmail({
      email: user.email,
      subject: 'Password Reset',
      message,
    });

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (error) {
    console.error('forgotPassword: Error sending password reset email:', error.message);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(500).json({ message: 'Email could not be sent', success: false });
  }
};

const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token', success: false });
    }

    if (!mongoose.Types.ObjectId.isValid(user._id)) {
      console.error('resetPassword: Invalid user ID in database:', user._id);
      return res.status(500).json({ message: 'Invalid user ID in database', success: false });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const token = generateToken(user._id);
    console.log('resetPassword: Generated token:', token);

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      bio: user.bio,
      profilePicture: user.profilePicture,
      followers: user.followers,
      following: user.following,
      token,
      success: true,
    });
  } catch (error) {
    console.error('resetPassword: Error resetting password:', error.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

module.exports = {
  registerUser,
  authUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
};