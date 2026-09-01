import { useMutation } from '@tanstack/react-query';
import { uploadFile } from './api-client';

interface UploadResponse {
  url: string;
}

export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => uploadFile<UploadResponse>('/uploads/image', file),
  });
}
