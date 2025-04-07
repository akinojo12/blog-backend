const express = require ('express');
const router = express.Router()
const postController = require ('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingleImage } = require('../middleware/uploadMiddleware')

router.route('/').post(protect, uploadSingleImage('featuredImage'), postController.createPost).get(postController.getPosts);

router.route('/user/:userId').get(postController.getPostByUser);
router.route('/:slug').get(postController.getPostBySlug);
router.route('/:id').put(protect, uploadSingleImage('featuredImage'), postController.updatePost).delete(protect, postController.deletePost);
router.route('/:id/like').post(protect, postController.likePost).delete(protect, postController.unlikePost);

module.exports = router;