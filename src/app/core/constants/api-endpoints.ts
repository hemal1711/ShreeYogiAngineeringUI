export const API_ENDPOINTS = {
  dashboard: {
    summary: '/dashboard/summary'
  },
  auth: {
    login: '/auth/login',
    refreshToken: '/auth/refreshtoken',
    logout: '/auth/logout'
  },
  notifications: {
    registerDevice: '/notifications/register-device',
    unregisterDevice: '/notifications/unregister-device'
  },
  roles: {
    list: '/roles',
    byId: (correlationId: string) => `/roles/${correlationId}`,
    detail: (correlationId: string) => `/roles/${correlationId}/detail`
  },
  permissions: {
    list: '/permissions',
    byId: (correlationId: string) => `/permissions/${correlationId}`
  },
  rolePermissions: {
    byRole: (roleCorrelationId: string) => `/rolepermissions/role/${roleCorrelationId}`,
    assign: '/rolepermissions/assign',
    remove: (roleCorrelationId: string, permissionCorrelationId: string) =>
      `/rolepermissions/role/${roleCorrelationId}/permission/${permissionCorrelationId}`
  },
  customers: {
    list: '/customers',
    byId: (correlationId: string) => `/customers/${correlationId}`
  },
  fasteners: {
    list: '/fasteners',
    byId: (correlationId: string) => `/fasteners/${correlationId}`
  },
  instruments: {
    list: '/instruments',
    byId: (correlationId: string) => `/instruments/${correlationId}`
  },
  instrumentIssues: {
    list: '/instrumentissues',
    byId: (correlationId: string) => `/instrumentissues/${correlationId}`
  },
  manufacturingItems: {
    list: '/manufacturingitems',
    byId: (correlationId: string) => `/manufacturingitems/${correlationId}`
  },
  manufacturingOperations: {
    list: '/manufacturingoperations',
    byId: (correlationId: string) => `/manufacturingoperations/${correlationId}`
  },
  productionReports: {
    list: '/productionreports',
    byId: (correlationId: string) => `/productionreports/${correlationId}`,
    entries: (correlationId: string) => `/productionreports/${correlationId}/entries`,
    unlockEntry: (correlationId: string, entryCorrelationId: string) => `/productionreports/${correlationId}/entries/${entryCorrelationId}/unlock`,
    complete: (correlationId: string) => `/productionreports/${correlationId}/complete`
  },
  machineMasters: {
    types: '/machinemasters/types',
    names: '/machinemasters/names'
  },
  toolingItems: {
    list: '/toolingitems',
    byId: (correlationId: string) => `/toolingitems/${correlationId}`
  },
  toolingOperations: {
    list: '/toolingoperations',
    byId: (correlationId: string) => `/toolingoperations/${correlationId}`
  },
  users: {
    list: '/users',
    byId: (correlationId: string) => `/users/${correlationId}`,
    detail: (correlationId: string) => `/users/${correlationId}/detail`
  },
  userRoles: {
    list: '/userroles',
    byUser: (userCorrelationId: string) => `/userroles/user/${userCorrelationId}`,
    assign: '/userroles/assign',
    remove: '/userroles/remove'
  }
} as const;
