const mongoose = require('mongoose');
const User = require('../model/User');
const Post = require('../model/Post');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary').cloudinary;

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID', success: false });
    }

    const user = await User.findById(userId)
      .select('-password')
      .populate('followers following', 'name profilePicture');
    if (user) {
      const posts = await Post.find({ user: user._id });
      res.json({
        ...user.toObject(),
        postsCount: posts.length,
        followers: user.followers || [],
        following: user.following || [],
        success: true,
      });
    } else {
      return res.status(404).json({ message: 'User not found', success: false });
    }
  } catch (error) {
    console.error('getUserById: Error fetching user by ID:', error.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const getMe = async (req, res) => {
  try {
    console.log('getMe: req.user:', req.user);
    if (!req.user || !req.user._id) {
      console.error('getMe: Missing req.user or req.user._id');
      return res.status(401).json({ message: 'Unauthorized: No user found', success: false });
    }
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
      console.error('getMe: Invalid user ID:', req.user._id);
      return res.status(400).json({ message: 'Invalid user ID', success: false });
    }

    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
      isAdmin: user.isAdmin,
      success: true,
    });
  } catch (error) {
    console.error('getMe: Error fetching user:', error.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password', success: false });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password', success: false });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password', success: false });
    }

    if (!mongoose.Types.ObjectId.isValid(user._id)) {
      console.error('loginUser: Invalid user ID in database:', user._id);
      return res.status(500).json({ message: 'Invalid user ID in database', success: false });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
      issuer: 'myblog',
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        isAdmin: user.isAdmin,
      },
      success: true,
    });
  } catch (error) {
    console.error('loginUser: Error logging in user:', error.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password', success: false });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists', success: false });
    }

    const user = new User({ name, email, password });
    await user.save();

    if (!mongoose.Types.ObjectId.isValid(user._id)) {
      console.error('registerUser: Invalid user ID created:', user._id);
      return res.status(500).json({ message: 'Invalid user ID created', success: false });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
      issuer: 'myblog',
    });

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        isAdmin: user.isAdmin,
      },
      success: true,
    });
  } catch (error) {
    console.error('registerUser: Error registering user:', error.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const updateUser = async (req, res) => {
  try {
    console.log('updateUser: req.user:', req.user);
    if (!req.user || !req.user._id) {
      console.error('updateUser: Missing req.user or req.user._id');
      return res.status(401).json({ message: 'Unauthorized: No user found', success: false });
    }
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
      console.error('updateUser: Invalid user ID:', req.user._id);
      return res.status(400).json({ message: 'Invalid user ID', success: false });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.bio = req.body.bio || user.bio;
    if (req.body.password) {
      user.password = req.body.password;
    }

    if (req.file) {
      console.log('updateUser: Full Cloudinary response:', req.file);
      const publicId = req.file.public_id || req.file.publicId || req.file.asset_id || (req.file.path && req.file.path.split('/').pop().split('.')[0]);
      const imageUrl = req.file.secure_url || req.file.url || req.file.secureUrl || req.file.path;

      if (!publicId || !imageUrl) {
        console.error('updateUser: Cloudinary response missing public_id or url:', req.file);
        return res.status(400).json({
          message: 'Failed to process image upload: Missing metadata',
          details: req.file,
          success: false,
        });
      }

      if (user.profilePicture?.public_id && user.profilePicture.public_id !== publicId) {
        try {
          await cloudinary.uploader.destroy(user.profilePicture.public_id);
        } catch (cloudinaryError) {
          console.warn('updateUser: Failed to delete old profile picture:', cloudinaryError.message);
        }
      }

      user.profilePicture = {
        public_id: publicId,
        url: imageUrl,
      };
    }

    const updatedUser = await user.save();
    console.log('updateUser: Updated user:', updatedUser);

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      bio: updatedUser.bio,
      profilePicture: updatedUser.profilePicture,
      isAdmin: updatedUser.isAdmin,
      success: true,
    });
  } catch (error) {
    console.error('updateUser: Error updating user:', {
      message: error.message,
      stack: error.stack,
      reqUser: req.user,
    });
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID', success: false });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this user', success: false });
    }

    if (user.profilePicture?.public_id) {
      await cloudinary.uploader.destroy(user.profilePicture.public_id);
    }

    await user.deleteOne();
    res.json({ message: 'User deleted successfully', success: true });
  } catch (error) {
    console.error('deleteUser: Error deleting user:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};

const updateProfilePicture = async (req, res) => {
  try {
    console.log('updateProfilePicture: req.user:', req.user);
    if (!req.user || !mongoose.Types.ObjectId.isValid(req.user._id)) {
      console.error('updateProfilePicture: Invalid or missing req.user:', req.user);
      return res.status(400).json({ message: 'Invalid user ID', success: false });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    let profilePicture = {};
    if (req.file) {
      console.log('updateProfilePicture: Cloudinary response:', req.file);
      const publicId = req.file.public_id || req.file.asset_id || (req.file.path && req.file.path.split('/').pop().split('.')[0]);
      const imageUrl = req.file.secure_url || req.file.url;

      if (!publicId || !imageUrl) {
        console.error('updateProfilePicture: Cloudinary response missing public_id or url:', req.file);
        return res.status(400).json({
          message: 'Failed to process image upload: Missing metadata',
          details: req.file,
          success: false,
        });
      }

      if (user.profilePicture?.public_id && user.profilePicture.public_id !== publicId) {
        try {
          await cloudinary.uploader.destroy(user.profilePicture.public_id);
        } catch (cloudinaryError) {
          console.warn('updateProfilePicture: Failed to delete old profile picture:', cloudinaryError.message);
        }
      }

      profilePicture = {
        public_id: publicId,
        url: imageUrl,
      };
    } else {
      return res.status(400).json({ message: 'No image file provided', success: false });
    }

    user.profilePicture = profilePicture;
    await user.save();

    res.json({
      message: 'Profile picture updated successfully',
      profilePicture: user.profilePicture,
      success: true,
    });
  } catch (error) {
    console.error('updateProfilePicture: Error updating profile picture:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};

module.exports = {
  getUserById,
  getMe,
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
  updateProfilePicture,
};