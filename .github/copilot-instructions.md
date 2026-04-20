# Service Platform UI - Copilot Instructions

This is an Angular 21 application with professional authentication, reactive forms, and Bootstrap UI.

## Project Overview

- **Framework**: Angular 21 (Standalone Components)
- **Authentication**: JWT Token-based with refresh capability
- **Forms**: Reactive Forms with validation
- **HTTP**: Interceptors for automatic token injection
- **Routing**: Guarded routes with auth protection
- **UI Framework**: Bootstrap 5
- **Styling**: SCSS with responsive design

## Key Features

1. **Authentication System**
   - Login with email/password
   - Automatic token refresh
   - Persistent session via localStorage
   - Auto logout on token expiration

2. **Reactive Forms**
   - FormGroup-based login form
   - Real-time validation
   - Custom error messages
   - Form state management

3. **HTTP Interceptor**
   - Auto-attach authorization header
   - Handle 401 errors with token refresh
   - Queue pending requests during refresh

4. **Route Guards**
   - AuthGuard protects dashboard routes
   - Redirect to login if unauthorized
   - Preserve return URL for post-login redirect

## Project Structure

```
src/
├── app/
│   ├── auth/              # Auth-related components
│   ├── core/              # Business logic & utilities
│   │   ├── guards/        # Route protection
│   │   ├── interceptors/  # HTTP interceptors
│   │   ├── models/        # TypeScript interfaces
│   │   └── services/      # API services
│   ├── shared/            # Reusable components
│   └── layouts/           # Layout components
├── environments/          # Environment configs
└── styles.scss           # Global styles
```

## Development

### Installation
```bash
npm install
```

### Development Server
```bash
npm start
# Navigate to http://localhost:4200/
```

### Build
```bash
npm run build:prod
```

## Configuration

### API Endpoint
Update in `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5077/api'
};
```

## Important Files

- **Auth Service**: `src/app/core/services/auth.service.ts`
- **Auth Interceptor**: `src/app/core/interceptors/auth.interceptor.ts`
- **Login Component**: `src/app/auth/login/login.component.ts`
- **App Routes**: `src/app/app.routes.ts`
- **Bootstrap**: Included in `angular.json`

## API Integration Notes

The application connects to ServicePlatform API:
- **Login**: `POST /api/auth/login`
- **Refresh Token**: `POST /api/auth/refreshtoken`
- **Logout**: `POST /api/auth/logout`

Token refresh happens automatically on 401 errors.

## Customization Guide

### Add New Components
```bash
ng generate component auth/new-component
```

### Add New Routes
Edit `src/app/app.routes.ts` and add:
```typescript
{
  path: 'new-route',
  component: NewComponent,
  canActivate: [AuthGuard]  // If protected
}
```

### Modify Form Validation
Edit `src/app/auth/login/login.component.ts`:
```typescript
private initializeForm(): void {
  this.loginForm = this.formBuilder.group({
    // Add/modify fields and validators
  });
}
```

## Best Practices

1. Always use `canActivate: [AuthGuard]` for protected routes
2. Subscribe to `auth.currentUser$` for user info changes
3. Use reactive forms for complex forms
4. Store sensitive data in sessionStorage, not localStorage
5. Validate on both client and server

## Troubleshooting

**CORS Errors**: Configure CORS in backend API  
**401 Unauthorized**: Check token refresh endpoint  
**Form Validation Errors**: Verify validators in component  
**Styling Issues**: Check Bootstrap class names  

## Version Info

- Angular: 21.0.0
- Bootstrap: 5.3.0
- TypeScript: 5.6.0
- Node: 18+ (recommended)

## Testing

### Run Tests
```bash
npm test
```

### Lint Code
```bash
npm run lint
```

## Notes for Copilot

- This is a standalone component architecture (no NgModules)
- Always use the `takeUntil` pattern for subscription management
- Bootstrap is imported globally in `angular.json`
- Environment-based API URLs are in `src/environments/`
- All HTTP requests go through the auth interceptor

---
**Last Updated**: April 14, 2026
