import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { checkPermission } from '../middlewares/permission.middleware';
import { RequestHandler } from 'express';

const router = Router();
const roleController = new RoleController();

// Create a new role
router.post(
    '/',
    checkPermission({ action: 'create', resource: 'roles' }) as RequestHandler,
    roleController.createRole.bind(roleController) as RequestHandler
);

// Assign role to user
router.post(
    '/assign',
    checkPermission({ action: 'assign', resource: 'roles' }) as RequestHandler,
    roleController.assignRoleToUser.bind(roleController) as RequestHandler
);

// Get all roles for a merchant
router.get(
    '/merchant/:merchantId',
    checkPermission({ action: 'view', resource: 'roles' }) as RequestHandler,
    roleController.getMerchantRoles.bind(roleController) as RequestHandler
);

// Update role permissions
router.put(
    '/:roleId/permissions',
    checkPermission({ action: 'edit', resource: 'roles' }) as RequestHandler,
    roleController.updateRolePermissions.bind(roleController) as RequestHandler
);

// Delete role
router.delete(
    '/:roleId',
    checkPermission({ action: 'delete', resource: 'roles' }) as RequestHandler,
    roleController.deleteRole.bind(roleController) as RequestHandler
);

export default router; 