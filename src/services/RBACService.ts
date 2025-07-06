import AppDataSource from "../config/db";
import { Repository } from "typeorm";
import { Role } from "../entities/Role";
import {
  Permission,
  PermissionAction,
  PermissionResource,
} from "../entities/Permission";
import { UserRole } from "../entities/UserRole";
import { RolePermission } from "../entities/RolePermission";
import { User } from "../entities/User";
import { MerchantEntity } from "../entities/Merchant.entity";
import { getAuditService, AuditContext } from "./AuditService";

export class RBACService {
  private roleRepository: Repository<Role>;
  private permissionRepository: Repository<Permission>;
  private userRoleRepository: Repository<UserRole>;
  private rolePermissionRepository: Repository<RolePermission>;
  private userRepository: Repository<User>;
  private merchantRepository: Repository<MerchantEntity>;

  constructor() {
    this.roleRepository = AppDataSource.getRepository(Role);
    this.permissionRepository = AppDataSource.getRepository(Permission);
    this.userRoleRepository = AppDataSource.getRepository(UserRole);
    this.rolePermissionRepository = AppDataSource.getRepository(RolePermission);
    this.userRepository = AppDataSource.getRepository(User);
    this.merchantRepository = AppDataSource.getRepository(MerchantEntity);
  }

