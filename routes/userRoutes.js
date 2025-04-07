const express = require ('express')
const router = express.Router()
const userController = require ('../controllers/userController')
const { protect, admin } = require('../middleware/authMiddleware')

router.route('/').get(protect, admin, userController.getUsers)
router.route('/:id').get(userController.getUserById).put(protect, admin, userController.updateUser).delete(protect, admin, userController.deleteUser)

module.exports = router;