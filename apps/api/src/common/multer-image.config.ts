import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';

// Shared between the product-image upload endpoint (uploads.controller.ts,
// staff-only) and the profile-avatar upload endpoint (auth.controller.ts,
// any authenticated role) — both accept a single image file the same way,
// so the validation/storage rules live here once instead of being copied.
export const ALLOWED_IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif)$/i;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const imageUploadInterceptorOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename: (_req, file, callback) => {
      callback(null, `${uuid()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  fileFilter: (_req: unknown, file: Express.Multer.File, callback: (error: Error | null, accept: boolean) => void) => {
    if (!ALLOWED_IMAGE_EXTENSIONS.test(extname(file.originalname))) {
      return callback(new BadRequestException('Only image files are allowed (jpg, png, webp, gif)'), false);
    }
    callback(null, true);
  },
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
};
