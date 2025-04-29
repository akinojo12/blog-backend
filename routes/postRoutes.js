const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createPost,
  getPosts,
  getPostById,
  getPostBySlug,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getPostsByUser,
  getLikedPosts,
} = require('../controllers/postController');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');

router.post('/', protect, uploadSingleImage('featuredImage'), createPost);
router.get('/', protect, getPosts);
router.get('/slug/:slug', protect, getPostBySlug);
router.get('/liked', protect, getLikedPosts);
router.get('/user', protect, getPostsByUser);
router.get('/user/:userId', protect, getPostsByUser);
router.get('/:id', protect, getPostById);
router.put('/:id', protect, uploadSingleImage('featuredImage'), updatePost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, likePost);
router.post('/:id/unlike', protect, unlikePost);

module.exports = router;