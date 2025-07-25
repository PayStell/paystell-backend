import AWS from "aws-sdk";
import { StorageProvider } from "./storageProvider";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import type { Express } from "express";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY!,
  secretAccessKey: process.env.AWS_SECRET_KEY!,
  region: process.env.AWS_REGION!,
});

export class S3StorageProvider implements StorageProvider {
  private bucketName = process.env.AWS_S3_BUCKET!;

  async uploadFile(
    file: Express.Multer.File,
    options?: { [key: string]: unknown },
  ): Promise<string> {
    const extension = path.extname(file.originalname);
    const key = `${uuidv4()}${extension}`;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ...options,
    };

    await s3.putObject(params).promise();
    return key;
  }

  async deleteFile(fileKey: string): Promise<void> {
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: this.bucketName,
      Key: fileKey,
    };

    await s3.deleteObject(params).promise();
  }

  getFileUrl(fileKey: string): string {
    const region = process.env.AWS_REGION || "us-east-1";
    return `https://${this.bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
  }
}
