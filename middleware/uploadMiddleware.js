const multer = require('multer');
const { storage } = require('../config/cloudinary');

// Configure multer with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      console.log('File accepted:', file.originalname, file.mimetype);
      cb(null, true);
    } else {
      console.error('File rejected:', file.originalname, file.mimetype);
      cb(new Error('Only JPEG, JPG, PNG, and GIF files are allowed!'), false);
    }
  },
});

const uploadSingleImage = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      console.error('Multer error (single upload):', err.message);
      return res.status(400).json({ message: err.message, success: false });
    }
    console.log('Multer processed file:', req.file); // Debug log
    next();
  });
};

const uploadMultipleImages = (fieldName, maxCount) => (req, res, next) => {
  upload.array(fieldName, maxCount)(req, res, (err) => {
    if (err) {
      console.error('Multer error (multiple upload):', err.message);
      return res.status(400).json({ message: err.message, success: false });
    }
    console.log('Multer processed files:', req.files); // Debug log
    next();
  });
};

module.exports = {
  upload,
  uploadSingleImage,
  uploadMultipleImages,
};