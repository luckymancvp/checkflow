# Order Management APIs
**Authorization**: Bearer JWT Token

## Overview
These APIs manage order data and track changes for CheckFlow. Orders can be created when new data is detected or updated when supporters make status/note changes.

## Order Management

### POST /api/orders
**Purpose**: Create new order OR save order changes (status, notes)

**Method**: `POST`
**Route**: `/api/orders`
**Authorization**: Bearer JWT Token
**Access**: All authenticated users

**Request Body** (Create/Update Order):
\`\`\`json
{
  "itemId": "DAV-3743324273-4669119845",
  "googleSheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "status": "NEED_REPAIR",
  "orderNote": "Can I change the ability to 'Friend to Lovers' | Customer Note and Support Note write here",
  "designer": "anhpm",
  "designLink": "https://drive.google.com/file/d/1Zc_xIjRbti50LYaw_iBvTHvZ9ToZSxDR/view?usp=drivesdk",
  "mockupLink": "https://drive.google.com/file/d/1Zc_xIjRbti50LYaw_iBvTHvZ9ToZSxDR/view?usp=drivesdk",
  "customerImage": "https://i.etsystatic.com/icm/3b1753/790855145/icm_fullxfull.790855145_7byh3onicpgcwos8cckc.jpg?version=0",
  "personalization": "Option: Acrylic Block 3.9\" Personalization: 1) Leo & Lizette 2) S2 3) 08/06/2025...",
  "date": "07-15-2025",
  "store": "VintageVibesStoreVN",
  "productImage": "https://i.etsystatic.com/54076614/r/il/05d327/6967622997/il_300x300.6967622997_ifmf.jpg",
  "productType": "pokemon-anniversary-card",
  "productName": "Personalized Pokemon Anniversary Card, Custom Photo Anime Wedding Card...",
  "changeType": "design_error"
}
\`\`\`

**Response** (New Order Created):
\`\`\`json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "itemId": "DAV-3743324273-4669119845",
    "googleSheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "status": "NEED_REPAIR",
    "orderNote": "Can I change the ability to 'Friend to Lovers' | Customer Note and Support Note write here",
    "designer": "anhpm",
    "designLink": "https://drive.google.com/file/d/1Zc_xIjRbti50LYaw_iBvTHvZ9ToZSxDR/view?usp=drivesdk",
    "mockupLink": "https://drive.google.com/file/d/1Zc_xIjRbti50LYaw_iBvTHvZ9ToZSxDR/view?usp=drivesdk",
    "customerImage": "https://i.etsystatic.com/icm/3b1753/790855145/icm_fullxfull.790855145_7byh3onicpgcwos8cckc.jpg?version=0",
    "personalization": "Option: Acrylic Block 3.9\" Personalization: 1) Leo & Lizette 2) S2 3) 08/06/2025...",
    "date": "07-15-2025",
    "store": "VintageVibesStoreVN",
    "productImage": "https://i.etsystatic.com/54076614/r/il/05d327/6967622997/il_300x300.6967622997_ifmf.jpg",
    "productType": "pokemon-anniversary-card",
    "productName": "Personalized Pokemon Anniversary Card, Custom Photo Anime Wedding Card...",
    "changeType": "design_error",
    "createdAt": "2024-01-15T15:30:00Z",
    "updatedAt": "2024-01-15T15:30:00Z",
    "isNew": true
  }
}
\`\`\`

**Response** (Order Updated):
\`\`\`json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "itemId": "DAV-3743324273-4669119845",
    "googleSheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "status": "CONFIRMED",
    "orderNote": "Can I change the ability to 'Friend to Lovers' | Customer Note and Support Note write here",
    "designer": "anhpm",
    "designLink": "https://drive.google.com/file/d/1Zc_xIjRbti50LYaw_iBvTHvZ9ToZSxDR/view?usp=drivesdk",
    "mockupLink": "https://drive.google.com/file/d/1Zc_xIjRbti50LYaw_iBvTHvZ9ToZSxDR/view?usp=drivesdk",
    "customerImage": "https://i.etsystatic.com/icm/3b1753/790855145/icm_fullxfull.790855145_7byh3onicpgcwos8cckc.jpg?version=0",
    "personalization": "Option: Acrylic Block 3.9\" Personalization: 1) Leo & Lizette 2) S2 3) 08/06/2025...",
    "date": "07-15-2025",
    "store": "VintageVibesStoreVN",
    "productImage": "https://i.etsystatic.com/54076614/r/il/05d327/6967622997/il_300x300.6967622997_ifmf.jpg",
    "productType": "pokemon-anniversary-card",
    "productName": "Personalized Pokemon Anniversary Card, Custom Photo Anime Wedding Card...",
    "changeType": null,
    "createdAt": "2024-01-15T15:30:00Z",
    "updatedAt": "2024-01-15T16:45:00Z",
    "isNew": false
  }
}
\`\`\`

**Validation Rules**:
- `itemId`: Required, unique per Google Sheet
- `googleSheetId`: Required, must be valid Google Sheet ID
- `status`: Required, must be valid status value
- `changeType`: Optional, "design_error" or "customer_change" (required when status = "NEED_REPAIR")

**Error Responses**:
\`\`\`json
{
  "success": false,
  "error": "Missing required fields: itemId, googleSheetId, status",
  "debug": {
    "message": "Validation failed for required fields",
    "timestamp": "2025-01-23T07:09:13.000Z",
    "context": {
      "missingFields": ["itemId", "googleSheetId", "status"],
      "receivedBody": "{ ... }"
    }
  }
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Change type required when status is NEED_REPAIR",
  "debug": {
    "message": "changeType validation failed",
    "timestamp": "2025-01-23T07:09:13.000Z",
    "context": {
      "status": "NEED_REPAIR",
      "changeType": null
    }
  }
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Invalid change type. Must be design_error or customer_change",
  "debug": {
    "message": "changeType validation failed",
    "timestamp": "2025-01-23T07:09:13.000Z",
    "context": {
      "receivedChangeType": "invalid_type",
      "validValues": ["design_error", "customer_change"]
    }
  }
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Failed to create/update order",
  "debug": {
    "message": "Database operation failed",
    "stack": "Error: Connection timeout\n    at Database.query (/app/lib/supabase.ts:45:12)\n    ...",
    "details": "Connection to database timed out",
    "hint": "Check database connection and retry",
    "code": "CONNECTION_TIMEOUT",
    "timestamp": "2025-01-23T07:09:13.000Z",
    "context": {
      "operation": "upsert",
      "table": "orders",
      "itemId": "DAV-3743324273-4669119845"
    }
  }
}
\`\`\`

---

### GET /api/orders/:id/history
**Purpose**: Retrieve complete history of order changes

**Method**: `GET`
**Route**: `/api/orders/:id/history`
**Authorization**: Bearer JWT Token
**Access**: All authenticated users

**Path Parameters**:
- `id`: Order ID (UUID) or Item ID

**Response** (Order Found with History):
\`\`\`json
{
  "success": true,
  "data": {
    "order": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "itemId": "DAV-3743324273-4669119845",
      "googleSheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "sheetName": "Website 1 Orders"
    },
    "history": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440003",
        "orderId": "660e8400-e29b-41d4-a716-446655440001",
        "itemId": "DAV-3743324273-4669119845",
        "googleSheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
        "status": "CONFIRMED",
        "orderNote": "Can I change the ability to 'Friend to Lovers' | Customer Note and Support Note write here",
        "designer": "anhpm",
        "designLink": "https://drive.google.com/file/d/1Zc_xIjRbti50LYaw_iBvTHvZ9ToZSxDR/view?usp=drivesdk",
        "mockupLink": "https://drive.google.com/file/d/1Zc_xIjRbti50LYaw_iBvTHvZ9ToZSxDR/view?usp=drivesdk",
        "customerImage": "https://i.etsystatic.com/icm/3b1753/790855145/icm_fullxfull.790855145_7byh3onicpgcwos8cckc.jpg?version=0",
        "personalization": "Option: Acrylic Block 3.9\" Personalization: 1) Leo & Lizette 2) S2 3) 08/06/2025...",
        "date": "07-15-2025",
        "store": "VintageVibesStoreVN",
        "productImage": "https://i.etsystatic.com/54076614/r/il/05d327/6967622997/il_300x300.6967622997_ifmf.jpg",
        "productType": "pokemon-anniversary-card",
        "productName": "Personalized Pokemon Anniversary Card, Custom Photo Anime Wedding Card...",
        "changeType": null,
        "reviewAccuracy": null,
        "createdBy": {
          "id": "user456",
          "name": "Sarah Johnson",
          "email": "sarah@company.com",
          "role": "user"
        },
        "createdAt": "2024-01-15T16:45:00Z"
      }
    ]
  }
}
\`\`\`

**Response** (Order Not Found - Returns Empty History):
\`\`\`json
{
  "success": true,
  "data": {
    "order": null,
    "history": []
  }
}
\`\`\`

**Note**: This endpoint **never returns 404 errors**. If an order is not found, it returns an empty history with `success: true` to prevent breaking the UI flow.

**Error Responses** (Only for server/database errors):
\`\`\`json
{
  "success": false,
  "error": "Failed to fetch order history",
  "debug": {
    "message": "Database query failed",
    "stack": "Error: Query timeout\n    at Database.query (/app/lib/supabase.ts:67:8)\n    ...",
    "details": "Query execution timeout",
    "hint": "Increase query timeout or optimize query",
    "code": "QUERY_TIMEOUT",
    "timestamp": "2025-01-23T07:09:13.000Z",
    "context": {
      "orderId": "660e8400-e29b-41d4-a716-446655440001",
      "operation": "fetch_history"
    }
  }
}
\`\`\`

---

### PUT /api/orders/history/:historyId/review-accuracy
**Purpose**: Mark the accuracy of a supporter's review decision

**Method**: `PUT`
**Route**: `/api/orders/history/:historyId/review-accuracy`
**Authorization**: Bearer JWT Token
**Access**: Admin or Senior Supporters only (currently all authenticated users)

**Path Parameters**:
- `historyId`: Order history record ID (UUID)

**Request Body**:
\`\`\`json
{
  "reviewAccuracy": "correct"
}
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "data": {
    "historyId": "770e8400-e29b-41d4-a716-446655440002",
    "reviewAccuracy": "correct",
    "updatedAt": "2024-01-16T10:30:00Z"
  }
}
\`\`\`

**Validation Rules**:
- `reviewAccuracy`: Required, must be "correct", "incorrect", or null (to unmark)

**Error Responses**:
\`\`\`json
{
  "success": false,
  "error": "History record not found",
  "debug": {
    "message": "No history record found with the provided ID",
    "timestamp": "2025-01-23T07:09:13.000Z",
    "context": {
      "historyId": "770e8400-e29b-41d4-a716-446655440999",
      "operation": "update_review_accuracy"
    }
  }
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Invalid review accuracy value. Must be correct, incorrect, or null",
  "debug": {
    "message": "reviewAccuracy validation failed",
    "timestamp": "2025-01-23T07:09:13.000Z",
    "context": {
      "receivedValue": "maybe_correct",
      "validValues": ["correct", "incorrect", null]
    }
  }
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Failed to update review accuracy",
  "debug": {
    "message": "Database update operation failed",
    "stack": "Error: Constraint violation\n    at Database.update (/app/lib/supabase.ts:89:10)\n    ...",
    "details": "Check constraint violation on review_accuracy column",
    "hint": "Ensure value is one of: correct, incorrect, null",
    "code": "CHECK_VIOLATION",
    "timestamp": "2025-01-23T07:09:13.000Z",
    "context": {
      "historyId": "770e8400-e29b-41d4-a716-446655440002",
      "reviewAccuracy": "invalid_value"
    }
  }
}
\`\`\`

---

### GET /api/orders/product-history/:productType
**Purpose**: Retrieve all NEED_REPAIR orders for a specific product type within a Google Sheet

**Method**: `GET`
**Route**: `/api/orders/product-history/:productType`
**Authorization**: Bearer JWT Token
**Access**: All authenticated users

**Path Parameters**:
- `productType`: Product type identifier (e.g., "pokemon-anniversary-card")

**Query Parameters**:
- `google_sheet_id`: **Required** - Google Sheet ID to filter results

**Example Request**:
\`\`\`
GET /api/orders/product-history/pokemon-anniversary-card?google_sheet_id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "data": {
    "productType": "pokemon-anniversary-card",
    "googleSheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "sheetName": "Website 1 Orders",
    "totalRepairOrders": 3,
    "orders": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440005",
        "orderId": "660e8400-e29b-41d4-a716-446655440003",
        "itemId": "DAV-3743324273-4669119847",
        "designer": "anhpm",
        "changeType": "design_error",
        "issueDescription": "Wrong character name in personalization",
        "createdAt": "2024-01-16T09:15:00Z",
        "createdBy": {
          "id": "user789",
          "name": "Mike Wilson",
          "email": "mike@company.com"
        }
      },
      {
        "id": "770e8400-e29b-41d4-a716-446655440004",
        "orderId": "660e8400-e29b-41d4-a716-446655440002",
        "itemId": "DAV-3743324273-4669119846",
        "designer": "anhpm",
        "changeType": "customer_change",
        "issueDescription": "Customer wants different background color",
        "createdAt": "2024-01-15T18:30:00Z",
        "createdBy": {
          "id": "user456",
          "name": "Sarah Johnson",
          "email": "sarah@company.com"
        }
      },
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "orderId": "660e8400-e29b-41d4-a716-446655440001",
        "itemId": "DAV-3743324273-4669119845",
        "designer": "anhpm",
        "changeType": "design_error",
        "issueDescription": "Can I change the ability to 'Friend to Lovers' | Customer Note and Support Note write here",
        "createdAt": "2024-01-15T15:30:00Z",
        "createdBy": {
          "id": "user456",
          "name": "Sarah Johnson",
          "email": "sarah@company.com"
        }
      }
    ]
  }
}
\`\`\`

**Error Responses**:
\`\`\`json
{
  "success": false,
  "error": "Missing required parameter: google_sheet_id",
  "debug": {
    "message": "google_sheet_id query parameter is required",
    "timestamp": "2025-01-23T07:09:13.000Z",
    "context": {
      "productType": "pokemon-anniversary-card",
      "receivedParams": {}
    }
  }
}
\`\`\`

\`\`\`json
{
  "success": false,
  "error": "Failed to fetch product history",
  "debug": {
    "message": "Database query failed while fetching product history",
    "stack": "Error: Invalid query syntax\n    at Database.query (/app/lib/supabase.ts:123:15)\n    ...",
    "details": "Syntax error in SQL query",
    "hint": "Check query syntax and table structure",
    "code": "SYNTAX_ERROR",
    "timestamp": "2025-01-23T07:09:13.000Z",
    "context": {
      "productType": "pokemon-anniversary-card",
      "googleSheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "operation": "fetch_product_history"
    }
  }
}
\`\`\`

---

## Enhanced Error Response Structure

All API endpoints now return enhanced error information for better debugging:

### Standard Error Format
\`\`\`json
{
  "success": false,
  "error": "User-friendly error message",
  "debug": {
    "message": "Technical error details",
    "stack": "Full stack trace (for JavaScript errors)",
    "details": "Database error details (for Supabase errors)",
    "hint": "Database error hints (for Supabase errors)",
    "code": "Error code (for Supabase errors)",
    "timestamp": "2025-01-23T07:09:13.000Z",
    "context": {
      "operation": "Operation being performed",
      "parameters": "Relevant request parameters",
      "additionalInfo": "Any other relevant context"
    }
  }
}
\`\`\`

### Debug Information Includes:
- **Stack Traces**: Full JavaScript error stack traces for runtime errors
- **Database Errors**: Detailed Supabase error information (message, details, hint, code)
- **Request Context**: Relevant parameters, IDs, and operation details
- **Timestamps**: ISO 8601 formatted timestamps for error correlation
- **Validation Details**: Specific validation failures and expected values

---

## Database Schema

### Orders Table
\`\`\`sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR NOT NULL,
  google_sheet_id VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  order_note TEXT,
  designer VARCHAR,
  design_link TEXT,
  mockup_link TEXT,
  customer_image TEXT,
  personalization TEXT,
  date VARCHAR,
  store VARCHAR,
  product_image TEXT,
  product_type VARCHAR,
  product_name TEXT,
  change_type VARCHAR CHECK (change_type IN ('design_error', 'customer_change')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(item_id, google_sheet_id)
);
\`\`\`

### Order History Table
\`\`\`sql
CREATE TABLE order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  item_id VARCHAR NOT NULL,
  google_sheet_id VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  order_note TEXT,
  designer VARCHAR,
  design_link TEXT,
  mockup_link TEXT,
  customer_image TEXT,
  personalization TEXT,
  date VARCHAR,
  store VARCHAR,
  product_image TEXT,
  product_type VARCHAR,
  product_name TEXT,
  change_type VARCHAR CHECK (change_type IN ('design_error', 'customer_change')),
  review_accuracy VARCHAR CHECK (review_accuracy IN ('correct', 'incorrect')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

## API Behavior

### POST /api/orders Logic
1. **Check if order exists** by `itemId` + `googleSheetId`
2. **If new order**: 
   - Create in `orders` table
   - Create first entry in `order_history` table
   - Return with `isNew: true`
3. **If existing order**:
   - Update `orders` table with new data
   - Create new entry in `order_history` table
   - Return with `isNew: false`

### GET /api/orders/:id/history Behavior
1. **Always returns success: true** - Never throws 404 errors
2. **If order found**: Returns order info and complete history
3. **If order not found**: Returns `order: null` and `history: []`
4. **Graceful degradation**: UI can handle empty history without breaking

### Change Tracking
- Every change creates a new `order_history` record
- `order_history` contains complete order state at that moment
- `created_by` field tracks which user made the change
- `review_accuracy` field can be set later to evaluate supporter decisions
- System changes (initial creation) use special "system" user

### Review Accuracy Tracking
- **Purpose**: Allow admin/senior staff to mark supporter decisions as correct/incorrect
- **Usage**: Quality control and training purposes
- **Values**: 
  - `"correct"`: Supporter made the right decision
  - `"incorrect"`: Supporter made the wrong decision  
  - `null`: Not yet evaluated or not applicable
- **Access**: Currently all authenticated users (TODO: restrict to admin or senior supporters)
- **Analytics**: Can be used for supporter performance evaluation

### Product History Isolation
- **Google Sheet ID Required**: Prevents confusion between sheets with same product types
- **Sheet-Specific Results**: Only returns repair orders from the specified Google Sheet
- **Complete History**: Shows all NEED_REPAIR orders for the product type in that sheet
- **Learning Tool**: Helps supporters understand common issues for specific products

## Use Cases for Review Accuracy

### Quality Control
- Admin reviews supporter decisions periodically
- Mark NEED_REPAIR requests as justified or unjustified
- Track supporter accuracy over time for training

### Performance Analytics
- Generate reports on supporter accuracy rates
- Identify supporters who need additional training
- Recognize high-performing supporters

### Training & Feedback
- Provide specific feedback on review decisions
- Create training materials from real examples
- Improve overall review quality

## Error Handling

### Common Error Codes
- **400**: Bad Request - Invalid data or missing required fields
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Access denied or insufficient permissions
- **500**: Internal Server Error - Database or server issues

### Important Notes
- **No 404 Errors**: The history endpoint never returns 404 to prevent UI breaking
- **Enhanced Debugging**: All errors include detailed debug information
- **Stack Traces**: JavaScript errors include full stack traces
- **Database Details**: Supabase errors include message, details, hint, and code
- **Request Context**: All errors include relevant request parameters and context

### Validation Errors
- Missing required fields (itemId, googleSheetId, status)
- Invalid Google Sheet ID reference
- Invalid change type for status
- Invalid review accuracy value
- Malformed URLs in link fields

## Authentication
All endpoints require a valid JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

The token must be obtained through the authentication flow and contain valid user information.

## Rate Limiting
Currently no rate limiting is implemented, but it's recommended to implement rate limiting in production to prevent abuse.

## Data Consistency
- All timestamps are in ISO 8601 format (UTC)
- Google Sheet IDs are validated for format
- Status values should match predefined order statuses
- Change types are restricted to "design_error" or "customer_change"
- Review accuracy values are restricted to "correct", "incorrect", or null

## Debugging Features
- **Enhanced Error Messages**: All errors include comprehensive debugging information
- **Stack Traces**: Full JavaScript error stack traces for runtime issues
- **Database Error Details**: Complete Supabase error information
- **Request Context**: Relevant parameters and operation details in all errors
- **Timestamps**: ISO 8601 formatted timestamps for error correlation
- **No Breaking 404s**: History endpoint returns empty results instead of 404 errors
