import { MultipartFile } from '@fastify/multipart';
export declare const uploadToCloudinary: (file: MultipartFile, options?: {
    folder?: string;
    resource_type?: "image" | "video" | "auto";
    transformation?: any[];
}) => Promise<string>;
export declare const uploadEventPoster: (file: MultipartFile) => Promise<string>;
export declare const uploadEventTrailer: (file: MultipartFile) => Promise<string>;
//# sourceMappingURL=cloudinary.d.ts.map