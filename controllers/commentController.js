const Comment = require('../model/Comment');
const Post = require('../model/Post');

const createComment = async (req, res) => {
  const { content, postId } = req.body;

  const post = await Post.findById(postId);
  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  const comment = await Comment.create({
    content,
    post: postId,
    author: req.user._id,
  });

  // Increment commentCount
  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

  await comment.populate('author', 'name profilePicture');
  res.status(201).json(comment);
};

const getCommentsForPost = async (req, res) => {
  const comments = await Comment.find({ 
    post: req.params.postId,
  })
    .populate('author', 'name profilePicture')
    .sort({ createdAt: -1 });
  res.json(comments);
};

const updateComment = async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }
  if (comment.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error('You are not authorized to update this comment');
  }

  comment.content = req.body.content || comment.content;

  const updatedComment = await comment.save();
  res.json(updatedComment);
};

const deleteComment = async (req, res) => {
  try {
    console.log('Received DELETE request for comment ID:', req.params.id);
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      console.log('Comment not found:', req.params.id);
      res.status(404);
      throw new Error('Comment not found');
    }

    console.log('Comment author:', comment.author.toString());
    console.log('Requesting user:', req.user._id.toString());
    console.log('Is admin:', req.user.isAdmin);

    if (comment.author.toString() !== req.user._id.toString() && !(req.user.isAdmin === true)) {
      console.log('Unauthorized attempt to delete comment');
      res.status(401);
      throw new Error('You are not authorized to delete this comment');
    }

    // Delete the comment
    await Comment.deleteOne({ _id: req.params.id });

    // Decrement commentCount
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } });

    console.log('Comment deleted successfully');
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error in deleteComment:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createComment, getCommentsForPost, updateComment, deleteComment };