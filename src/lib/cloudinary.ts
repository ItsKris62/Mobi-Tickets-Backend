// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import { envConfig } from '../config/env';
import { MultipartFile } from '@fastify/multipart';

// Cloudinary folder structure: Home/Mobi-Tickets/<subfolder>
const CLOUDINARY_BASE_FOLDER = 'Home/Mobi-Tickets';

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
  const { folder = CLOUDINARY_BASE_FOLDER, resource_type = 'auto', transformation = [] } = options;

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

// Delete a resource from Cloudinary by its public_id
export const deleteFromCloudinary = async (
  publicId: string,
  resource_type: 'image' | 'video' = 'image'
): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, { resource_type });
};

// Extract public_id from a Cloudinary secure_url
export const extractPublicId = (secureUrl: string): string | null => {
  try {
    // URL format: https://res.cloudinary.com/<cloud>/image/upload/v123/folder/file.ext
    const match = secureUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

// Helper for event poster (optimized image)
export const uploadEventPoster = (file: MultipartFile) =>
  uploadToCloudinary(file, {
    folder: `${CLOUDINARY_BASE_FOLDER}/events-poster`,
    resource_type: 'image',
  });

// Helper for trailer video
export const uploadEventTrailer = (file: MultipartFile) =>
  uploadToCloudinary(file, {
    folder: `${CLOUDINARY_BASE_FOLDER}/events-poster`,
    resource_type: 'video',
  });

// Helper for user avatar (square crop, smaller dimensions)
export const uploadUserAvatar = (file: MultipartFile) =>
  uploadToCloudinary(file, {
    folder: `${CLOUDINARY_BASE_FOLDER}/user-avatar`,
    resource_type: 'image',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' },
    ],
  });

// Helper for web assets (logos, banners, etc.)
export const uploadWebAsset = (file: MultipartFile) =>
  uploadToCloudinary(file, {
    folder: `${CLOUDINARY_BASE_FOLDER}/web-assets`,
    resource_type: 'auto',
  });