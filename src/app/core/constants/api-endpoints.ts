export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    refreshToken: '/auth/refreshtoken',
    logout: '/auth/logout'
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
