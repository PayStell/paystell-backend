import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import clamav from "clamav.js";
import { Express } from "express";
import {
  PutObjectCommand,
  S3Client,
  PutObjectCommandInput,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export class FileUploadService {
  private uploadDir: string;
  private s3Client: S3Client;
  private bucket: string;
  private storageType: "local" | "s3";
  saveFileMetadata: (
    metadata: Record<string, string | number | boolean>,
  ) => Promise<void>;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "merchant-logos");
    this.bucket = process.env.AWS_S3_BUCKET || "";
    this.storageType = (process.env.STORAGE as "s3" | "local") || "local";

    if (this.storageType === "local" && !fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }

  private storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, this.uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });

  public upload = multer({
    storage: this.storage,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif)$/)) {
        return cb(new Error("Only image files are allowed!"));
      }
      cb(null, true);
    },
  });

  public async processAndUploadFile(
    file: Express.Multer.File,
  ): Promise<string> {
    const isClean = await this.scanFile(file.path);
    if (!isClean) throw new Error("Virus detected! Upload aborted.");

    let processedFile = file;

    if (file.mimetype.startsWith("image/")) {
      processedFile = await this.processImage(file);
    }

    return this.storageType === "s3"
      ? this.awsUploadFile(processedFile)
      : this.localUploadFile(processedFile);
  }

  private scanFile(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      clamav
        .createScanner(3310, "127.0.0.1")
        .scan(filePath, (err, malicious) => {
          if (err) reject(err);
          else resolve(!malicious);
        });
    });
  }

  private async processImage(
    file: Express.Multer.File,
  ): Promise<Express.Multer.File> {
    const buffer = await sharp(file.path)
      .resize(800, 800, { fit: "inside" })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      ...file,
      buffer,
      size: buffer.length,
    };
  }

  private async awsUploadFile(file: Express.Multer.File): Promise<string> {
    const extension = path.extname(file.originalname);
    const key = `merchant-logos/${uuidv4()}${extension}`;

    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    };

    await this.s3Client.send(new PutObjectCommand(params));

    return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  private async localUploadFile(file: Express.Multer.File): Promise<string> {
    const targetPath = path.join(this.uploadDir, file.filename);

    if (file.buffer) {
      await fs.promises.writeFile(targetPath, file.buffer);
    }

    return `/merchant-logos/${file.filename}`;
  }

  public async deleteFile(fileUrl: string): Promise<void> {
    if (this.storageType === "s3") {
      const key = fileUrl.split(".amazonaws.com/")[1];
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } else {
      const filePath = path.join(this.uploadDir, path.basename(fileUrl));
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
  }

  public getFileUrl(fileName: string): string {
    return this.storageType === "s3"
      ? `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/merchant-logos/${fileName}`
      : `/merchant-logos/${fileName}`;
  }
}
