const mongoose = require ("mongoose")

const commentSchema = mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Post' },
    content: { type: String, required: true},
    author: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },

}, { timestamps: true});

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment; 