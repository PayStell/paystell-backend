import { IStorageStrategy, StorageProvider } from '../types/storage.types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class LocalStorageStrategy implements IStorageStrategy {
  private uploadDir = 'uploads/';

  async upload(file: Express.Multer.File, customPath: string): Promise<string> {
    const fullPath = path.join(this.uploadDir, customPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);
    return fullPath;
  }

  async delete(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(filePath: string): string {
    return `/static/${filePath}`;
  }
}
