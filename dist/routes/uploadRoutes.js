"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const router = express_1.default.Router();
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: 'dlffvoetz',
    api_key: '662962781115292',
    api_secret: 'vqtMiYWA_5Kiyk0Et1i95BEdJw8'
});
// Configure Multer to use memory storage
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
router.post('/', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        const files = req.files;
        const uploadPromises = files.map(file => {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary_1.v2.uploader.upload_stream({ folder: 'unnati-erp/designs', resource_type: 'auto' }, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve({ url: result.secure_url });
                });
                uploadStream.end(file.buffer);
            });
        });
        const results = await Promise.all(uploadPromises);
        const urls = results.map(r => r.url);
        res.json({ success: true, urls });
    }
    catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});
exports.default = router;
//# sourceMappingURL=uploadRoutes.js.map