  // Role Management
  async createRole(
    merchantId: string,
    name: string,
    description?: string,
    isDefault = false,
    auditContext?: AuditContext,
  ): Promise<Role> {
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId },
    });
    if (!merchant) {
      throw new Error("Merchant not found");
    }

    // Check if merchant already has 3 custom roles (excluding default roles)
    const existingRoles = await this.roleRepository.count({
      where: { merchantId, isDefault: false },
    });

    if (existingRoles >= 3 && !isDefault) {
      throw new Error("Maximum of 3 custom roles allowed per merchant");
    }

    const role = this.roleRepository.create({
      name,
      description,
      merchantId,
      isDefault,
    });

    const savedRole = await this.roleRepository.save(role);

    // Audit log
    await getAuditService().createAuditLog({
      action: "CREATE_ROLE",
      entityType: "Role",
      entityId: savedRole.id,
      newValues: { roleName: name, merchantId },
      context: {
        userId: auditContext?.userId,
        ipAddress: auditContext?.ipAddress || "",
        userAgent: auditContext?.userAgent || "",
      },
    });

    return savedRole;
  }

  async getRolesByMerchant(merchantId: string): Promise<Role[]> {
    return this.roleRepository.find({
      where: { merchantId, isActive: true },
      relations: ["rolePermissions", "rolePermissions.permission"],
    });
  }

  async updateRole(
    roleId: string,
    updates: Partial<Role>,
    auditContext?: AuditContext,
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new Error("Role not found");
    }

    Object.assign(role, updates);
    const updatedRole = await this.roleRepository.save(role);

    // Audit log
    await getAuditService().createAuditLog({
      action: "UPDATE_ROLE",
      entityType: "Role",
      entityId: roleId,
      newValues: updates,
      context: {
        userId: auditContext?.userId,
        ipAddress: auditContext?.ipAddress || "",
        userAgent: auditContext?.userAgent || "",
      },
    });

    return updatedRole;
  }

  async deleteRole(roleId: string, auditContext?: AuditContext): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, isActive: true },
    });
    if (!role) {
      throw new Error("Role not found");
    }

    if (role.isDefault) {
      throw new Error("Cannot delete default roles");
    }

    // Check if role is assigned to any users
    const userRoleCount = await this.userRoleRepository.count({
      where: { roleId },
    });
    if (userRoleCount > 0) {
      throw new Error("Cannot delete role that is assigned to users");
    }

    // Soft delete
    role.isActive = false;
    await this.roleRepository.save(role);

    // Audit log
    await getAuditService().createAuditLog({
      action: "DELETE_ROLE",
      entityType: "Role",
      entityId: roleId,
      oldValues: { roleName: role.name, isActive: true },
      newValues: { isActive: false },
      context: {
        userId: auditContext?.userId,
        ipAddress: auditContext?.ipAddress || "",
        userAgent: auditContext?.userAgent || "",
      },
    });
  }

  async getRoleById(roleId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, isActive: true },
      relations: ["rolePermissions", "rolePermissions.permission"],
    });
    if (!role) {
      throw new Error("Role not found");
    }
    return role;
  }

  // Permission Management
  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
    auditContext?: AuditContext,
  ): Promise<RolePermission> {
    const existing = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (existing) {
      throw new Error("Permission already assigned to role");
    }

    const rolePermission = this.rolePermissionRepository.create({
      roleId,
      permissionId,
    });

    const saved = await this.rolePermissionRepository.save(rolePermission);

    // Audit log
    await getAuditService().createAuditLog({
      action: "ASSIGN_PERMISSION",
      entityType: "RolePermission",
      entityId: saved.id,
      newValues: { roleId, permissionId },
      context: {
        userId: auditContext?.userId,
        ipAddress: auditContext?.ipAddress || "",
        userAgent: auditContext?.userAgent || "",
      },
    });

    return saved;
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
    auditContext?: AuditContext,
  ): Promise<void> {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (!rolePermission) {
      throw new Error("Permission not assigned to role");
    }

    await this.rolePermissionRepository.remove(rolePermission);

    // Audit log
    await getAuditService().createAuditLog({
      action: "REMOVE_PERMISSION",
      entityType: "RolePermission",
      entityId: rolePermission.id,
      newValues: { roleId, permissionId },
      context: {
        userId: auditContext?.userId,
        ipAddress: auditContext?.ipAddress || "",
        userAgent: auditContext?.userAgent || "",
      },
    });
  }

  // User Role Management
  async assignRoleToUser(
    userId: number,
    roleId: string,
    merchantId: string,
    auditContext?: AuditContext,
  ): Promise<UserRole> {
    const existing = await this.userRoleRepository.findOne({
      where: { userId, roleId, merchantId },
    });

    if (existing) {
      throw new Error("Role already assigned to user for this merchant");
    }

    const userRole = this.userRoleRepository.create({
      userId,
      roleId,
      merchantId,
    });

    const saved = await this.userRoleRepository.save(userRole);

    // Audit log
    await getAuditService().createAuditLog({
      action: "ASSIGN_USER_ROLE",
      entityType: "UserRole",
      entityId: saved.id,
      newValues: { userId, roleId, merchantId },
      context: {
        userId: auditContext?.userId,
        ipAddress: auditContext?.ipAddress || "",
        userAgent: auditContext?.userAgent || "",
      },
    });

    return saved;
  }

  async removeUserRole(
    userId: number,
    roleId: string,
    merchantId: string,
    auditContext?: AuditContext,
  ): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({
      where: { userId, roleId, merchantId },
    });

    if (!userRole) {
      throw new Error("Role not assigned to user");
    }

    await this.userRoleRepository.remove(userRole);

    // Audit log
    await getAuditService().createAuditLog({
      action: "REMOVE_USER_ROLE",
      entityType: "UserRole",
      entityId: userRole.id,
      oldValues: { userId, roleId, merchantId },
      context: {
        userId: auditContext?.userId,
        ipAddress: auditContext?.ipAddress || "",
        userAgent: auditContext?.userAgent || "",
      },
    });
  }

  // Alias for backward compatibility
  async removeRoleFromUser(
    userId: number,
    roleId: string,
    merchantId: string,
    auditContext?: AuditContext,
  ): Promise<void> {
    return this.removeUserRole(userId, roleId, merchantId, auditContext);
  }

  // Permission Checking
  async hasPermission(
    userId: number,
    merchantId: string,
    resource: PermissionResource,
    action: PermissionAction,
  ): Promise<boolean> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId, merchantId, isActive: true },
      relations: [
        "role",
        "role.rolePermissions",
        "role.rolePermissions.permission",
      ],
    });

    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        const permission = rolePermission.permission;
        if (
          permission.resource === resource &&
          (permission.action === action ||
            permission.action === PermissionAction.MANAGE)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  async getUserPermissions(
    userId: number,
    merchantId: string,
  ): Promise<string[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId, merchantId, isActive: true },
      relations: [
        "role",
        "role.rolePermissions",
        "role.rolePermissions.permission",
      ],
    });

    const permissions = new Set<string>();

    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        const permission = rolePermission.permission;
        permissions.add(
          Permission.getPermissionKey(permission.resource, permission.action),
        );
      }
    }

    return Array.from(permissions);
  }

  // Initialize default permissions
  async initializeDefaultPermissions(): Promise<void> {
    const permissions = [];

    for (const resource of Object.values(PermissionResource)) {
      for (const action of Object.values(PermissionAction)) {
        permissions.push({
          resource,
          action,
          description: `${action} access to ${resource}`,
        });
      }
    }

    for (const permissionData of permissions) {
      const existing = await this.permissionRepository.findOne({
        where: {
          resource: permissionData.resource,
          action: permissionData.action,
        },
      });

      if (!existing) {
        const permission = this.permissionRepository.create(permissionData);
        await this.permissionRepository.save(permission);
      }
    }
  }

  // Initialize default roles for a merchant
  async initializeDefaultRoles(merchantId: string): Promise<void> {
    const defaultRoles = [
      {
        name: "Owner",
        description: "Full access to all merchant resources",
        permissions: Object.values(PermissionResource).map((resource) =>
          Permission.getPermissionKey(resource, PermissionAction.MANAGE),
        ),
      },
      {
        name: "Admin",
        description: "Administrative access with limited settings control",
        permissions: [
          Permission.getPermissionKey(
            PermissionResource.PAYMENTS,
            PermissionAction.MANAGE,
          ),
          Permission.getPermissionKey(
            PermissionResource.USERS,
            PermissionAction.READ,
          ),
          Permission.getPermissionKey(
            PermissionResource.REPORTS,
            PermissionAction.READ,
          ),
          Permission.getPermissionKey(
            PermissionResource.WEBHOOKS,
            PermissionAction.READ,
          ),
          Permission.getPermissionKey(
            PermissionResource.AUDIT_LOGS,
            PermissionAction.READ,
          ),
        ],
      },
      {
        name: "Viewer",
        description: "Read-only access to basic resources",
        permissions: [
          Permission.getPermissionKey(
            PermissionResource.PAYMENTS,
            PermissionAction.READ,
          ),
          Permission.getPermissionKey(
            PermissionResource.REPORTS,
            PermissionAction.READ,
          ),
        ],
      },
    ];

    for (const roleData of defaultRoles) {
      const existing = await this.roleRepository.findOne({
        where: { name: roleData.name, merchantId, isDefault: true },
      });

      if (!existing) {
        const role = await this.createRole(
          merchantId,
          roleData.name,
          roleData.description,
          true,
        );

        // Assign permissions to role
        for (const permissionKey of roleData.permissions) {
          const [resource, action] = permissionKey.split(":") as [
            PermissionResource,
            PermissionAction,
          ];
          const permission = await this.permissionRepository.findOne({
            where: { resource, action },
          });

          if (permission) {
            await this.assignPermissionToRole(role.id, permission.id);
          }
        }
      }
    }
  }
}

// Singleton instance
// Add this at the end of the file
let rbacServiceInstance: RBACService | null = null;

export const getRBACService = (): RBACService => {
  if (!rbacServiceInstance) {
    rbacServiceInstance = new RBACService();
  }
  return rbacServiceInstance;
};
