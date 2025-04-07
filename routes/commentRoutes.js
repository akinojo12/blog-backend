const express = require ('express')
const router = express.Router()
const commentController = require ('../controllers/commentController')
const { protect } = require('../middleware/authMiddleware')

router.route('/').post(protect, commentController.createComment)
router.route('/post/:postId').get(commentController.getCommentsForPost);
router.route('/:id').put(protect, commentController.updateComment).delete(protect, commentController.deleteComment)

module.exports = router;