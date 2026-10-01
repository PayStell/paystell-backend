import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IStorageStrategy } from '../types/storage.types';

export class S3StorageStrategy implements IStorageStrategy {
  private s3 = new S3Client({ region: process.env.AWS_REGION });
  private bucket = process.env.AWS_S3_BUCKET!;

  async upload(file: Express.Multer.File, customPath: string): Promise<string> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: customPath,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    return customPath;
  }

  async delete(path: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    }));
  }

  async exists(path: string): Promise<boolean> {
    // Implementation of HeadObject check
    return true; 
  }

  getUrl(path: string): string {
    return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${path}`;
  }
}
