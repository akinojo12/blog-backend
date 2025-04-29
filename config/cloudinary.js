const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.api.ping((error, result) => {
  if (error) {
    console.error('Cloudinary configuration error:', error);
  } else {
    console.log('Cloudinary configuration successful:', result);
  }
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // Determine the folder based on the field name
    const folder = file.fieldname === 'profilePicture' ? 'profile_pictures' : 'blog-site';
    return {
      folder: folder,
      formats: ['jpg', 'png', 'jpeg'],
      transformation: [
        { width: 500, height: 500, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
      ],
    };
  },
});

module.exports = { cloudinary, storage };