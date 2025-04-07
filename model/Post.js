const mongoose = require("mongoose");

const postSchema = mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    excerpt: { type: String, required: true},
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, deafult: 0},
    slug: { type: String, required: true, unique: true},
    featuredImage: { public_id: {type: String,},
            url: {type: String,},
    },
     
}, { timestamps : true });

const Post = mongoose.model("Post", postSchema); 

module.exports = Post;