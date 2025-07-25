import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export type StorageProviderType = "local" | "s3" | "gcs";

@Entity({ name: "file_metadata" })
export class FileMetadata {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  filename: string;

  @Column({ name: "original_name" })
  originalName: string;

  @Column({ name: "mime_type" })
  mimeType: string;

  @Column()
  size: number;

  @Column()
  url: string;

  @Index()
  @Column({ name: "user_id" })
  userId: string;

  @Column("text", { array: true, default: [] })
  tags: string[];

  @Index()
  @Column()
  category: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn({ name: "uploaded_at" })
  uploadedAt: Date;

  @Column({
    name: "storage_provider",
    type: "enum",
    enum: ["local", "s3", "gcs"],
  })
  storageProvider: StorageProviderType;

  @Column({ name: "is_watermarked", default: false })
  isWatermarked: boolean;
}
