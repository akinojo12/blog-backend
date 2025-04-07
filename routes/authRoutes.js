const express = require ('express')
const router = express.Router()
const authController = require('../controllers/authController')
const { uploadSingleImage } = require('../middleware/uploadMiddleware')
const { check } = require ('express-validator')

router.post('/register', [
    check('name', 'Name is required').not().isEmpty(),
    check('password', 'Please enter a password with 8 or more characters').isLength({ min: 8 }),
], authController.registerUser)

router.post('/login', authController.authUser);
router.get('/profile', authController.getUserProfile);
router.put('/profile', uploadSingleImage('profilePicture'), authController.updateUserProfile);
router.post('/forgotpassword', authController.forgotPassword);
router.put('/resetpassword/:resettoken', authController.resetPassword);

module.exports = router;