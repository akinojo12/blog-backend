const mongoose = require('mongoose');
const Post = require('../model/Post');
const slugify = require('slugify');
const cloudinary = require('../config/cloudinary').cloudinary;

const createPost = async (req, res) => {
  try {
    const { title, content, excerpt, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required', success: false });
    }

    const slug = slugify(title, { lower: true, strict: true });
    const existingPost = await Post.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({ message: 'Post with this title already exists', success: false });
    }

    let featuredImage = {};
    if (req.file) {
      console.log('Full Cloudinary response:', req.file);
      const publicId = req.file.public_id || req.file.publicId || req.file.asset_id || (req.file.path && req.file.path.split('/').pop().split('.')[0]);
      const imageUrl = req.file.secure_url || req.file.url || req.file.path;

      if (!publicId || !imageUrl) {
        console.error('Cloudinary response missing public_id or url. Response:', req.file);
        return res.status(400).json({
          message: 'Failed to process image upload. Image uploaded to Cloudinary but metadata is missing.',
          details: req.file,
          success: false,
        });
      }

      featuredImage = {
        public_id: publicId,
        url: imageUrl,
      };
    }

    console.log('createPost: Creating post for user:', req.user._id);
    const post = await Post.create({
      user: req.user._id,
      title,
      content,
      excerpt,
      slug,
      category: category || 'Home',
      featuredImage,
    });

    await post.populate('user', 'name profilePicture');
    console.log('createPost: Created post:', post._id, 'for user:', post.user._id);
    res.status(201).json(post);
  } catch (error) {
    console.error('createPost: Error creating post:', error.message);
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: 'File upload error: ' + error.message, success: false });
    }
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};

const getPosts = async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;
    const category = req.query.category || 'Home';
    const keyword = req.query.keyword
      ? {
          $or: [
            { title: { $regex: req.query.keyword, $options: 'i' } },
            { excerpt: { $regex: req.query.keyword, $options: 'i' } },
            { content: { $regex: req.query.keyword, $options: 'i' } },
          ],
        }
      : {};

    const query = category === 'Home' ? keyword : { ...keyword, category };
    const count = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('user', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({
      posts,
      page,
      pages: Math.ceil(count / pageSize),
      success: true,
    });
  } catch (error) {
    console.error('Error fetching posts:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};

const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    console.log('getPostById called with postId:', postId);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.error('Invalid postId:', postId);
      return res.status(400).json({ message: 'Invalid post ID', success: false });
    }

    const post = await Post.findById(postId).populate('user', 'name profilePicture');
    if (!post) {
      return res.status(404).json({ message: 'Post not found', success: false });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching post by ID:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};

const getPostBySlug = async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug }).populate('user', 'name profilePicture');
    if (!post) {
      return res.status(404).json({ message: 'Post not found', success: false });
    }
    res.json(post);
  } catch (error) {
    console.error('Error fetching post by slug:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};

const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found', success: false });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this post', success: false });
    }

    post.title = req.body.title || post.title;
    post.content = req.body.content || post.content;
    post.excerpt = req.body.excerpt || post.excerpt;
    post.category = req.body.category || post.category;

    if (req.file) {
      console.log('Full Cloudinary response:', req.file);
      const publicId = req.file.public_id || req.file.publicId || req.file.asset_id || (req.file.path && req.file.path.split('/').pop().split('.')[0]);
      const imageUrl = req.file.secure_url || req.file.url || req.file.path;

      if (!publicId || !imageUrl) {
        console.error('Cloudinary response missing public_id or url. Response:', req.file);
        return res.status(400).json({
          message: 'Failed to process image upload. Image uploaded to Cloudinary but metadata is missing.',
          details: req.file,
          success: false,
        });
      }

      if (post.featuredImage?.public_id) {
        await cloudinary.uploader.destroy(post.featuredImage.public_id);
      }

      post.featuredImage = {
        public_id: publicId,
        url: imageUrl,
      };
    }

    if (req.body.title && req.body.title !== post.title) {
      post.slug = slugify(req.body.title, { lower: true, strict: true });
    }

    const updatedPost = await post.save();
    await updatedPost.populate('user', 'name profilePicture');
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};
const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    console.log('deletePost: postId=', postId); // Debug log
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.error('Invalid postId:', postId);
      return res.status(400).json({ message: 'Invalid post ID', success: false });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found', success: false });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post', success: false });
    }

    if (post.featuredImage?.public_id) {
      await cloudinary.uploader.destroy(post.featuredImage.public_id);
    }

    await post.deleteOne();
    res.json({ message: 'Post removed', success: true });
  } catch (error) {
    console.error('Error deleting post:', error.message, { postId: req.params.id });
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found', success: false });
    }

    if (post.likes.includes(req.user._id)) {
      return res.status(400).json({ message: 'Post already liked', success: false });
    }

    post.likes.push(req.user._id);
    post.likesCount = post.likes.length;
    await post.save();
    res.json({ likes: post.likes, likesCount: post.likesCount, success: true });
  } catch (error) {
    console.error('Error liking post:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};

const unlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found', success: false });
    }

    if (!post.likes.includes(req.user._id)) {
      return res.status(400).json({ message: 'Post not liked yet', success: false });
    }

    post.likes = post.likes.filter((id) => id.toString() !== req.user._id.toString());
    post.likesCount = post.likes.length;
    await post.save();
    res.json({ likes: post.likes, likesCount: post.likesCount, success: true });
  } catch (error) {
    console.error('Error unliking post:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};

const getPostsByUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    console.log('getPostsByUser: Fetching posts for userId:', userId);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('getPostsByUser: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID', success: false });
    }

    const posts = await Post.find({ user: userId })
      .populate('user', 'name profilePicture')
      .sort({ createdAt: -1 });

    console.log('getPostsByUser: Fetched posts:', posts.length, posts.map(p => p._id.toString()));
    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('getPostsByUser: Error fetching user posts:', error.message);
    res.status(500).json({ message: 'Server error', success: false });
  }
};


const getLikedPosts = async (req, res) => {
  try {
    console.log('getLikedPosts: req.user:', req.user);
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized: No user found', success: false });
    }

    const userId = req.user._id;
    console.log('getLikedPosts: userId:', userId);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID', success: false });
    }

    const posts = await Post.find({ likes: userId })
      .populate({
        path: 'user',
        select: 'name profilePicture',
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log('getLikedPosts: Raw posts from DB:', posts);

    const validPosts = posts.filter(post => {
      const isValidPostId = mongoose.Types.ObjectId.isValid(post._id);
      if (!isValidPostId) {
        console.warn('Invalid post ID found in getLikedPosts:', post._id, 'Post:', post);
        return false;
      }
      if (post.user && !mongoose.Types.ObjectId.isValid(post.user._id)) {
        console.warn('Invalid user ID in post:', post.user._id, 'Post:', post);
        post.user = null;
      }
      return true;
    });

    console.log('getLikedPosts: Returning valid posts:', validPosts.length);
    res.json({ success: true, data: validPosts });
  } catch (error) {
    console.error('Error fetching liked posts:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Server error', success: false });
  }
};

module.exports = {
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
};