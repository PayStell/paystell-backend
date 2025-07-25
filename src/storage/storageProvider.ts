import type { Express } from "express";

export interface StorageProvider {
  uploadFile(
    file: Express.Multer.File,
    options?: { [key: string]: unknown },
  ): Promise<string>;
  deleteFile(fileKey: string): Promise<void>;
  getFileUrl(fileKey: string): string;
}
