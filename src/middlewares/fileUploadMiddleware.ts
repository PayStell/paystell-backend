import { Request, Response, NextFunction } from "express";
import { FileUploadService } from "../services/fileUpload.service";
import { asyncHandler } from "./merchantAuth";

const fileUploadService = new FileUploadService();

export const handleFileUpload = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileUrl = fileUploadService.awsUploadFile(req.file);
      req.body.fileUrl = fileUrl;
      next();
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  },
);
