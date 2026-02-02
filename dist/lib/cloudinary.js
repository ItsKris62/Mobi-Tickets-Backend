"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadEventTrailer = exports.uploadEventPoster = exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const env_1 = require("../config/env");
cloudinary_1.v2.config({
    cloud_name: env_1.envConfig.CLOUDINARY_CLOUD_NAME,
    api_key: env_1.envConfig.CLOUDINARY_API_KEY,
    api_secret: env_1.envConfig.CLOUDINARY_API_SECRET,
    secure: true,
});
const uploadToCloudinary = async (file, options = {}) => {
    const { folder = 'mobitickets', resource_type = 'auto', transformation = [] } = options;
    const buffer = await file.toBuffer();
    return new Promise((resolve, reject) => {
        cloudinary_1.v2.uploader
            .upload_stream({
            folder,
            resource_type,
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
            transformation: [
                ...(resource_type === 'image'
                    ? [{ width: 1200, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
                    : [{ quality: 'auto', fetch_format: 'auto' }]),
                ...transformation,
            ],
        }, (error, result) => {
            if (error)
                return reject(new Error(`Cloudinary upload failed: ${error.message}`));
            if (!result?.secure_url)
                return reject(new Error('No secure_url returned'));
            resolve(result.secure_url);
        })
            .end(buffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
const uploadEventPoster = (file) => (0, exports.uploadToCloudinary)(file, { folder: 'events/posters', resource_type: 'image' });
exports.uploadEventPoster = uploadEventPoster;
const uploadEventTrailer = (file) => (0, exports.uploadToCloudinary)(file, { folder: 'events/trailers', resource_type: 'video' });
exports.uploadEventTrailer = uploadEventTrailer;
//# sourceMappingURL=cloudinary.js.map