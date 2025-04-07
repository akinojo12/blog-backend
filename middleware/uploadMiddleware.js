const multer = require ('multer');
const { storage } =  require('../config/cloudinary');

const upload = multer({
    storage: storage, 
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
      }
})

exports.uploadSingleImage = (fieldName) => upload.single(fieldName);
exports.uploadMultipleImages = (fieldName, maxCount) => upload.array(fieldName, maxCount);