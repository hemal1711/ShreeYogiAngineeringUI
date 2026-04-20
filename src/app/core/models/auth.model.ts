/**
 * User login request model matching the backend API
 */
export interface LoginRequest {
  identifier: string;
  password: string;
}

/**
 * Refresh token request model
 */
export interface RefreshTokenRequest {
  refreshToken: string;
  accessToken: string;
}

/**
 * User login response model with tokens
 */
export interface LoginResponse {
  userCorrelationId: string;
  userName: string;
  email: string;
  phoneNumber: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  tokenType: string;
}

/**
 * Current user information
 */
export interface CurrentUser {
  userCorrelationId: string;
  userName: string;
  email: string;
  phoneNumber: string;
  isSystemRole: boolean;
  fullName: string;
  roles: string[];
  permissions: string[];
  tokenType: string;
}

/**
 * Auth session stored on the client.
 */
export interface AuthSession {
  user: CurrentUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  tokenType: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  statusCode?: number;
  success?: boolean;
  errors?: string[];
}
