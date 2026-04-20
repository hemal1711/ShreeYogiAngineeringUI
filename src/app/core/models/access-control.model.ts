export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Role {
  correlationId: string;
  roleName: string;
  isActive: boolean;
  isSystemRole: boolean;
  createdOn: string;
}

export interface RoleDetail extends Role {
  updatedOn?: string;
  permissions: Permission[];
}

export interface RoleRequest {
  roleName: string;
  isActive: boolean;
}

export interface Permission {
  correlationId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdOn: string;
}

export interface PermissionRequest {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface RolePermissionAssignRequest {
  roleCorrelationId: string;
  permissionCorrelationIds: string[];
}

export interface User {
  correlationId: string;
  userName: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  isActive: boolean;
  createdOn: string;
}

export interface UserDetail extends User {
  updatedOn?: string;
  roles: UserRole[];
}

export interface UserCreateRequest {
  userName: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  isActive: boolean;
}

export interface UserUpdateRequest {
  userName: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  isActive: boolean;
}

export interface UserRole {
  correlationId: string;
  userCorrelationId: string;
  userName: string;
  roleCorrelationId: string;
  roleName: string;
  roleIsActive: boolean;
  createdOn: string;
}

export interface UserRoleRequest {
  userCorrelationId: string;
  roleCorrelationId: string;
}
