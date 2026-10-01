import { Router } from 'express';
import { FileUploadController } from '../controllers/fileUpload.controller';
import { uploadMiddleware } from '../middlewares/fileUploadMiddleware';

const router = Router();
const controller = new FileUploadController();

router.post('/upload', uploadMiddleware.single('file'), controller.upload);
router.delete('/:path', controller.delete);

export default router;
