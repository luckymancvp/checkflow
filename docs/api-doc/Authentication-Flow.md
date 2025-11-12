# CheckFlow Authentication Flow

## Overview
CheckFlow uses direct Google OAuth 2.0 authentication without Supabase Auth libraries. All client-database interactions are routed through server APIs, with no direct database connections from the client.

## Architecture Principles

### Client-Side Restrictions
- **No Direct Database Access**: Client never connects directly to database
- **No Supabase Libraries**: Client does not use any Supabase SDK or libraries
- **Server-Only Database**: All database operations handled by server APIs
- **Token-Based Authentication**: Client uses JWT tokens for API authentication

### Server-Side Responsibilities
- **Google OAuth Flow**: Handle complete OAuth 2.0 flow with Google
- **Database Operations**: All user data, session management, and business logic
- **Token Management**: Issue and validate JWT tokens
- **API Gateway**: Provide secure endpoints for client interactions

## Authentication Flow Stages

### Stage 1: Initial Login Request
```
┌─────────────────────────────────────────────────────────���
│ Client (Login Page)                                     │
├─────────────────────────────────────────────────────────┤
│ 1. User clicks "Sign in with Google"                   │
│ 2. Client redirects to server OAuth initiation         │
│ 3. No client-side Google libraries used                │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Server (OAuth Initiation)                               │
├─────────────────────────────────────────────────────────┤
│ 1. Generate signed JWT state (no database storage)     │
│ 2. Redirect client to Google OAuth URL                 │
│ 3. Include required scopes and parameters              │
└─────────────────────────────────────────────────────────┘
```

### Stage 2: Google OAuth Flow
```
┌─────────────────────────────────────────────────────────┐
│ Google OAuth Server                                     │
├─────────────────────────────────────────────────────────┤
│ 1. User sees Google sign-in screen                     │
│ 2. User authenticates with Google                      │
│ 3. User grants permissions to CheckFlow                │
│ 4. Google redirects to CheckFlow callback URL          │
│ 5. Includes authorization code in callback              │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Server (OAuth Callback)                                 │
├─────────────────────────────────────────────────────────┤
│ 1. Receive authorization code from Google              │
│ 2. Verify signed JWT state (no database lookup)       │
│ 3. Exchange code for access token (one-time use)      │
│ 4. Fetch user profile from Google                      │
│ 5. Discard Google tokens after profile fetch          │
└─────────────────────────────────────────────────────────┘
```

### Stage 3: User Validation and Session Creation
```
┌─────────────────────────────────────────────────────────┐
│ Server (User Processing)                                │
├─────────────────────────────────────────────────────────┤
│ 1. Query database for existing user                    │
│ 2. Create new user if first login                      │
│ 3. Update user profile information                     │
│ 4. Generate JWT token (30-day expiration)              │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Client (Post-Authentication)                            │
├─────────────────────────────────────────────────────────┤
│ 1. Receive JWT token from server                       │
│ 2. Store token in httpOnly cookie                      │
│ 3. Redirect to main dashboard                          │
│ 4. Begin authenticated session                         │
└─────────────────────────────────────────────────────────┘
```

## Detailed Flow Components

### 1. Login Page Interaction
**User Action**: Click "Sign in with Google" button

**Client Process**:
- Button click triggers redirect to server endpoint
- No Google libraries loaded on client
- No direct OAuth handling on client side
- Simple redirect: `window.location.href = '/api/auth/google'`

**Server Endpoint**: `GET /api/auth/google`

### 2. OAuth Initiation (Server-Side)
**Endpoint**: `GET /api/auth/google`

**Server Actions**:
- Generate signed JWT state parameter (no database storage)
- Construct Google OAuth URL with required parameters
- Redirect client to Google OAuth URL

**Signed JWT State Generation**:
```javascript
const stateData = {
  timestamp: Date.now(),
  nonce: crypto.randomBytes(16).toString('hex'),
  ip: req.ip
}
const state = jwt.sign(stateData, process.env.JWT_SECRET, { expiresIn: '10m' })
```

**OAuth URL Parameters**:
- `client_id`: Google OAuth client ID
- `redirect_uri`: CheckFlow callback URL
- `response_type`: "code" (authorization code flow)
- `scope`: "openid email profile"
- `state`: Signed JWT state parameter
- `access_type`: "online" (no refresh token needed)

### 3. Google OAuth Callback
**Endpoint**: `GET /api/auth/callback`

**Server Processing**:
- Extract and verify signed JWT state parameter
- Extract authorization code from query parameters
- Exchange authorization code for access token (one-time use)
- Use access token to fetch user profile
- Discard Google tokens after profile fetch

**State Verification (No Database Lookup)**:
```javascript
try {
  const stateData = jwt.verify(state, process.env.JWT_SECRET)
  const timeDiff = Date.now() - stateData.timestamp
  if (timeDiff > 10 * 60 * 1000) throw new Error('State expired')
  // State is valid, proceed with OAuth
} catch (error) {
  // Invalid state, reject request
}
```

**Security Validations**:
- JWT signature verification (CSRF protection)
- Timestamp validation (prevent replay attacks)
- IP address validation (optional)
- Authorization code single-use validation

### 4. User Profile Processing
**Google Profile Data Retrieved**:
- User ID (Google unique identifier)
- Email address
- Full name
- Profile picture URL
- Email verification status

**Database Operations** (Server-Only):
- Check if user exists in database
- Create new user record if first login
- Update existing user profile information
- Extract username from email (before @ symbol)

**Google Token Handling**:
- Use access token immediately to fetch profile
- Discard all Google tokens after profile retrieval
- No storage of Google tokens
- No token refresh mechanism

