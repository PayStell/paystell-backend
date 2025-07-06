import { Router } from "express";
import {
  authenticateMerchant,
  asyncHandler,
} from "../middlewares/merchantAuth";
import { MerchantController } from "../controllers/merchant.controller";
import { FileUploadService } from "../services/fileUpload.service";
import { handleFileUpload } from "../middlewares/fileUploadMiddleware";

const router = Router();
const merchantController = new MerchantController();
const fileUploadService = new FileUploadService();

/**
 * @swagger
 * /merchants/profile:
 *   get:
 *     summary: Get merchant profile
 *     description: Retrieves the profile information of the authenticated merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Merchant profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Merchant'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Merchant profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/profile",
  authenticateMerchant,
  asyncHandler(merchantController.getProfile.bind(merchantController)),
);

/**
 * @swagger
 * /merchants/profile:
 *   post:
 *     summary: Register a new merchant
 *     description: Creates a new merchant account and profile
 *     tags: [Merchants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMerchantDTO'
 *     responses:
 *       201:
 *         description: Merchant registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Merchant'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Conflict - merchant with this email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/profile",
  asyncHandler(merchantController.registerMerchant.bind(merchantController)),
);

/**
 * @swagger
 * /merchants/profile:
 *   put:
 *     summary: Update merchant profile
 *     description: Updates the profile information of the authenticated merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Merchant name
 *               description:
 *                 type: string
 *                 description: Merchant description
 *               website:
 *                 type: string
 *                 description: Merchant website URL
 *               logoUrl:
 *                 type: string
 *                 description: URL to merchant logo
 *     responses:
 *       200:
 *         description: Merchant profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Merchant'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Merchant profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/profile",
  authenticateMerchant,
  asyncHandler(merchantController.updateProfile.bind(merchantController)),
);

/**
 * @swagger
 * /merchants/logo:
 *   post:
 *     summary: Upload merchant logo
 *     description: Uploads a logo image for the authenticated merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo image file (JPG, PNG, GIF)
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logo uploaded successfully"
 *                 logoUrl:
 *                   type: string
 *                   description: URL to the uploaded logo
 *       400:
 *         description: Bad request - invalid file format or size
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       413:
 *         description: Payload too large - file size exceeds limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/logo",
  authenticateMerchant,
  fileUploadService.upload.single("logo"),
  handleFileUpload,
  asyncHandler(merchantController.uploadLogo.bind(merchantController)),
);

/**
 * @swagger
 * /merchants/logo:
 *   delete:
 *     summary: Delete merchant logo
 *     description: Removes the logo from the authenticated merchant's profile
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logo deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logo deleted successfully"
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Logo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  "/logo",
  authenticateMerchant,
  asyncHandler(merchantController.deleteLogo.bind(merchantController)),
);

export default router;
