import { Request, Response, NextFunction } from "express";
import { FileUploadService } from "../services/fileUpload.service";
import { asyncHandler } from "../middlewares/merchantAuth";

const fileUploadService = new FileUploadService();

export const handleFileUpload = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileUrl = fileUploadService.getFileUrl(req.file.filename);

      const metadata = await fileUploadService.saveFileMetadata({
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      req.body.fileUrl = fileUrl;
      req.body.fileMetadata = metadata;

      next();
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  },
);
