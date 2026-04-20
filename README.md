# Shree Yogi Engineering UI

A modern Angular 21 application with professional authentication, reactive forms, and a responsive Bootstrap UI.

## Features

✅ **Angular 21** - Latest Angular framework  
✅ **Reactive Forms** - FormGroup, FormControl with validation  
✅ **Authentication** - Login & Token Refresh  
✅ **HTTP Interceptor** - Automatic token injection & refresh  
✅ **Auth Guard** - Route protection  
✅ **Bootstrap 5** - Responsive & modern UI  
✅ **SCSS** - Professional styling  
✅ **Standalone Components** - Modern Angular architecture  
✅ **TypeScript** - Strict type checking  

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── login/              # Login component
│   │   │   ├── login.component.ts
│   │   │   ├── login.component.html
│   │   │   └── login.component.scss
│   │   └── dashboard/          # Protected dashboard
│   │       ├── dashboard.component.ts
│   │       ├── dashboard.component.html
│   │       └── dashboard.component.scss
│   ├── core/
│   │   ├── models/             # Data models & interfaces
│   │   │   └── auth.model.ts
│   │   ├── services/           # Business logic
│   │   │   └── auth.service.ts
│   │   ├── interceptors/       # HTTP interceptors
│   │   │   └── auth.interceptor.ts
│   │   └── guards/             # Route guards
│   │       └── auth.guard.ts
│   ├── shared/
│   │   └── components/         # Reusable components
│   ├── app.routes.ts           # Application routes
│   ├── app.component.ts
│   ├── app.component.html
│   └── app.component.scss
├── environments/               # Environment configs
│   ├── environment.ts
│   └── environment.prod.ts
├── index.html
├── main.ts
└── styles.scss                 # Global styles
```

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ServicePlatformUI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API endpoint**
   - Open `src/environments/environment.ts`
   - Update `apiUrl` to match your backend API URL
   - Default: `http://localhost:5077/api`

## Development

### Start Development Server

```bash
npm start
```

The application will be available at `http://localhost:4200`

### Build for Production

```bash
npm run build:prod
```

Output will be in `dist/shree-yogi-engineering-ui`

## API Integration

### Login Endpoint
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Response
```json
{
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "accessTokenExpiresAt": "2026-04-15T12:00:00Z",
    "refreshTokenExpiresAt": "2026-05-14T12:00:00Z",
    "tokenType": "Bearer"
  }
}
```

### Refresh Token Endpoint
```
POST /api/auth/refreshtoken
Content-Type: application/json

{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

## Authentication Flow

1. **Login** - User enters credentials and submits form
2. **Token Storage** - Access & refresh tokens stored in localStorage
3. **Token Injection** - Auth interceptor adds token to request headers
4. **Token Refresh** - When 401 error occurs, automatically refresh token
5. **Protected Routes** - AuthGuard prevents unauthorized access
6. **Logout** - Clear tokens and redirect to login

## Key Components

### AuthService
Handles all authentication operations:
- `login(credentials)` - User login
- `refreshToken()` - Refresh access token
- `logout()` - User logout
- `isAuthenticated()` - Check auth status
- `getCurrentUser()` - Get current user info

### AuthInterceptor
Automatically:
- Adds Authorization header to requests
- Handles 401 errors with token refresh
- Prevents multiple simultaneous refresh requests

### AuthGuard
Protects routes that require authentication

### LoginComponent
Reactive form with:
- Email validation
- Password strength validation
- Error handling
- Loading state
- Bootstrap styled UI

## Customization

### Change API URL
Edit `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://your-api-url/api'
};
```

### Modify Login Form
Edit `src/app/auth/login/login.component.ts`:
```typescript
private initializeForm(): void {
  this.loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    // Add more fields here
  });
}
```

### Add New Routes
Edit `src/app/app.routes.ts`:
```typescript
{
  path: 'new-route',
  component: NewComponent,
  canActivate: [AuthGuard]
}
```

## Styling

### Bootstrap Integration
Bootstrap 5 is included and available globally.

### Custom SCSS
Global styles in `src/styles.scss`
Component-specific styles in `*.component.scss`

### Bootstrap Classes
The project uses Bootstrap utility classes:
```html
<div class="d-flex align-items-center justify-content-center">
  <p class="text-muted fw-bold">Content</p>
</div>
```

## Common Issues

### CORS Errors
Ensure your backend API has CORS enabled for `http://localhost:4200`

### Token Not Persisting
Check browser's localStorage permissions in DevTools

### 401 Unauthorized
- Verify API URL matches backend
- Check token refresh endpoint works correctly
- Ensure tokens are being stored in localStorage

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Dependencies

- **@angular/core**: v21.0.0
- **@angular/forms**: v21.0.0 (Reactive Forms)
- **@angular/router**: v21.0.0
- **@angular/common**: v21.0.0
- **bootstrap**: 5.3.0
- **rxjs**: 7.8.0

## Scripts

```bash
npm start              # Development server
npm run build          # Production build
npm run build:prod     # Optimized production build
npm run watch          # Watch mode
npm test               # Run tests
npm run lint           # Lint code
```

## Security Considerations

1. **Tokens in localStorage** - Vulnerable to XSS attacks. Consider using HTTPOnly cookies.
2. **HTTPS Only** - Always use HTTPS in production
3. **Token Expiration** - Implement proper token expiration handling
4. **CORS Configuration** - Whitelist only trusted origins

## License

Proprietary - Shree Yogi Engineering

## Support

For issues or questions:
- Check GitHub Issues
- Review API documentation
- Contact development team

## Version

**1.0.0** - Initial Release

---

**Last Updated:** April 14, 2026
