import { getRepository } from 'typeorm';
import { Role } from '../entities/Role.entity';
import { Permission } from '../entities/Permission.entity';
import { User } from '../entities/User';
import { MerchantEntity } from '../entities/Merchant.entity';

export class RoleService {
    private roleRepository = getRepository(Role);
    private permissionRepository = getRepository(Permission);
    private userRepository = getRepository(User);
    private merchantRepository = getRepository(MerchantEntity);

    async createRole(name: string, description: string, merchantId: string, permissions: string[] = []): Promise<Role> {
        const merchant = await this.merchantRepository.findOne({ where: { id: merchantId } });
        if (!merchant) {
            throw new Error('Merchant not found');
        }

        const permissionEntities = await this.permissionRepository.findByIds(permissions);
        const role = this.roleRepository.create({
            name,
            description,
            merchant,
            permissions: permissionEntities,
        });

        return this.roleRepository.save(role);
    }

    async assignRoleToUser(userId: number, roleId: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const role = await this.roleRepository.findOne({ where: { id: roleId } });

        if (!user || !role) {
            throw new Error('User or role not found');
        }

        if (!user.roles) {
            user.roles = [];
        }
        user.roles.push(role);
        await this.userRepository.save(user);
    }

    async getMerchantRoles(merchantId: string): Promise<Role[]> {
        return this.roleRepository.find({
            where: { merchant: { id: merchantId } },
            relations: ['permissions'],
        });
    }

    async updateRolePermissions(roleId: string, permissions: string[]): Promise<Role> {
        const role = await this.roleRepository.findOne({
            where: { id: roleId },
            relations: ['permissions'],
        });

        if (!role) {
            throw new Error('Role not found');
        }

        const permissionEntities = await this.permissionRepository.findByIds(permissions);
        role.permissions = permissionEntities;
        return this.roleRepository.save(role);
    }

    async deleteRole(roleId: string): Promise<void> {
        const role = await this.roleRepository.findOne({ where: { id: roleId } });
        if (!role) {
            throw new Error('Role not found');
        }

        await this.roleRepository.remove(role);
    }

    async getUserPermissions(userId: number): Promise<Permission[]> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['roles', 'roles.permissions'],
        });

        if (!user) {
            throw new Error('User not found');
        }

        const permissions = new Set<Permission>();
        user.roles.forEach(role => {
            role.permissions.forEach(permission => {
                permissions.add(permission);
            });
        });

        return Array.from(permissions);
    }

    async hasPermission(userId: number, action: string, resource: string): Promise<boolean> {
        const permissions = await this.getUserPermissions(userId);
        return permissions.some(
            permission => permission.action === action && permission.resource === resource
        );
    }
} 