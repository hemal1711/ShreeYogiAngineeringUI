import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import {
  PagedResponse,
  Customer,
  CustomerRequest,
  Fastener,
  FastenerRequest,
  Instrument,
  InstrumentIssue,
  InstrumentIssueFilter,
  InstrumentIssueRequest,
  InstrumentRequest,
  ManufacturingItem,
  ManufacturingOperation,
  ManufacturingOperationFilter,
  ManufacturingOperationRequest,
  ManufacturingStockSummary,
  ManufacturingItemRequest,
  Permission,
  PermissionRequest,
  Role,
  RoleDetail,
  RolePermissionAssignRequest,
  RoleRequest,
  ToolingItem,
  ToolingOperation,
  ToolingOperationFilter,
  ToolingOperationRequest,
  ToolingStockSummary,
  ToolingItemRequest,
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

  getCustomers(page = 1, pageSize = 10, search?: string): Observable<ApiResponse<PagedResponse<Customer>>> {
    return this.http.get<ApiResponse<PagedResponse<Customer>>>(API_ENDPOINTS.customers.list, {
      params: this.pageParams(page, pageSize, search)
    });
  }

  getCustomer(correlationId: string): Observable<ApiResponse<Customer>> {
    return this.http.get<ApiResponse<Customer>>(API_ENDPOINTS.customers.byId(correlationId));
  }

  createCustomer(request: CustomerRequest): Observable<ApiResponse<Customer>> {
    return this.http.post<ApiResponse<Customer>>(API_ENDPOINTS.customers.list, request);
  }

  updateCustomer(correlationId: string, request: CustomerRequest): Observable<ApiResponse<Customer>> {
    return this.http.put<ApiResponse<Customer>>(API_ENDPOINTS.customers.byId(correlationId), request);
  }

  deleteCustomer(correlationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.customers.byId(correlationId));
  }

  getFasteners(page = 1, pageSize = 10, search?: string): Observable<ApiResponse<PagedResponse<Fastener>>> {
    return this.http.get<ApiResponse<PagedResponse<Fastener>>>(API_ENDPOINTS.fasteners.list, { params: this.pageParams(page, pageSize, search) });
  }

  getFastener(correlationId: string): Observable<ApiResponse<Fastener>> {
    return this.http.get<ApiResponse<Fastener>>(API_ENDPOINTS.fasteners.byId(correlationId));
  }

  createFastener(request: FastenerRequest, photo?: File | null): Observable<ApiResponse<Fastener>> {
    return this.http.post<ApiResponse<Fastener>>(API_ENDPOINTS.fasteners.list, this.toFastenerFormData(request, photo));
  }

  updateFastener(correlationId: string, request: FastenerRequest, photo?: File | null): Observable<ApiResponse<Fastener>> {
    return this.http.put<ApiResponse<Fastener>>(API_ENDPOINTS.fasteners.byId(correlationId), this.toFastenerFormData(request, photo));
  }

  deleteFastener(correlationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.fasteners.byId(correlationId));
  }

  getInstruments(page = 1, pageSize = 10, search?: string): Observable<ApiResponse<PagedResponse<Instrument>>> {
    return this.http.get<ApiResponse<PagedResponse<Instrument>>>(API_ENDPOINTS.instruments.list, { params: this.pageParams(page, pageSize, search) });
  }

  getInstrument(correlationId: string): Observable<ApiResponse<Instrument>> {
    return this.http.get<ApiResponse<Instrument>>(API_ENDPOINTS.instruments.byId(correlationId));
  }

  createInstrument(request: InstrumentRequest, photo?: File | null): Observable<ApiResponse<Instrument>> {
    return this.http.post<ApiResponse<Instrument>>(API_ENDPOINTS.instruments.list, this.toInstrumentFormData(request, photo));
  }

  updateInstrument(correlationId: string, request: InstrumentRequest, photo?: File | null): Observable<ApiResponse<Instrument>> {
    return this.http.put<ApiResponse<Instrument>>(API_ENDPOINTS.instruments.byId(correlationId), this.toInstrumentFormData(request, photo));
  }

  deleteInstrument(correlationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.instruments.byId(correlationId));
  }

  getInstrumentIssues(page = 1, pageSize = 10, filter: InstrumentIssueFilter = {}): Observable<ApiResponse<PagedResponse<InstrumentIssue>>> {
    return this.http.get<ApiResponse<PagedResponse<InstrumentIssue>>>(API_ENDPOINTS.instrumentIssues.list, { params: this.operationParams(page, pageSize, filter) });
  }

  getInstrumentIssue(correlationId: string): Observable<ApiResponse<InstrumentIssue>> {
    return this.http.get<ApiResponse<InstrumentIssue>>(API_ENDPOINTS.instrumentIssues.byId(correlationId));
  }

  createInstrumentIssue(request: InstrumentIssueRequest, photo?: File | null): Observable<ApiResponse<InstrumentIssue>> {
    return this.http.post<ApiResponse<InstrumentIssue>>(API_ENDPOINTS.instrumentIssues.list, this.toInstrumentIssueFormData(request, photo));
  }

  updateInstrumentIssue(correlationId: string, request: InstrumentIssueRequest, photo?: File | null): Observable<ApiResponse<InstrumentIssue>> {
    return this.http.put<ApiResponse<InstrumentIssue>>(API_ENDPOINTS.instrumentIssues.byId(correlationId), this.toInstrumentIssueFormData(request, photo));
  }

  deleteInstrumentIssue(correlationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.instrumentIssues.byId(correlationId));
  }

  getManufacturingItems(page = 1, pageSize = 10, search?: string): Observable<ApiResponse<PagedResponse<ManufacturingItem>>> {
    return this.http.get<ApiResponse<PagedResponse<ManufacturingItem>>>(API_ENDPOINTS.manufacturingItems.list, {
      params: this.pageParams(page, pageSize, search)
    });
  }

  getManufacturingItem(correlationId: string): Observable<ApiResponse<ManufacturingItem>> {
    return this.http.get<ApiResponse<ManufacturingItem>>(API_ENDPOINTS.manufacturingItems.byId(correlationId));
  }

  createManufacturingItem(request: ManufacturingItemRequest, photo?: File | null): Observable<ApiResponse<ManufacturingItem>> {
    return this.http.post<ApiResponse<ManufacturingItem>>(API_ENDPOINTS.manufacturingItems.list, this.toManufacturingFormData(request, photo));
  }

  updateManufacturingItem(correlationId: string, request: ManufacturingItemRequest, photo?: File | null): Observable<ApiResponse<ManufacturingItem>> {
    return this.http.put<ApiResponse<ManufacturingItem>>(API_ENDPOINTS.manufacturingItems.byId(correlationId), this.toManufacturingFormData(request, photo));
  }

  deleteManufacturingItem(correlationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.manufacturingItems.byId(correlationId));
  }

  getManufacturingOperations(page = 1, pageSize = 10, filter: ManufacturingOperationFilter = {}): Observable<ApiResponse<PagedResponse<ManufacturingOperation>>> {
    return this.http.get<ApiResponse<PagedResponse<ManufacturingOperation>>>(API_ENDPOINTS.manufacturingOperations.list, {
      params: this.operationParams(page, pageSize, filter)
    });
  }

  getManufacturingOperation(correlationId: string): Observable<ApiResponse<ManufacturingOperation>> {
    return this.http.get<ApiResponse<ManufacturingOperation>>(API_ENDPOINTS.manufacturingOperations.byId(correlationId));
  }

  createManufacturingOperation(request: ManufacturingOperationRequest, photo?: File | null): Observable<ApiResponse<ManufacturingOperation>> {
    return this.http.post<ApiResponse<ManufacturingOperation>>(API_ENDPOINTS.manufacturingOperations.list, this.toManufacturingOperationFormData(request, photo));
  }

  updateManufacturingOperation(correlationId: string, request: ManufacturingOperationRequest, photo?: File | null): Observable<ApiResponse<ManufacturingOperation>> {
    return this.http.put<ApiResponse<ManufacturingOperation>>(API_ENDPOINTS.manufacturingOperations.byId(correlationId), this.toManufacturingOperationFormData(request, photo));
  }

  deleteManufacturingOperation(correlationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.manufacturingOperations.byId(correlationId));
  }

  getManufacturingStockSummary(filter: { customerCorrelationId?: string; itemCorrelationId?: string }): Observable<ApiResponse<ManufacturingStockSummary[]>> {
    return this.http.get<ApiResponse<ManufacturingStockSummary[]>>(`${API_ENDPOINTS.manufacturingOperations.list}/stock-summary`, {
      params: this.stockSummaryParams(filter)
    });
  }

  getToolingItems(page = 1, pageSize = 10, search?: string): Observable<ApiResponse<PagedResponse<ToolingItem>>> {
    return this.http.get<ApiResponse<PagedResponse<ToolingItem>>>(API_ENDPOINTS.toolingItems.list, {
      params: this.pageParams(page, pageSize, search)
    });
  }

  getToolingItem(correlationId: string): Observable<ApiResponse<ToolingItem>> {
    return this.http.get<ApiResponse<ToolingItem>>(API_ENDPOINTS.toolingItems.byId(correlationId));
  }

  createToolingItem(request: ToolingItemRequest, photo?: File | null): Observable<ApiResponse<ToolingItem>> {
    return this.http.post<ApiResponse<ToolingItem>>(API_ENDPOINTS.toolingItems.list, this.toToolingFormData(request, photo));
  }

  updateToolingItem(correlationId: string, request: ToolingItemRequest, photo?: File | null): Observable<ApiResponse<ToolingItem>> {
    return this.http.put<ApiResponse<ToolingItem>>(API_ENDPOINTS.toolingItems.byId(correlationId), this.toToolingFormData(request, photo));
  }

  deleteToolingItem(correlationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.toolingItems.byId(correlationId));
  }

  getToolingOperations(page = 1, pageSize = 10, filter: ToolingOperationFilter = {}): Observable<ApiResponse<PagedResponse<ToolingOperation>>> {
    return this.http.get<ApiResponse<PagedResponse<ToolingOperation>>>(API_ENDPOINTS.toolingOperations.list, {
      params: this.operationParams(page, pageSize, filter)
    });
  }

  getToolingOperation(correlationId: string): Observable<ApiResponse<ToolingOperation>> {
    return this.http.get<ApiResponse<ToolingOperation>>(API_ENDPOINTS.toolingOperations.byId(correlationId));
  }

  createToolingOperation(request: ToolingOperationRequest, photo?: File | null): Observable<ApiResponse<ToolingOperation>> {
    return this.http.post<ApiResponse<ToolingOperation>>(API_ENDPOINTS.toolingOperations.list, this.toToolingOperationFormData(request, photo));
  }

  updateToolingOperation(correlationId: string, request: ToolingOperationRequest, photo?: File | null): Observable<ApiResponse<ToolingOperation>> {
    return this.http.put<ApiResponse<ToolingOperation>>(API_ENDPOINTS.toolingOperations.byId(correlationId), this.toToolingOperationFormData(request, photo));
  }

  deleteToolingOperation(correlationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.toolingOperations.byId(correlationId));
  }

  getToolingStockSummary(filter: { itemCorrelationId?: string; location?: string }): Observable<ApiResponse<ToolingStockSummary[]>> {
    return this.http.get<ApiResponse<ToolingStockSummary[]>>(`${API_ENDPOINTS.toolingOperations.list}/stock-summary`, {
      params: this.stockSummaryParams(filter)
    });
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

  private toManufacturingFormData(request: ManufacturingItemRequest, photo?: File | null): FormData {
    const formData = new FormData();
    formData.append('itemCode', request.itemCode);
    formData.append('itemName', request.itemName);
    formData.append('customerCorrelationId', request.customerCorrelationId);
    formData.append('unit', request.unit ?? '');
    formData.append('description', request.description ?? '');
    formData.append('photoUrl', request.photoUrl ?? '');
    formData.append('lowStockThreshold', String(request.lowStockThreshold ?? 0));
    formData.append('isActive', String(request.isActive));
    if (photo) {
      formData.append('photo', photo);
    }
    return formData;
  }

  private toToolingFormData(request: ToolingItemRequest, photo?: File | null): FormData {
    const formData = new FormData();
    formData.append('itemCode', request.itemCode);
    formData.append('itemName', request.itemName);
    formData.append('customerCorrelationId', request.customerCorrelationId);
    formData.append('unit', request.unit ?? '');
    formData.append('description', request.description ?? '');
    formData.append('location', request.location ?? '');
    formData.append('photoUrl', request.photoUrl ?? '');
    formData.append('lowStockThreshold', String(request.lowStockThreshold ?? 0));
    formData.append('isActive', String(request.isActive));
    if (photo) {
      formData.append('photo', photo);
    }
    return formData;
  }

  private toFastenerFormData(request: FastenerRequest, photo?: File | null): FormData {
    const formData = new FormData();
    formData.append('itemCode', request.itemCode);
    formData.append('itemName', request.itemName);
    formData.append('category', request.category ?? '');
    formData.append('size', request.size ?? '');
    formData.append('unit', request.unit ?? '');
    formData.append('currentStock', String(request.currentStock ?? 0));
    formData.append('minimumStock', String(request.minimumStock ?? 0));
    formData.append('shopName', request.shopName ?? '');
    formData.append('location', request.location ?? '');
    formData.append('photoUrl', request.photoUrl ?? '');
    formData.append('isActive', String(request.isActive));
    if (photo) formData.append('photo', photo);
    return formData;
  }

  private toInstrumentFormData(request: InstrumentRequest, photo?: File | null): FormData {
    const formData = new FormData();
    formData.append('code', request.code);
    formData.append('instrumentName', request.instrumentName);
    formData.append('category', request.category ?? '');
    formData.append('makeBrand', request.makeBrand ?? '');
    formData.append('serialNo', request.serialNo ?? '');
    formData.append('calibrationDueDate', request.calibrationDueDate ?? '');
    formData.append('currentStock', String(request.currentStock ?? 0));
    formData.append('location', request.location ?? '');
    formData.append('photoUrl', request.photoUrl ?? '');
    formData.append('isActive', String(request.isActive));
    if (photo) formData.append('photo', photo);
    return formData;
  }

  private toInstrumentIssueFormData(request: InstrumentIssueRequest, photo?: File | null): FormData {
    const formData = new FormData();
    formData.append('instrumentCorrelationId', request.instrumentCorrelationId);
    formData.append('status', request.status);
    formData.append('issuedTo', request.issuedTo);
    formData.append('department', request.department ?? '');
    formData.append('issueDate', request.issueDate);
    formData.append('returnDate', request.returnDate ?? '');
    formData.append('remarks', request.remarks ?? '');
    formData.append('photoUrl', request.photoUrl ?? '');
    if (photo) formData.append('photo', photo);
    return formData;
  }

  private operationParams(page: number, pageSize: number, filter: ManufacturingOperationFilter | ToolingOperationFilter | InstrumentIssueFilter): HttpParams {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params = params.set(key, String(value).trim());
      }
    });
    return params;
  }

  private stockSummaryParams(filter: Record<string, string | undefined>): HttpParams {
    let params = new HttpParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value?.trim()) {
        params = params.set(key, value.trim());
      }
    });
    return params;
  }

  private toManufacturingOperationFormData(request: ManufacturingOperationRequest, photo?: File | null): FormData {
    const formData = new FormData();
    formData.append('manufacturingItemCorrelationId', request.manufacturingItemCorrelationId);
    formData.append('operationType', request.operationType);
    formData.append('quantity', String(request.quantity ?? 0));
    formData.append('operationDate', request.operationDate);
    formData.append('challanNo', request.challanNo ?? '');
    formData.append('lotNo', request.lotNo ?? '');
    formData.append('remarks', request.remarks ?? '');
    formData.append('photoUrl', request.photoUrl ?? '');
    if (photo) formData.append('photo', photo);
    return formData;
  }

  private toToolingOperationFormData(request: ToolingOperationRequest, photo?: File | null): FormData {
    const formData = new FormData();
    formData.append('toolingItemCorrelationId', request.toolingItemCorrelationId);
    formData.append('operationType', request.operationType);
    formData.append('quantity', String(request.quantity ?? 0));
    formData.append('operationDate', request.operationDate);
    formData.append('remarks', request.remarks ?? '');
    formData.append('photoUrl', request.photoUrl ?? '');
    if (photo) formData.append('photo', photo);
    return formData;
  }
}
