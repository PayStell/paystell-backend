import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Role } from '../entities/Role';
import { UserRole } from '../entities/UserRole';

export class TeamController {
  async createRole(req: Request, res: Response) {
    const { name, merchantId, permissionIds } = req.body;
    const roleRepo = AppDataSource.getRepository(Role);
    const rpRepo = AppDataSource.getRepository(RolePermission);

    const role = roleRepo.create({ name, merchant: { id: merchantId } });
    await roleRepo.save(role);

    const rolePermissions = permissionIds.map(pId => rpRepo.create({ 
      role: role, 
      permission: { id: pId } 
    }));
    
    await rpRepo.save(rolePermissions);
    
    // Audit log simulation
    console.log(`Audit: Role ${name} created for merchant ${merchantId} by user ${req.user.id}`);
    
    return res.status(201).json(role);
  }

  async assignRoleToUser(req: Request, res: Response) {
    const { userId, roleId } = req.body;
    const userRoleRepo = AppDataSource.getRepository(UserRole);

    const userRole = userRoleRepo.create({
      user: { id: userId },
      role: { id: roleId }
    });

    await userRoleRepo.save(userRole);
    return res.status(200).json({ message: 'Role assigned successfully' });
  }
}
