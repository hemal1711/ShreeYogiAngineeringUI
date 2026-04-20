import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import {
  PagedResponse,
  Permission,
  PermissionRequest,
  Role,
  RoleDetail,
  RolePermissionAssignRequest,
  RoleRequest,
  User,
  UserCreateRequest,
  UserDetail,
  UserRole,
  UserRoleRequest,
  UserUpdateRequest
} from '../models/access-control.model';

@Injectable({
  providedIn: 'root'
})
export class AccessControlService {
  private readonly http = inject(HttpClient);

  getRoles(page = 1, pageSize = 10, search?: string): Observable<ApiResponse<PagedResponse<Role>>> {
    return this.http.get<ApiResponse<PagedResponse<Role>>>(API_ENDPOINTS.roles.list, {
      params: this.pageParams(page, pageSize, search)
    });
  }

  getRole(correlationId: string): Observable<ApiResponse<Role>> {
    return this.http.get<ApiResponse<Role>>(API_ENDPOINTS.roles.byId(correlationId));
  }

  getRoleDetail(correlationId: string): Observable<ApiResponse<RoleDetail>> {
    return this.http.get<ApiResponse<RoleDetail>>(API_ENDPOINTS.roles.detail(correlationId));
  }

  createRole(request: RoleRequest): Observable<ApiResponse<Role>> {
    return this.http.post<ApiResponse<Role>>(API_ENDPOINTS.roles.list, request);
  }

  updateRole(correlationId: string, request: RoleRequest): Observable<ApiResponse<Role>> {
    return this.http.put<ApiResponse<Role>>(API_ENDPOINTS.roles.byId(correlationId), request);
  }

  deleteRole(correlationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.roles.byId(correlationId));
  }

  getPermissions(page = 1, pageSize = 10, search?: string): Observable<ApiResponse<PagedResponse<Permission>>> {
    return this.http.get<ApiResponse<PagedResponse<Permission>>>(API_ENDPOINTS.permissions.list, {
      params: this.pageParams(page, pageSize, search)
    });
  }

  getPermission(correlationId: string): Observable<ApiResponse<Permission>> {
    return this.http.get<ApiResponse<Permission>>(API_ENDPOINTS.permissions.byId(correlationId));
  }

  createPermission(request: PermissionRequest): Observable<ApiResponse<Permission>> {
    return this.http.post<ApiResponse<Permission>>(API_ENDPOINTS.permissions.list, request);
  }

  updatePermission(correlationId: string, request: PermissionRequest): Observable<ApiResponse<Permission>> {
    return this.http.put<ApiResponse<Permission>>(API_ENDPOINTS.permissions.byId(correlationId), request);
  }

  deletePermission(correlationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.permissions.byId(correlationId));
  }

  getRolePermissionIds(roleCorrelationId: string): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(API_ENDPOINTS.rolePermissions.byRole(roleCorrelationId));
  }

  assignRolePermissions(request: RolePermissionAssignRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(API_ENDPOINTS.rolePermissions.assign, request);
  }

  removeRolePermission(roleCorrelationId: string, permissionCorrelationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.rolePermissions.remove(roleCorrelationId, permissionCorrelationId)
    );
  }

  getUsers(page = 1, pageSize = 10, search?: string): Observable<ApiResponse<PagedResponse<User>>> {
    return this.http.get<ApiResponse<PagedResponse<User>>>(API_ENDPOINTS.users.list, {
      params: this.pageParams(page, pageSize, search)
    });
  }

  getUser(correlationId: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(API_ENDPOINTS.users.byId(correlationId));
  }

  getUserDetail(correlationId: string): Observable<ApiResponse<UserDetail>> {
    return this.http.get<ApiResponse<UserDetail>>(API_ENDPOINTS.users.detail(correlationId));
  }

  createUser(request: UserCreateRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(API_ENDPOINTS.users.list, request);
  }

  updateUser(correlationId: string, request: UserUpdateRequest): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(API_ENDPOINTS.users.byId(correlationId), request);
  }

  deleteUser(correlationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.users.byId(correlationId));
  }

  getUserRoles(page = 1, pageSize = 10, search?: string): Observable<ApiResponse<PagedResponse<UserRole>>> {
    return this.http.get<ApiResponse<PagedResponse<UserRole>>>(API_ENDPOINTS.userRoles.list, {
      params: this.pageParams(page, pageSize, search)
    });
  }

  getRolesForUser(userCorrelationId: string): Observable<ApiResponse<UserRole[]>> {
    return this.http.get<ApiResponse<UserRole[]>>(API_ENDPOINTS.userRoles.byUser(userCorrelationId));
  }

  assignUserRole(request: UserRoleRequest): Observable<ApiResponse<UserRole>> {
    return this.http.post<ApiResponse<UserRole>>(API_ENDPOINTS.userRoles.assign, request);
  }

  removeUserRole(request: UserRoleRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(API_ENDPOINTS.userRoles.remove, request);
  }

  private pageParams(page: number, pageSize: number, search?: string): HttpParams {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    return params;
  }
}
