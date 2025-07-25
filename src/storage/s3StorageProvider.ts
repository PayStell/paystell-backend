import AWS from "aws-sdk";
import { StorageProvider } from "./storageProvider";
import type { Express } from "express";
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY!,
  secretAccessKey: process.env.AWS_SECRET_KEY!,
  region: process.env.AWS_REGION!,
});

export class S3StorageProvider implements StorageProvider {
  private bucketName = process.env.AWS_S3_BUCKET!;

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const params = {
      Bucket: this.bucketName,
      Key: file.originalname,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.upload(params).promise();
    return file.originalname;
  }

  async deleteFile(fileKey: string) {
    const params = {
      Bucket: this.bucketName,
      Key: fileKey,
    };
    await s3.deleteObject(params).promise();
  }

  getFileUrl(fileKey: string) {
    return `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`;
  }
}
