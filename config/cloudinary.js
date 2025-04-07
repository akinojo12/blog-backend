const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');


cloudinary.config({
    cloud_name: "docy37n4q",
    api_key: "611253855949645",
    api_secret: "Esf3tZzKTAIeCXCUdPBskFOCah8"
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'blog-site',
        formats: ['jpg', 'png', 'jpeg'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
    }
});
module.exports = { cloudinary, storage}