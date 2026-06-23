import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dlffvoetz',
  api_key: '662962781115292',
  api_secret: 'vqtMiYWA_5Kiyk0Et1i95BEdJw8'
});

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = req.files as Express.Multer.File[];
    const uploadPromises = files.map(file => {
      return new Promise<{ url: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'unnati-erp/designs' },
          (error, result) => {
            if (error) reject(error);
            else resolve({ url: result!.secure_url });
          }
        );
        uploadStream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    const urls = results.map(r => r.url);

    res.json({ success: true, urls });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

export default router;
