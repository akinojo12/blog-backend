const User = require("../model/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require('crypto')
const { validationResult } = require('express-validator');
const cloudinary = require ('../config/cloudinary').cloudinary




const registerUser = async (req, res) => {
    validationResult(req);
    if(!error.isEmpty()) {
        res.status(400);
        throw new Error(errors.array()[0].msg);
    }

    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists')
    }

    const user = await User.create({ name, email, password });
    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
        });
    } else{
        res.status(400);
        throw new Error('Invalid user data')
    }
};

const authUser = async( req, res) =>{
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
        })
    } else {
        res.status(401);
        throw new Error('Invalid email or password')
    }
};

const getUserProfile = async (req, res) => {
    const user = await User.findbyId(req.user._id);
    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            bio: user.bio,
            profilePicture: user.profilePicture,
        })
    } else {
        res.status(404);
        throw new Error('User not found')
    }
};

const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.bio = req.body.bio || user.bio;
       if (req.file) {
        if(user.profilePicture?.public_id) {
            await cloudinary.uploader.destroy(user.profilePicture.public_id);
        }
        user.profilePicture = {
            public_id: req.file.filename,
            url: req.file.path,
        }
       }

        if(req.body.password) {
            user.password = req.body.password;
        }
        const updatedUser = await user.save();
        
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            isAdmin: updatedUser.isAdmin,
            bio: updatedUser.bio,
            profilePicture: updatedUser.profilePicture,
            token: generateToken(updatedUser._id)
        })
    } else {
        res.status(404);
        throw new Error('User not found')
    }
};

const forgotPassword = async (req, res) =>{
    const user = await User.findOne({email: req.body.email});

    if (!user) {
        res.status(404);
        throw new Error('User not found')
    }

    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/resetpassword/${resetToken}`;

    const message = `You are receiving this email because you requested the reset of your password. click this link to
    reset your password: ${resetUrl}`;
    
    try {
        await sendEmail ({
            email: user.email,
            subject: 'password reset',
            message,
        });

        res.status(200).json({ success: true, data: 'Email sent' })
    } catch (err) {
        console.log(err);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(500);
        throw new Error ('Email could not be sent')
        
    }

};

const resetPassword = async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');
    const user = await User.findOne({resetPasswordToken, resetPasswordExpires: { $gt: Date.now() } });

    if (!user) {
        res.status(400);
        throw new Error('Invalid reset token')

    }
        user.password =  req.body.password;
        user.resetPasswordToken = undefined
        user.resetPasswordExpires = undefined;
        await user.save();
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
        })
}

module.exports = {
    registerUser, authUser, getUserProfile, updateUserProfile, forgotPassword, resetPassword,
}