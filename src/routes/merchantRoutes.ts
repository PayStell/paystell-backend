import { Router } from "express";
import {
  authenticateMerchant,
  asyncHandler,
} from "../middlewares/merchantAuth";
import { MerchantController } from "../controllers/merchant.controller";
import { FileUploadService } from "../../src/services/fileUpload.service";
import { handleFileUpload } from "../../src/middlewares/fileUploadMiddleware";

const router = Router();
const merchantController = new MerchantController();
const fileUploadService = new FileUploadService();

router.get(
  "/profile",
  authenticateMerchant,
  asyncHandler(merchantController.getProfile.bind(merchantController)),
);

router.post(
  "/profile",
  asyncHandler(merchantController.registerMerchant.bind(merchantController)),
);

router.put(
  "/profile",
  authenticateMerchant,
  asyncHandler(merchantController.updateProfile.bind(merchantController)),
);

router.post(
  "/logo",
  authenticateMerchant,
  fileUploadService.upload.single("logo"),
  handleFileUpload,
  asyncHandler(merchantController.uploadLogo.bind(merchantController)),
);

router.delete(
  "/logo",
  authenticateMerchant,
  asyncHandler(merchantController.deleteLogo.bind(merchantController)),
);

export default router;
