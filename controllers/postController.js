const Post = require("../model/Post");
const slugify = require ('slugify');
const cloudinary = require('../config/cloudinary').cloudinary

const createPost = async (req, res) =>{
    const {title, content, excerpt,} = req.body;

    const slug = slugify(title, { lower: true, strict: true});

    const existingPost = await Post.findOne({slug});
    if(existingPost) { res.status(400);
        throw new Error( "Post already exists" )
}
    let featuredImage = {};
    if(req.file){
        featuredImage = {
            public_id: req.file.public_id,
            url: req.secure_url
        }
    }
    const post = await Post.create({
        title,
        content,
        excerpt,
        author: req.user._id,
        slug,
        featuredImage
    })

    if (post) {
        res.status(201).json(post);
    } else {
        res.status(201).json(post);
        throw new Error("Failed to create post");
    }
}

const getPosts = async (req, res) => {
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;

    const keyword = req.query.keyword ? {
        $or: [
            { title: { $regex: req.query.keyword, $options: 'i' } },
            { excerpt: { $regex: req.query.keyword, $options: 'i' } },
            { content: { $regex: req.query.keyword, $options: 'i' } },
        ]
    } : {};

    const count = await Post.countDocuments({ ...keyword })
    const posts = await Post.find({ ...keyword }).populate('author', 'name', 'profilePicture').sort({ createAt: -1}).limit(pageSize).skip(pageSize * (page - 1));

    res.json({ posts, page, pages: Math.ceil(count / pageSize) });
}

const getPostBySlug = async (req, res) => {
    const post = await Post.findOne({ slug: req.params.slug }).populate('author', 'name profilePicture bio');
    if (post) {
        res.json(post);
    } else {
        res.status(404);
        throw new Error("Post not found");
    }


}

const updatePost = async (req,res) =>{
    const post = await Post.findById(req.params.id);

    if (!post){
        res.status(404);
        throw new Error("Post not found");
    }

    if (post.author.toString() !== req.user._id.toString() && !req.user.isAdmin){
        res.status(401);
        throw new Error('Not authorized to update this post');
    }

    post.title = req.body.title || post.title;
    post.content = req.body.content || post.content;
    post.excerpt = req.body.excerpt || post.excerpt;
    
    if (req.file) {
        if(post.featuredImage?.public_id) {
            await cloudinary.uploader.destroy(post.featuredImage.public_id);
        }
        post.featuredImage = {
            public_id: req.file.public_id,
            url: req.file.url
        }
    }

    if (req.body.title && req.body.title !== post.title){
        post.slug = slugify(req.body.title, { lower: true, strict: true });
    }

    const updatedPost = await post.save();
    res.json(updatedPost);
}

const deletePost = async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
        res.status(404);
        throw new Error("Post not found");
    }

    if (post.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
        res.status(401);
        throw new Error('not authorized to delete this post');
    }

  if (post.featuredImage?.public_id) {
    await cloudinary.uploader.destroy(post.featuredImage.public_id)
  }
  await post.remove()
  res.json({ message: 'post removed'})
}

    const likePost = async(req, res) => {
        const post = await Post.findById(req.params.id);
        if (!post) {
            res.status(404);
            throw new Error("Post not found");
        }

        if (post.likes.includes(req.user._id)) {
            res.status(400);
            throw new Error('post already liked')
        }
        post.likes.push(req.user._id);
        post.likesCount = post.like.length;
        await post.save();
        res.json({ likes: post.likes, likesCount: post.likesCount });
    }

    const unlikePost = async(req, res) => {
        const post = await Post.findById(req.params.id);
        if (!post) {
            res.status(404);
            throw new Error("Post not found");

        }

        if (!post.likes.include(req.user._id)) {
            res.status(400);
            throw new Error('post not liked yet')
        }

        post.likes = post.likes.filter((id) => id.toString() !== req.user._id.toString());
        post.likesCount = post.likes.length;
        await post.save();
        res.json({ likes: post.likes, likesCount: post.likesCount });
    };

    const getPostByUser =  async (req, res) => {
        const posts = await Post.find({ author: req.user._id }).populate('author', 'name profilePicture');
        res.json(posts);
    }

    module.exports = {
        createPost,
        getPosts,
        getPostBySlug,
        updatePost,
        deletePost,
        likePost,
        unlikePost,
        getPostByUser,
    }