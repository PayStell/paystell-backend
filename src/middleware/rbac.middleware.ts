import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../data-source';
import { UserRole } from '../entities/UserRole';
import { RolePermission } from '../entities/RolePermission';
import { In } from 'typeorm';

export const checkPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRoles = await AppDataSource.getRepository(UserRole).find({
      where: { user: { id: userId } },
      relations: ['role'],
    });

    const roleIds = userRoles.map((ur) => ur.role.id);

    const permissions = await AppDataSource.getRepository(RolePermission).find({
      where: {
        role: { id: In(roleIds) },
        permission: { name: requiredPermission },
      },
    });

    if (permissions.length === 0) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
