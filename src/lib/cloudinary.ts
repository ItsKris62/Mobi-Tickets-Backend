// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import { envConfig } from '../config/env';
import { MultipartFile } from '@fastify/multipart';

// Configure Cloudinary
cloudinary.config({
  cloud_name: envConfig.CLOUDINARY_CLOUD_NAME,
  api_key: envConfig.CLOUDINARY_API_KEY,
  api_secret: envConfig.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadToCloudinary = async (
  file: MultipartFile,
  options: {
    folder?: string;
    resource_type?: 'image' | 'video' | 'auto';
    transformation?: any[];
  } = {}
): Promise<string> => {
  const { folder = 'mobitickets', resource_type = 'auto', transformation = [] } = options;

  // Convert file stream to buffer
  const buffer = await file.toBuffer();

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type,
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
          transformation: [
            ...(resource_type === 'image'
              ? [{ width: 1200, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
              : [{ quality: 'auto', fetch_format: 'auto' }]),
            ...transformation,
          ],
        },
        (error, result) => {
          if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          if (!result?.secure_url) return reject(new Error('No secure_url returned'));
          resolve(result.secure_url);
        }
      )
      .end(buffer);
  });
};

// Helper for event poster (optimized image)
export const uploadEventPoster = (file: MultipartFile) =>
  uploadToCloudinary(file, { folder: 'events/posters', resource_type: 'image' });

// Helper for trailer video
export const uploadEventTrailer = (file: MultipartFile) =>
  uploadToCloudinary(file, { folder: 'events/trailers', resource_type: 'video' });