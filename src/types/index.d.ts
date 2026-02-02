// src/types/index.d.ts
// Type augmentation for Fastify to include custom properties and decorators

import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: string;
      address?: string;
    };
  }

  interface FastifyInstance {
    authenticate(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string;
      email?: string;
      role: string;
      address?: string;
    };
    user: {
      id: string;
      email: string;
      role: string;
      address?: string;
    };
  }
}

// Custom file upload type compatible with both Fastify multipart and Cloudinary
export interface UploadedFile {
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  toBuffer(): Promise<Buffer>;
  file: NodeJS.ReadableStream;
}