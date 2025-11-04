# Google Sheets Integration APIs
**Authorization**: Bearer JWT Token

## Overview
These APIs manage the Google Sheets integration for CheckFlow, providing system-wide access to Google Sheets data with client-side processing capabilities.

## Authentication & Token Management

### GET /api/auth/google-sheets-token
**Purpose**: Provides complete Google OAuth credentials and tokens for client-side Google Sheets access

**Method**: `GET`
**Route**: `/api/auth/google-sheets-token`
**Authorization**: Bearer JWT Token
**Access**: All authenticated users

**Response**:
\`\`\`json
{
  "success": true,
  "data": {
    "clientId": "77812481890-js45lafkl9q57l9b8r14bo8u8qakar5v.apps.googleusercontent.com",
    "clientSecret": "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",
    "accessToken": "ya29.a0AfH6SMBxxx...",
    "refreshToken": "1//0GWthWxxx...",
    "expiresAt": "2024-01-15T15:30:00Z"
  }
}
\`\`\`

**Error Responses**:
\`\`\`json
{
  "success": false,
  "error": "No Google Sheets connection configured",
  "code": 404
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Authentication required",
  "code": 401
}
\`\`\`

---

### PUT /api/auth/google-sheets-token
**Purpose**: Updates the system-wide Google Sheets tokens after client-side OAuth or token refresh

**Method**: `PUT`
**Route**: `/api/auth/google-sheets-token`
**Authorization**: Bearer JWT Token
**Access**: All authenticated users

**Request Body**:
\`\`\`json
{
  "accessToken": "ya29.a0AfH6SMBxxx...",
  "refreshToken": "1//0GWthWxxx...",
  "expiresAt": "2024-01-15T15:30:00Z"
}
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "data": {
    "message": "Google Sheets tokens updated successfully",
    "expiresAt": "2024-01-15T15:30:00Z",
    "updatedAt": "2024-01-15T14:30:00Z"
  }
}
\`\`\`

**Validation Rules**:
- `accessToken`: Required, valid Google OAuth access token format
- `refreshToken`: Required, valid Google OAuth refresh token format
- `expiresAt`: Required, ISO 8601 timestamp, must be in the future

**Error Responses**:
\`\`\`json
{
  "success": false,
  "error": "Invalid access token format",
  "code": 400
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Token expiry time must be in the future",
  "code": 400
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Authentication required",
  "code": 401
}
\`\`\`

---

## Sheet Configuration Management

### GET /api/sheets
**Purpose**: Retrieve all configured Google Sheets

**Method**: `GET`
**Route**: `/api/sheets`
**Authorization**: Bearer JWT Token
**Access**: All authenticated users

**Query Parameters**:
- `createdBy` (optional): Filter by creator user ID

**Response**:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Website 1 Orders",
      "description": "Main orders from website 1",
      "google_sheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "tab_name": "Order",
      "configuration": {
        "syncStrategy": "date-based",
        "syncRange": "60-days",
        "columnMapping": {
          "itemId": "Item ID",
          "status": "Status",
          "orderNote": "Order Note",
          "designer": "Designer",
          "design": "Design",
          "customerImage": "Customer Image",
          "personalization": "Personalization",
          "date": "Date",
          "store": "Store",
          "image": "Image",
          "productType": "Product Type",
          "productName": "Product Name"
        },
        "dataRange": {
          "startRow": 1500,
          "endRow": 8247,
          "headerRow": 1,
          "columns": "A:N"
        },
        "readDirection": "top-to-bottom",
        "maxRowsPerLoad": 500
      },
      "createdBy": {
        "id": "user123",
        "name": "John Doe",
        "email": "john@company.com",
        "role": "user",
        "avatar_url": "https://example.com/avatar.jpg"
      },
      "last_access": "2024-01-15T14:30:00Z",
      "created_at": "2024-01-15T09:00:00Z",
      "updated_at": "2024-01-15T14:30:00Z"
    }
  ],
  "meta": {
    "total": 5
  }
}
\`\`\`

**Error Responses**:
\`\`\`json
{
  "success": false,
  "error": "Authentication required",
  "code": 401
}
\`\`\`

---

### POST /api/sheets
**Purpose**: Add new Google Sheet configuration

**Method**: `POST`
**Route**: `/api/sheets`
**Authorization**: Bearer JWT Token
**Access**: All authenticated users

**Request Body**:
\`\`\`json
{
  "name": "Website 2 Orders",
  "description": "Orders from website 2",
  "googleSheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "tabName": "Order",
  "configuration": {
    "syncStrategy": "date-based",
    "syncRange": "30-days",
    "columnMapping": {
      "itemId": "Item ID",
      "status": "Status",
      "orderNote": "Order Note",
      "designer": "Designer",
      "design": "Design",
      "customerImage": "Customer Image",
      "personalization": "Personalization",
      "date": "Date",
      "store": "Store",
      "image": "Image",
      "productType": "Product Type",
      "productName": "Product Name"
    },
    "dataRange": {
      "startRow": 1,
      "endRow": null,
      "headerRow": 1,
      "columns": "A:L"
    },
    "readDirection": "top-to-bottom",
    "maxRowsPerLoad": 500
  }
}
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Website 2 Orders",
    "description": "Orders from website 2",
    "google_sheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "tab_name": "Order",
    "configuration": {
      "syncStrategy": "date-based",
      "syncRange": "30-days",
      "columnMapping": {
        "itemId": "Item ID",
        "status": "Status",
        "orderNote": "Order Note",
        "designer": "Designer",
        "design": "Design",
        "customerImage": "Customer Image",
        "personalization": "Personalization",
        "date": "Date",
        "store": "Store",
        "image": "Image",
        "productType": "Product Type",
        "productName": "Product Name"
      },
      "dataRange": {
        "startRow": 1,
        "endRow": null,
        "headerRow": 1,
        "columns": "A:L"
      },
      "readDirection": "top-to-bottom",
      "maxRowsPerLoad": 500
    },
    "createdBy": {
      "id": "user123",
      "name": "John Doe",
      "email": "john@company.com",
      "role": "user",
      "avatar_url": "https://example.com/avatar.jpg"
    },
    "created_at": "2024-01-15T15:00:00Z",
    "updated_at": "2024-01-15T15:00:00Z"
  }
}
\`\`\`

**Validation Rules**:
- `name`: Required, max 100 characters
- `googleSheetId`: Required, valid Google Sheet ID format
- `tabName`: Required, max 50 characters
- `configuration.columnMapping`: Required, must include at least `itemId`, `status`, `designer`
- `configuration.syncStrategy`: Required, must be "date-based" or "row-based"

**Error Responses**:
\`\`\`json
{
  "success": false,
  "error": "Sheet name already exists",
  "code": 400
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Invalid Google Sheet ID format",
  "code": 400
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Cannot access Google Sheet - check permissions",
  "code": 403
}
\`\`\`

---

### PUT /api/sheets/:id
**Purpose**: Update existing Google Sheet configuration

**Method**: `PUT`
**Route**: `/api/sheets/:id`
**Authorization**: Bearer JWT Token
**Access**: All authenticated users

**Path Parameters**:
- `id`: Sheet configuration ID (UUID)

**Request Body**:
\`\`\`json
{
  "name": "Website 1 Orders - Updated",
  "description": "Updated description",
  "tabName": "OrderData",
  "configuration": {
    "syncStrategy": "row-based",
    "syncRange": "row-1500",
    "columnMapping": {
      "itemId": "Item ID",
      "status": "Status",
      "orderNote": "Order Note",
      "designer": "Designer",
      "design": "Design",
      "customerImage": "Customer Image",
      "personalization": "Personalization",
      "date": "Date",
      "store": "Store",
      "image": "Image",
      "productType": "Product Type",
      "productName": "Product Name"
    },
    "dataRange": {
      "startRow": 1500,
      "endRow": 8247,
      "headerRow": 1,
      "columns": "A:N"
    },
    "readDirection": "top-to-bottom",
    "maxRowsPerLoad": 1000
  }
}
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Website 1 Orders - Updated",
    "description": "Updated description",
    "google_sheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "tab_name": "OrderData",
    "configuration": {
      "syncStrategy": "row-based",
      "syncRange": "row-1500",
      "columnMapping": {
        "itemId": "Item ID",
        "status": "Status",
        "orderNote": "Order Note",
        "designer": "Designer",
        "design": "Design",
        "customerImage": "Customer Image",
        "personalization": "Personalization",
        "date": "Date",
        "store": "Store",
        "image": "Image",
        "productType": "Product Type",
        "productName": "Product Name"
      },
      "dataRange": {
        "startRow": 1500,
        "endRow": 8247,
        "headerRow": 1,
        "columns": "A:N"
      },
      "readDirection": "top-to-bottom",
      "maxRowsPerLoad": 1000
    },
    "createdBy": {
      "id": "user123",
      "name": "John Doe",
      "email": "john@company.com",
      "role": "user",
      "avatar_url": "https://example.com/avatar.jpg"
    },
    "last_access": "2024-01-15T14:30:00Z",
    "created_at": "2024-01-15T09:00:00Z",
    "updated_at": "2024-01-15T16:00:00Z"
  }
}
\`\`\`

**Error Responses**:
\`\`\`json
{
  "success": false,
  "error": "Sheet configuration not found",
  "code": 404
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Cannot update sheet created by another user",
  "code": 403
}
\`\`\`

---

### DELETE /api/sheets/:id
**Purpose**: Delete Google Sheet configuration

**Method**: `DELETE`
**Route**: `/api/sheets/:id`
**Authorization**: Bearer JWT Token
**Access**: All authenticated users (own sheets only)

**Path Parameters**:
- `id`: Sheet configuration ID (UUID)

**Response**:
\`\`\`json
{
  "success": true,
  "message": "Sheet configuration deleted successfully"
}
\`\`\`

**Error Responses**:
\`\`\`json
{
  "success": false,
  "error": "Sheet configuration not found",
  "code": 404
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Cannot delete sheet created by another user",
  "code": 403
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Cannot delete sheet - active orders exist",
  "code": 400
}
\`\`\`

---

## Google Sheets Integration Flow

### Client-Side OAuth Flow
1. **Get Credentials**: Client calls `GET /api/auth/google-sheets-token`
2. **Check Token Status**: If no tokens or expired, initiate OAuth
3. **OAuth Flow**: Client handles Google OAuth with provided clientId/clientSecret
4. **Update Tokens**: Client calls `PUT /api/auth/google-sheets-token` with new tokens
5. **Direct API Calls**: Client uses accessToken for direct Google Sheets API calls

### Token Management Strategy
- **Server Stores**: Current accessToken, refreshToken, and expiry time
- **Client Receives**: All credentials needed for Google Sheets access
- **Client Updates**: New tokens after OAuth or refresh operations
- **Automatic Refresh**: Client can refresh tokens when expired using refreshToken
- **System-Wide Access**: All authenticated users share the same Google account connection

## Configuration Schema

### Sync Strategy Options
- **date-based**: Sync based on date range (recommended)
  - `syncRange`: "7-days", "14-days", "30-days", "60-days", "90-days", "180-days", "all"
- **row-based**: Sync from specific row number
  - `syncRange`: "row-{number}" (e.g., "row-1500")

### Column Mapping Fields (Header Names)
The columnMapping uses actual header names from the Google Sheet, not column indices. Each field maps to the exact header text found in the sheet:

- **itemId**: Maps to header like "Item ID", "Order ID", "Item Number"
- **status**: Maps to header like "Status", "Order Status", "State"
- **orderNote**: Maps to header like "Order Note", "Customer Note", "Requirements"
- **designer**: Maps to header like "Designer", "Designer Name", "Assigned To"
- **design**: Maps to header like "Design", "Design Link", "Design File"
- **customerImage**: Maps to header like "Customer Image", "Reference Image", "Customer Photo"
- **personalization**: Maps to header like "Personalization", "Custom Text", "Personalization Details"
- **date**: Maps to header like "Date", "Order Date", "Created Date" (required for date-based sync)
- **store**: Maps to header like "Store", "Store Name", "Website"
- **image**: Maps to header like "Image", "Product Image", "Mockup"
- **productType**: Maps to header like "Product Type", "Type", "Category"
- **productName**: Maps to header like "Product Name", "Product", "Item Name"

### Data Range Configuration
- **startRow**: Starting row number for data reading
- **endRow**: Ending row number (null for auto-detect)
- **headerRow**: Header row number (usually 1)
- **columns**: Column range (e.g., "A:N")

### Performance Settings
- **readDirection**: "top-to-bottom" or "bottom-to-top"
  - **top-to-bottom**: Use when new orders are added at the bottom of sheet (reads oldest orders first)
  - **bottom-to-top**: Use when new orders are added at the top of sheet (reads oldest orders first)
  - **Purpose**: Ensures orders are always processed in chronological order (old to new) regardless of sheet structure
- **maxRowsPerLoad**: Maximum rows to load per request (100-1000)

## Error Handling

### Common Error Codes
- **400**: Bad Request - Invalid data format or validation error
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Access denied or insufficient permissions
- **404**: Not Found - Sheet configuration or tokens not found
- **409**: Conflict - Sheet name already exists
- **422**: Unprocessable Entity - Google Sheets access error

### Google Sheets Access Errors
- Invalid Google Sheet ID format
- Sheet not accessible with current permissions
- Sheet tab not found
- Column mapping refers to non-existent header names
- Date column format not recognized for date-based sync
- Token expired or invalid format

### Header Name Validation
- Header names must exist in the specified sheet tab
- Header names are case-sensitive
- Duplicate header names in the sheet will cause mapping errors
- Missing required headers (itemId, status, designer) will prevent configuration
