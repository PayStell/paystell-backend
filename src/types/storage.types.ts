export enum StorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  GCS = 'gcs'
}

export interface FileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  provider: StorageProvider;
  path: string;
  category: 'logo' | 'document' | 'report' | 'other';
  tags: string[];
  createdAt: Date;
}

export interface IStorageStrategy {
  upload(file: Express.Multer.File, path: string): Promise<string>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getUrl(path: string): string;
}
