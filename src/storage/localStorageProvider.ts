import fs from "fs";
import path from "path";
import { StorageProvider } from "./storageProvider";
import type { Express } from "express";

export class LocalStorageProvider implements StorageProvider {
  private uploadDir = path.join(__dirname, "../../../uploads");

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const dest = path.join(this.uploadDir, file.originalname);
    await fs.promises.rename(file.path, dest);
    return file.originalname;
  }

  async deleteFile(fileKey: string) {
    await fs.promises.unlink(path.join(this.uploadDir, fileKey));
  }

  getFileUrl(fileKey: string) {
    return `/uploads/${fileKey}`;
  }
}
