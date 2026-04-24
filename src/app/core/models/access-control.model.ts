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

export interface Customer {
  correlationId: string;
  customerName: string;
  code: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdOn: string;
}

export interface CustomerRequest {
  customerName: string;
  code: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

export interface ManufacturingItem {
  correlationId: string;
  itemCode: string;
  itemName: string;
  customerCorrelationId: string;
  customerName: string;
  customerCode: string;
  unit?: string;
  description?: string;
  photoUrl?: string;
  lowStockThreshold: number;
  isActive: boolean;
  createdOn: string;
}

export interface ManufacturingItemRequest {
  itemCode: string;
  itemName: string;
  customerCorrelationId: string;
  unit?: string;
  description?: string;
  photoUrl?: string;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface ToolingItem {
  correlationId: string;
  itemCode: string;
  itemName: string;
  customerCorrelationId: string;
  customerName: string;
  customerCode: string;
  unit?: string;
  description?: string;
  location?: string;
  photoUrl?: string;
  lowStockThreshold: number;
  isActive: boolean;
  createdOn: string;
}

export interface ToolingItemRequest {
  itemCode: string;
  itemName: string;
  customerCorrelationId: string;
  unit?: string;
  description?: string;
  location?: string;
  photoUrl?: string;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface ManufacturingOperation {
  correlationId: string;
  manufacturingItemCorrelationId: string;
  itemCode: string;
  itemName: string;
  customerCorrelationId: string;
  customerName: string;
  customerCode: string;
  operationType: string;
  quantity: number;
  operationDate: string;
  challanNo?: string;
  lotNo?: string;
  remarks?: string;
  photoUrl?: string;
  createdOn: string;
}

export interface ManufacturingOperationRequest {
  manufacturingItemCorrelationId: string;
  operationType: string;
  quantity: number;
  operationDate: string;
  challanNo?: string;
  lotNo?: string;
  remarks?: string;
  photoUrl?: string;
}

export interface ManufacturingOperationFilter {
  customerCorrelationId?: string;
  itemCorrelationId?: string;
  operationType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ToolingOperation {
  correlationId: string;
  toolingItemCorrelationId: string;
  itemCode: string;
  itemName: string;
  location?: string;
  operationType: string;
  quantity: number;
  operationDate: string;
  remarks?: string;
  photoUrl?: string;
  createdOn: string;
}

export interface ToolingOperationRequest {
  toolingItemCorrelationId: string;
  operationType: string;
  quantity: number;
  operationDate: string;
  remarks?: string;
  photoUrl?: string;
}

export interface ToolingOperationFilter {
  itemCorrelationId?: string;
  operationType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ManufacturingStockSummary {
  manufacturingItemCorrelationId: string;
  itemCode: string;
  itemName: string;
  customerCorrelationId: string;
  customerName: string;
  customerCode: string;
  receivedQty: number;
  dispatchedQty: number;
  rejectedQty: number;
  qtyInHand: number;
}

export interface ToolingStockSummary {
  toolingItemCorrelationId: string;
  itemCode: string;
  itemName: string;
  location?: string;
  lowStockThreshold: number;
  receivedQty: number;
  usedQty: number;
  qtyInHand: number;
  status: string;
}

export interface Fastener {
  correlationId: string;
  itemCode: string;
  itemName: string;
  category?: string;
  size?: string;
  unit?: string;
  currentStock: number;
  minimumStock: number;
  shopName?: string;
  location?: string;
  photoUrl?: string;
  isActive: boolean;
  createdOn: string;
}

export interface FastenerRequest {
  itemCode: string;
  itemName: string;
  category?: string;
  size?: string;
  unit?: string;
  currentStock: number;
  minimumStock: number;
  shopName?: string;
  location?: string;
  photoUrl?: string;
  isActive: boolean;
}

export interface Instrument {
  correlationId: string;
  code: string;
  instrumentName: string;
  category?: string;
  makeBrand?: string;
  serialNo?: string;
  calibrationDueDate?: string;
  currentStock: number;
  location?: string;
  photoUrl?: string;
  isActive: boolean;
  createdOn: string;
}

export interface InstrumentRequest {
  code: string;
  instrumentName: string;
  category?: string;
  makeBrand?: string;
  serialNo?: string;
  calibrationDueDate?: string;
  currentStock: number;
  location?: string;
  photoUrl?: string;
  isActive: boolean;
}

export interface InstrumentIssue {
  correlationId: string;
  instrumentCorrelationId: string;
  code: string;
  instrumentName: string;
  status: string;
  issuedTo: string;
  department?: string;
  issueDate: string;
  returnDate?: string;
  remarks?: string;
  photoUrl?: string;
  createdOn: string;
}

export interface InstrumentIssueRequest {
  instrumentCorrelationId: string;
  status: string;
  issuedTo: string;
  department?: string;
  issueDate: string;
  returnDate?: string;
  remarks?: string;
  photoUrl?: string;
}

export interface InstrumentIssueFilter {
  instrumentCorrelationId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
