import { Router, RequestHandler } from "express";
import { body, param, query } from "express-validator";
import { ConfigurationController } from "../controllers/ConfigurationController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { requirePermission } from "../middlewares/permissionMiddleware";
import { PermissionResource, PermissionAction } from "../entities/Permission";
import { handleValidationErrors } from "../middlewares/validationErrorHandler";
import { ConfigurationCategory, ConfigurationType } from "../entities/Configuration";
import { FeatureFlagScope } from "../entities/FeatureFlag";

const router = Router();
const configurationController = new ConfigurationController();

// Validation schemas
const configurationValidation = [
  body("key").isString().isLength({ min: 1, max: 255 }).withMessage("Key is required and must be 1-255 characters"),
  body("value").notEmpty().withMessage("Value is required"),
  body("type").optional().isIn(Object.values(ConfigurationType)).withMessage("Invalid configuration type"),
  body("category").optional().isIn(Object.values(ConfigurationCategory)).withMessage("Invalid configuration category"),
  body("description").optional().isString().withMessage("Description must be a string"),
  body("isEncrypted").optional().isBoolean().withMessage("isEncrypted must be a boolean"),
  body("isRequired").optional().isBoolean().withMessage("isRequired must be a boolean"),
  body("validationRules").optional().isObject().withMessage("validationRules must be an object"),
  body("defaultValue").optional().isString().withMessage("defaultValue must be a string"),
  body("allowedValues").optional().isArray().withMessage("allowedValues must be an array"),
  body("expiresAt").optional().isISO8601().withMessage("expiresAt must be a valid ISO date"),
  body("metadata").optional().isObject().withMessage("metadata must be an object"),
];

const featureFlagValidation = [
  body("name").isString().isLength({ min: 1, max: 255 }).withMessage("Name is required and must be 1-255 characters"),
  body("description").isString().isLength({ min: 1 }).withMessage("Description is required"),
  body("isEnabled").isBoolean().withMessage("isEnabled must be a boolean"),
  body("scope").optional().isIn(Object.values(FeatureFlagScope)).withMessage("Invalid feature flag scope"),
  body("targetingRules").optional().isObject().withMessage("targetingRules must be an object"),
  body("scheduledStartDate").optional().isISO8601().withMessage("scheduledStartDate must be a valid ISO date"),
  body("scheduledEndDate").optional().isISO8601().withMessage("scheduledEndDate must be a valid ISO date"),
  body("metadata").optional().isObject().withMessage("metadata must be an object"),
  body("owner").optional().isString().withMessage("owner must be a string"),
  body("tags").optional().isString().withMessage("tags must be a string"),
];

const importValidation = [
  body("configurations").isArray().withMessage("configurations must be an array"),
  body("overwrite").optional().isBoolean().withMessage("overwrite must be a boolean"),
  body("confirmOverwrite").optional().isString()
    .custom((value, { req }) => {
      if (req.body.overwrite && process.env.NODE_ENV === 'production') {
        return value === `CONFIRM_OVERWRITE_${new Date().toISOString().split('T')[0]}`;
      }
      return true;
    }).withMessage("Production overwrites require confirmation with today's date"),
];

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Get all configurations
 *     description: Retrieve all configurations for the current environment
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configurations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Configuration'
 *                 count:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.READ),
  configurationController.getAllConfigurations.bind(configurationController) as RequestHandler,
);

