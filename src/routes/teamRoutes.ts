import { Router } from "express";
import { TeamController } from "../controllers/TeamController";
import { requirePermission } from "../middlewares/permissionMiddleware";
import { PermissionResource, PermissionAction } from "../entities/Permission";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();
const teamController = new TeamController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Role Management Routes
router.post(
  "/roles",
  requirePermission(PermissionResource.USERS, PermissionAction.MANAGE),
  teamController.createRole,
);

router.get(
  "/roles",
  requirePermission(PermissionResource.USERS, PermissionAction.READ),
  teamController.getRoles,
);

router.put(
  "/roles/:roleId",
  requirePermission(PermissionResource.USERS, PermissionAction.MANAGE),
  teamController.updateRole,
);

router.delete(
  "/roles/:roleId",
  requirePermission(PermissionResource.USERS, PermissionAction.MANAGE),
  teamController.deleteRole,
);

// Permission Management Routes
router.post(
  "/roles/permissions",
  requirePermission(PermissionResource.USERS, PermissionAction.MANAGE),
  teamController.assignPermission,
);

router.delete(
  "/roles/permissions",
  requirePermission(PermissionResource.USERS, PermissionAction.MANAGE),
  teamController.removePermission,
);

// User Role Management Routes
router.post(
  "/users/roles",
  requirePermission(PermissionResource.USERS, PermissionAction.MANAGE),
  teamController.assignUserRole,
);

router.delete(
  "/users/roles",
  requirePermission(PermissionResource.USERS, PermissionAction.MANAGE),
  teamController.removeUserRole,
);

router.get(
  "/users/:userId/permissions",
  requirePermission(PermissionResource.USERS, PermissionAction.READ),
  teamController.getUserPermissions,
);

export default router;