### 5. JWT Token Generation
**Token Contents**:
- User ID (database primary key)
- Google ID (Google unique identifier)
- Email address
- Username (extracted from email)
- Token expiration time (30 days)
- Issued at timestamp

**Token Security**:
- Signed with server secret key
- 30-day expiration time
- No refresh token mechanism

### 6. Session Management
**Client-Side Session**:
- JWT token stored in httpOnly cookie
- No sensitive data in localStorage
- Cookie secured with sameSite and secure flags
- Manual logout or token expiration for session end

**Server-Side Session**:
- No persistent session storage
- Stateless authentication via JWT

## API Endpoints

### Authentication Endpoints
```
GET  /api/auth/google          - Initiate Google OAuth flow
GET  /api/auth/callback        - Handle Google OAuth callback
POST /api/auth/logout          - Logout and clear cookie
GET  /api/auth/me              - Get current user profile
POST /api/auth/test            - Test login
```

### Test Authentication Endpoint
**Endpoint**: `POST /api/auth/test`

**Purpose**: Development testing without Google OAuth

**Request Body**:
```json
{
  "action": "login"
}
```

**Server Actions**:
- Check if test user exists in database
- Create test user if not exists
- Generate JWT token for test user
- Return same response format as Google OAuth

**Test User Data**:
- Email: test@checkflow.com
- Name: Test User
- Username: test
- Google ID: test-google-id-123

**Response** (Same as Google OAuth):
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@checkflow.com",
    "name": "Test User",
    "username": "test",
    "avatar_url": "https://via.placeholder.com/150",
    "domain": "checkflow.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Usage**:
- Only available in development environment
- Disabled in production
- Allows testing without Google OAuth setup
- Creates consistent test user for development

## Error Handling

### OAuth Flow Errors
**Error Types**:
- Invalid JWT state parameter
- Authorization code expired
- User domain not allowed
- Google API errors
- Token exchange failures

**Error Responses**:
- Redirect to login page with error message
- Clear error messages for user
- Detailed logging for debugging
- Graceful fallback handling

### Session Errors
**Error Types**:
- Expired JWT token
- Invalid token signature
- Database connection errors
- Permission denied

**Error Handling**:
- Automatic logout on token errors
- Clear error messages
- Redirect to login when needed
- No token refresh - require re-login

## Security Measures

### OAuth Security
- **Signed JWT State**: CSRF protection without database storage
- **Domain Validation**: Only allow company domains
- **Token Validation**: Verify all tokens with Google (one-time)
- **Scope Limitation**: Minimal required permissions
- **Immediate Token Discard**: No persistent Google token storage

### Session Security
- **httpOnly Cookies**: Prevent XSS attacks
- **Secure Cookies**: HTTPS only transmission
- **SameSite Cookies**: CSRF protection
- **30-day JWT**: Long-lived tokens for convenience
- **Stateless Authentication**: No server-side session storage

### API Security
- **JWT Validation**: All API calls require valid token
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Sanitize all inputs
- **CORS Configuration**: Restrict origins
- **HTTPS Only**: Encrypted communication

## Database Schema

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  google_id VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  username VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  avatar_url TEXT,
  domain VARCHAR NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
)
```

## Client-Side Implementation

### Authentication Context
**State Management**:
- User authentication status
- User profile information
- Loading states
- Error states
- Logout handling

**Context Properties**:
- `user`: Current user object or null
- `isAuthenticated`: Boolean authentication status
- `isLoading`: Loading state for auth operations
- `error`: Authentication error messages
- `logout`: Function to logout user

### Protected Routes
**Route Protection**:
- Check authentication status
- Redirect to login if not authenticated
- Loading states during auth checks

**Implementation Pattern**:
- Higher-order component for route protection
- Authentication context provider
- Automatic redirects

### API Client
**HTTP Client Configuration**:
- Automatic JWT token inclusion
- Request/response interceptors
- Error handling
- Simple token validation

**Request Flow**:
1. Include JWT token in Authorization header
2. Send request to server API
3. Handle authentication errors
4. Redirect to login if token invalid
5. No token refresh mechanism

## Logout Flow

### Client-Initiated Logout
**User Action**: Click logout button

**Client Process**:
1. Call logout API endpoint
2. Clear local authentication state
3. Redirect to login page
4. Remove any cached data

**Server Process**:
1. Clear JWT cookie
2. Return success response

### Automatic Logout
**Triggers**:
- JWT token expiration (after 30 days)
- Invalid token detection
- Security violations

**Process**:
1. Detect authentication failure
2. Clear client state
3. Redirect to login
4. Show appropriate message

## Production Considerations

### Environment Configuration
**Development**:
- Local Google OAuth app
- HTTP localhost allowed
- Test API endpoint enabled
- Detailed error messages
- Debug logging enabled

**Production**:
- Production Google OAuth app
- HTTPS enforced
- Test API endpoint disabled
- Minimal error messages
- Secure logging

### Test Environment Setup
**Development Testing**:
- Use test API endpoint for quick testing
- No need for Google OAuth setup during development
- Consistent test user for all developers
- Skip OAuth flow complexity in development

**Production Security**:
- Test endpoint completely disabled
- Only Google OAuth allowed
- Domain validation enforced
- Security logging enabled

This simplified authentication flow provides robust security while eliminating unnecessary complexity and includes a convenient test endpoint for development.

### Default values if not loaded from ENV
CLient ID : 77812481890-js45lafkl9q57l9b8r14bo8u8qakar5v.apps.googleusercontent.com
Client Secret : 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

### /login page
- Show redirect url should be setup in gooogle console
- Show test login button (for every environments)
- setup api to show error detail for easier debug