/**
 * @swagger
 * /api/config/{key}:
 *   get:
 *     summary: Get configuration by key
 *     description: Retrieve a specific configuration by its key
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration key
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       oneOf:
 *                         - type: string
 *                         - type: number
 *                         - type: boolean
 *                         - type: object
 *       404:
 *         description: Configuration not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:key",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.READ),
  param("key").isString().withMessage("Key must be a string"),
  handleValidationErrors,
  configurationController.getConfiguration.bind(configurationController) as RequestHandler,
);

/**
 * @swagger
 * /api/config:
 *   post:
 *     summary: Create or update configuration
 *     description: Create a new configuration or update an existing one
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - value
 *             properties:
 *               key:
 *                 type: string
 *                 description: Configuration key
 *               value:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                   - type: boolean
 *                   - type: object
 *                 description: Configuration value
 *               type:
 *                 type: string
 *                 enum: [string, number, boolean, json, encrypted]
 *                 description: Configuration type
 *               category:
 *                 type: string
 *                 enum: [database, authentication, payment, stellar, email, redis, feature_flag, security, monitoring, general]
 *                 description: Configuration category
 *               description:
 *                 type: string
 *                 description: Configuration description
 *               isEncrypted:
 *                 type: boolean
 *                 description: Whether the value should be encrypted
 *               isRequired:
 *                 type: boolean
 *                 description: Whether this configuration is required
 *               validationRules:
 *                 type: object
 *                 description: Validation rules for the configuration
 *               defaultValue:
 *                 type: string
 *                 description: Default value for the configuration
 *               allowedValues:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Allowed values for the configuration
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Expiration date for the configuration
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       201:
 *         description: Configuration created/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Configuration'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.CREATE),
  configurationValidation,
  handleValidationErrors,
  configurationController.setConfiguration.bind(configurationController) as RequestHandler,
);

/**
 * @swagger
 * /api/config/{key}:
 *   delete:
 *     summary: Delete configuration
 *     description: Delete a configuration by its key
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration key
 *     responses:
 *       200:
 *         description: Configuration deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Configuration not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:key",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.DELETE),
  param("key").isString().withMessage("Key must be a string"),
  handleValidationErrors,
  configurationController.deleteConfiguration.bind(configurationController) as RequestHandler,
);

/**
 * @swagger
 * /api/config/category/{category}:
 *   get:
 *     summary: Get configurations by category
 *     description: Retrieve all configurations for a specific category
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [database, authentication, payment, stellar, email, redis, feature_flag, security, monitoring, general]
 *         description: Configuration category
 *     responses:
 *       200:
 *         description: Configurations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Configuration'
 *                 count:
 *                   type: number
 *       400:
 *         description: Invalid category
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/category/:category",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.READ),
  param("category").isIn(Object.values(ConfigurationCategory)).withMessage("Invalid category"),
  handleValidationErrors,
  configurationController.getConfigurationsByCategory.bind(configurationController) as RequestHandler,
);

/**
 * @swagger
 * /api/config/reload:
 *   post:
 *     summary: Reload configurations
 *     description: Reload all configurations from the database
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configurations reloaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/reload",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.UPDATE),
  configurationController.reloadConfigurations.bind(configurationController) as RequestHandler,
);

/**
 * @swagger
 * /api/config/validate:
 *   get:
 *     summary: Validate configurations
 *     description: Validate all required configurations
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Validation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/validate",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.READ),
  configurationController.validateConfigurations.bind(configurationController) as RequestHandler,
);

// Feature Flag Routes

/**
 * @swagger
 * /api/config/feature-flags:
 *   get:
 *     summary: Get all feature flags
 *     description: Retrieve all feature flags for the current environment
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feature flags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FeatureFlag'
 *                 count:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/feature-flags",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.READ),
  configurationController.getAllFeatureFlags.bind(configurationController) as RequestHandler,
);

/**
 * @swagger
 * /api/config/feature-flags:
 *   post:
 *     summary: Create or update feature flag
 *     description: Create a new feature flag or update an existing one
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - isEnabled
 *             properties:
 *               name:
 *                 type: string
 *                 description: Feature flag name
 *               description:
 *                 type: string
 *                 description: Feature flag description
 *               isEnabled:
 *                 type: boolean
 *                 description: Whether the feature flag is enabled
 *               scope:
 *                 type: string
 *                 enum: [global, user, merchant, environment]
 *                 description: Feature flag scope
 *               targetingRules:
 *                 type: object
 *                 description: Targeting rules for the feature flag
 *               scheduledStartDate:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled start date
 *               scheduledEndDate:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled end date
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *               owner:
 *                 type: string
 *                 description: Feature flag owner
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *     responses:
 *       201:
 *         description: Feature flag created/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/FeatureFlag'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/feature-flags",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.CREATE),
  featureFlagValidation,
  handleValidationErrors,
  configurationController.setFeatureFlag.bind(configurationController) as RequestHandler,
);

/**
 * @swagger
 * /api/config/feature-flags/{flagName}/evaluate:
 *   get:
 *     summary: Evaluate feature flag
 *     description: Evaluate a feature flag for a specific context
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: flagName
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature flag name
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID for evaluation
 *       - in: query
 *         name: merchantId
 *         schema:
 *           type: string
 *         description: Merchant ID for evaluation
 *       - in: query
 *         name: userRole
 *         schema:
 *           type: string
 *         description: User role for evaluation
 *     responses:
 *       200:
 *         description: Feature flag evaluated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isEnabled:
 *                       type: boolean
 *                     reason:
 *                       type: string
 *                     targetingMatch:
 *                       type: boolean
 *                     percentageRollout:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/feature-flags/:flagName/evaluate",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.READ),
  param("flagName").isString().withMessage("Flag name must be a string"),
  handleValidationErrors,
  configurationController.evaluateFeatureFlag.bind(configurationController) as RequestHandler,
);

// Utility Routes

/**
 * @swagger
 * /api/config/stats:
 *   get:
 *     summary: Get configuration statistics
 *     description: Get statistics about configurations and feature flags
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalConfigurations:
 *                       type: number
 *                     encryptedConfigurations:
 *                       type: number
 *                     requiredConfigurations:
 *                       type: number
 *                     configurationsByCategory:
 *                       type: object
 *                     totalFeatureFlags:
 *                       type: number
 *                     activeFeatureFlags:
 *                       type: number
 *                     featureFlagsByScope:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/stats",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.READ),
  configurationController.getConfigurationStats.bind(configurationController) as RequestHandler,
);

/**
 * @swagger
 * /api/config/export:
 *   get:
 *     summary: Export configurations
 *     description: Export all configurations for the current environment
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: environment
 *         schema:
 *           type: string
 *         description: Environment to export (optional)
 *     responses:
 *       200:
 *         description: Configurations exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 environment:
 *                   type: string
 *                 exportedAt:
 *                   type: string
 *                   format: date-time
 *                 configurations:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/export",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.READ),
  query("environment").optional().isString().withMessage("Environment must be a string"),
  handleValidationErrors,
  configurationController.exportConfigurations.bind(configurationController) as RequestHandler,
);

/**
 * @swagger
 * /api/config/import:
 *   post:
 *     summary: Import configurations
 *     description: Import configurations from a JSON file
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - configurations
 *             properties:
 *               configurations:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of configuration objects
 *               overwrite:
 *                 type: boolean
 *                 description: Whether to overwrite existing configurations
 *     responses:
 *       200:
 *         description: Configurations imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     imported:
 *                       type: number
 *                     skipped:
 *                       type: number
 *                     errors:
 *                       type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/import",
  authMiddleware as RequestHandler,
  requirePermission(PermissionResource.CONFIGURATION, PermissionAction.CREATE),
  importValidation,
  handleValidationErrors,
  configurationController.importConfigurations.bind(configurationController) as RequestHandler,
);

export default router; 