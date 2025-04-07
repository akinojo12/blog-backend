const User = require('../model/User')
const Post = require('../model/Post')

const getUsers = async (req, res) =>{
const users = await User.find({}).select('-password')
res.json(users)
}

const getUserById = async (req,res) => {
    const user = await User.findById(req.params.id).select('-password')
    if (user) {
        const posts = await Post.find({ author: user._id});
        res.json({ ...user.toObject(), postsCount: posts.length, })
    } else {
        res.status(404);
        throw new Error('user not found')
    }

}


const updateUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.isAdmin = req.body.isAdmin;

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            isAdmin: updatedUser.isAdmin,
        })
    } else {
        res.status(404);
        throw new Error('user not found')
    }
}

const deleteUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        await user.remove();
        res.json({ message: 'user deleted successfully' })

    } else{
        res.status(404);
        throw new Error('user not found')
    }
}

module.exports= { getUsers, getUserById, updateUser, deleteUser }