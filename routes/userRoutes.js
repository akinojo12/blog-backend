const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getUserById, getMe, registerUser, loginUser, updateUser, deleteUser, updateProfilePicture } = require('../controllers/userController');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');


router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

router.put('/profile-picture', protect, uploadSingleImage('profilePicture'), updateProfilePicture);
router.put('/profile', protect, uploadSingleImage('profilePicture'), updateUser);
router.get('/:id', protect, getUserById);
router.delete('/:id', protect, deleteUser);

module.exports = router;
