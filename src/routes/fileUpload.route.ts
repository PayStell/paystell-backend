import express from "express";
import multer from "multer";
import { handleFileUpload } from "../controllers/fileUpload.controller";
import { asyncHandler } from "../middlewares/merchantAuth";
import { FileUploadService } from "../services/fileUpload.service";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const fileUploadService = new FileUploadService();

router.post(
  "/upload",
  upload.single("file"),
  handleFileUpload,
  asyncHandler(async (req, res) => {
    const metadata = await fileUploadService.saveFileMetadata({
      originalname: req.file!.originalname,
      mimetype: req.file!.mimetype,
      size: req.file!.size,
      path: req.file!.path,
    });
    res.status(200).json({ message: "File uploaded successfully", metadata });
  }),
);

export default router;
