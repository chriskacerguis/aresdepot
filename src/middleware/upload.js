const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '../../uploads');
const licensesDir = path.join(uploadsDir, 'licenses');
const proofsDir = path.join(uploadsDir, 'proofs');
const photosDir = path.join(uploadsDir, 'photos');

[uploadsDir, licensesDir, proofsDir, photosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for FCC licenses
const licenseStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, licensesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'license-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for achievement proofs
const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, proofsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for profile photos
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, photosDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for PDFs and images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF and image files (JPEG, PNG) are allowed!'));
  }
};

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB default

const uploadLicense = multer({
  storage: licenseStorage,
  limits: { fileSize: maxFileSize },
  fileFilter: fileFilter
});

const uploadProof = multer({
  storage: proofStorage,
  limits: { fileSize: maxFileSize },
  fileFilter: fileFilter
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG) are allowed!'));
    }
  }
});

module.exports = {
  uploadLicense,
  uploadProof,
  uploadPhoto
};
