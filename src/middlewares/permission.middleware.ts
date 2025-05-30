import { Request, Response, NextFunction } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../entities/User';
import { Permission } from '../entities/Permission.entity';

export interface PermissionCheck {
    action: string;
    resource: string;
}

export const checkPermission = (requiredPermission: PermissionCheck) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const userRepository = getRepository(User);
            const user = await userRepository.findOne({
                where: { id: userId },
                relations: ['roles', 'roles.permissions'],
            });

            if (!user) {
                res.status(401).json({ message: 'User not found' });
                return;
            }

            // Check if user has the required permission through any of their roles
            const hasPermission = user.roles.some(role =>
                role.permissions.some(
                    permission =>
                        permission.action === requiredPermission.action &&
                        permission.resource === requiredPermission.resource
                )
            );

            if (!hasPermission) {
                res.status(403).json({
                    message: 'Forbidden: Insufficient permissions',
                    required: requiredPermission,
                });
                return;
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
}; 