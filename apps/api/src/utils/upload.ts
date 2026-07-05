import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { AppError } from './AppError'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'mock_cloud',
  api_key: process.env.CLOUDINARY_API_KEY || 'mock_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'mock_secret',
})

const storage = multer.memoryStorage()

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new AppError(400, 'VALIDATION_002', 'Only image files are allowed.'))
    }
  },
})

export const uploadToCloudinary = async (fileBuffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (process.env.NODE_ENV === 'test' || process.env.CLOUDINARY_CLOUD_NAME === 'mock_cloud') {
      // Mock upload for dev/test
      return resolve(`https://mock-cloudinary.com/image/${Date.now()}.jpg`)
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder: 'truf_gaming_venues' },
      (error, result) => {
        if (error) return reject(error)
        resolve(result!.secure_url)
      }
    )
    stream.end(fileBuffer)
  })
}
