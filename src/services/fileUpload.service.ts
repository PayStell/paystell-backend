import sharp from 'sharp';
import { LocalStorageStrategy } from './storage/local.strategy';
import { S3StorageStrategy } from './storage/s3.strategy';
import { StorageProvider, IStorageStrategy, FileMetadata } from './types/storage.types';
import { v4 as uuidv4 } from 'uuid';

export class FileUploadService {
  private storage: IStorageStrategy;

  constructor() {
    const provider = process.env.STORAGE_PROVIDER as StorageProvider || StorageProvider.LOCAL;
    this.storage = provider === StorageProvider.S3 ? new S3StorageStrategy() : new LocalStorageStrategy();
  }

  async processAndUpload(file: Express.Multer.File, category: string, tags: string[] = []): Promise<FileMetadata> {
    // 1. Virus Scanning (Mock implementation - would call ClamAV API)
    await this.scanForViruses(file);

    // 2. Image Processing
    let buffer = file.buffer;
    if (file.mimetype.startsWith('image/')) {
      buffer = await this.optimizeImage(file, category);
    }

    // 3. Storage
    const fileName = `${category}/${uuidv4()}-${file.originalname}`;
    const path = await this.storage.upload({ ...file, buffer }, fileName);

    // 4. Metadata (This should be saved to DB)
    return {
      id: uuidv4(),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: buffer.length,
      provider: process.env.STORAGE_PROVIDER as StorageProvider,
      path,
      category: category as any,
      tags,
      createdAt: new Date(),
    };
  }

  private async scanForViruses(file: Express.Multer.File): Promise<void> {
    // Integration with ClamAV or similar
    const isSafe = true; 
    if (!isSafe) throw new Error('Security Violation: Virus detected in file');
  }

  private async optimizeImage(file: Express.Multer.File, category: string): Promise<Buffer> {
    let pipeline = sharp(file.buffer);

    if (category === 'logo') {
      pipeline = pipeline.resize(200, 200, { fit: 'inside' });
    }

    return pipeline
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  async deleteFile(path: string): Promise<void> {
    await this.storage.delete(path);
  }

  async cleanupOrphanedFiles(referencedPaths: string[]): Promise<void> {
    // Logic to list all files in storage and delete those not in referencedPaths
  }
}
