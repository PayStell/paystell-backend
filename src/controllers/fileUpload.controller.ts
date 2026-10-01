import { Request, Response } from 'express';
import { FileUploadService } from '../services/fileUpload.service';

const fileService = new FileUploadService();

export class FileUploadController {
  async upload(req: Request, res: Response) {
    try {
      const file = req.file;
      const { category, tags } = req.body;

      if (!file) return res.status(400).json({ error: 'No file uploaded' });

      const metadata = await fileService.processAndUpload(file, category || 'other', tags ? JSON.parse(tags) : []);
      
      return res.status(201).json(metadata);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { path } = req.params;
      await fileService.deleteFile(path);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
