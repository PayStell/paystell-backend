import { Request, Response, NextFunction } from 'express';
import { getRepository } from 'typeorm';
import { Role } from '../entities/Role.entity';
import { Permission } from '../entities/Permission.entity';
import { User } from '../entities/User';
import { MerchantEntity } from '../entities/Merchant.entity';
import { RoleAuditLog } from '../entities/RoleAuditLog.entity';

export class RoleController {
    // Create a new role
    async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { name, description, permissions, merchantId } = req.body;
            const roleRepository = getRepository(Role);
            const merchantRepository = getRepository(MerchantEntity);
            const permissionRepository = getRepository(Permission);

            const merchant = await merchantRepository.findOne({ where: { id: merchantId } });
            if (!merchant) {
                res.status(404).json({ message: 'Merchant not found' });
                return;
            }

            const role = roleRepository.create({
                name,
                description,
                merchant,
                permissions: permissions || [],
            });

            await roleRepository.save(role);

            // Add permissions
            if (permissions && permissions.length > 0) {
                const permissionEntities = await permissionRepository.findByIds(permissions);
                role.permissions = permissionEntities;
                await roleRepository.save(role);
            }

            // Create audit log
            const auditLogRepository = getRepository(RoleAuditLog);
            await auditLogRepository.save({
                action: 'create',
                role,
                performedBy: { id: req.user?.id },
                description: `Role "${name}" created`,
                changes: { name, description, permissions }
            });

            res.status(201).json(role);
        } catch (error) {
            console.error('Create role error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Assign role to user
    async assignRoleToUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, roleId } = req.body;
            const userRepository = getRepository(User);
            const roleRepository = getRepository(Role);

            const user = await userRepository.findOne({ where: { id: userId } });
            const role = await roleRepository.findOne({ where: { id: roleId } });

            if (!user || !role) {
                res.status(404).json({ message: 'User or role not found' });
                return;
            }

            if (!user.roles) {
                user.roles = [];
            }
            user.roles.push(role);
            await userRepository.save(user);

            // Create audit log
            const auditLogRepository = getRepository(RoleAuditLog);
            await auditLogRepository.save({
                action: 'assign',
                role,
                performedBy: { id: req.user?.id },
                description: `Role "${role.name}" assigned to user ${user.email}`,
                changes: { userId, roleId }
            });

            res.status(200).json({ message: 'Role assigned successfully' });
        } catch (error) {
            console.error('Assign role error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Get all roles for a merchant
    async getMerchantRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { merchantId } = req.params;
            const roleRepository = getRepository(Role);

            const roles = await roleRepository.find({
                where: { merchant: { id: merchantId } },
                relations: ['permissions'],
            });

            res.status(200).json(roles);
        } catch (error) {
            console.error('Get merchant roles error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Update role permissions
    async updateRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { roleId } = req.params;
            const { permissions } = req.body;
            const roleRepository = getRepository(Role);
            const permissionRepository = getRepository(Permission);

            const role = await roleRepository.findOne({
                where: { id: roleId },
                relations: ['permissions'],
            });

            if (!role) {
                res.status(404).json({ message: 'Role not found' });
                return;
            }

            const oldPermissions = role.permissions;
            const permissionEntities = await permissionRepository.findByIds(permissions);
            role.permissions = permissionEntities;
            await roleRepository.save(role);

            // Create audit log
            const auditLogRepository = getRepository(RoleAuditLog);
            await auditLogRepository.save({
                action: 'update',
                role,
                performedBy: { id: req.user?.id },
                description: `Permissions updated for role "${role.name}"`,
                changes: {
                    oldPermissions: oldPermissions.map(p => ({ id: p.id, action: p.action, resource: p.resource })),
                    newPermissions: permissionEntities.map(p => ({ id: p.id, action: p.action, resource: p.resource }))
                }
            });

            res.status(200).json(role);
        } catch (error) {
            console.error('Update role permissions error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Delete role
    async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { roleId } = req.params;
            const roleRepository = getRepository(Role);

            const role = await roleRepository.findOne({ where: { id: roleId } });
            if (!role) {
                res.status(404).json({ message: 'Role not found' });
                return;
            }

            // Create audit log before deletion
            const auditLogRepository = getRepository(RoleAuditLog);
            await auditLogRepository.save({
                action: 'delete',
                role,
                performedBy: { id: req.user?.id },
                description: `Role "${role.name}" deleted`,
                changes: {
                    role: {
                        id: role.id,
                        name: role.name,
                        description: role.description,
                        permissions: role.permissions.map(p => ({ id: p.id, action: p.action, resource: p.resource }))
                    }
                }
            });

            await roleRepository.remove(role);
            res.status(200).json({ message: 'Role deleted successfully' });
        } catch (error) {
            console.error('Delete role error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
} 