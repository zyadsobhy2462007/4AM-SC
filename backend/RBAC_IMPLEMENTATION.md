# RBAC Implementation Guide

This document explains the Role-Based Access Control (RBAC) implementation for the admin system with MongoDB.

## Overview

The system implements a hierarchical admin structure with:
- **main_admin**: Top-level administrator with full permissions
- **sub_admin**: Sub-administrators linked to a main admin, with restricted permissions

## Database Model

The `Admin` model includes the following fields:

```javascript
{
  name: String,
  email: String (unique, lowercase),
  password: String (hashed with bcrypt),
  role: { type: String, enum: ['main_admin', 'sub_admin'], default: 'sub_admin' },
  parentAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  createdAt: { type: Date, default: Date.now }
}
```

## Setup Instructions

### 1. Install Dependencies

Make sure `mongoose` is installed:

```bash
npm install
```

### 2. Configure MongoDB Connection

Set the MongoDB connection string in your environment variables:

```bash
# Option 1: Use MONGODB_URI
export MONGODB_URI="mongodb://localhost:27017/4am-system"

# Option 2: Use DATABASE_URL (will be used if MONGODB_URI is not set)
export DATABASE_URL="mongodb://localhost:27017/4am-system"

# For MongoDB Atlas (cloud)
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/4am-system"
```

### 3. Ensure Main Admin Exists

The main admin account should already exist in your MongoDB database with:
- Email: `admin@4am.com`
- Role: `main_admin` (or will be updated automatically)

### 4. Initialize Sub-Admins

Run the initialization script to create the two sub-admin accounts:

```bash
npm run init-sub-admins
```

This will create:
1. **Mr. Ahmed Nagy**
   - Email: `admin@4am1.com`
   - Password: `admin2211`
   - Role: `sub_admin`
   - Linked to main admin via `parentAdminId`

2. **Mr. Ibrahim Ahmed**
   - Email: `admin@4am2.com`
   - Password: `admin3322`
   - Role: `sub_admin`
   - Linked to main admin via `parentAdminId`

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register a new admin (requires proper role setup)
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/me` - Get current user info (requires authentication)

### Admin Management Endpoints

- `GET /api/auth/admins` - Get all admins (requires `main_admin` role)
- `GET /api/auth/sub-admins` - Get sub-admins (requires `main_admin` or `sub_admin` role)
- `DELETE /api/auth/admins/:id` - Delete an admin (requires `main_admin` role)

## RBAC Middleware

### `requireRole(role)`

Protects routes to require a specific role or array of roles.

**Usage:**
```javascript
const { requireRole } = require('./middleware/rbac');

// Require main_admin role
router.get('/admins', authMiddleware, requireRole('main_admin'), getAllAdmins);

// Require either main_admin or sub_admin
router.get('/sub-admins', authMiddleware, requireRole(['main_admin', 'sub_admin']), getSubAdmins);
```

### `preventSubAdminAccessToMainAdmin`

Prevents sub-admins from accessing or modifying main admin resources.

**Usage:**
```javascript
const { preventSubAdminAccessToMainAdmin } = require('./middleware/rbac');

router.delete('/admins/:id', 
  authMiddleware, 
  requireRole('main_admin'), 
  preventSubAdminAccessToMainAdmin, 
  deleteAdmin
);
```

## Permission Rules

### Main Admin (`main_admin`)
- ✅ Can view all admins and sub-admins
- ✅ Can create, update, and delete sub-admins
- ✅ Can view all data
- ✅ Can assign tasks to sub-admins
- ✅ Can send messages to sub-admins
- ❌ Cannot be deleted or modified by sub-admins

### Sub Admin (`sub_admin`)
- ✅ Can view their own data
- ✅ Can receive tasks and messages from main admin
- ✅ Can view their own profile
- ❌ Cannot view or modify main admin
- ❌ Cannot send messages to main admin
- ❌ Cannot delete or modify other admins
- ❌ Cannot view other sub-admins (unless explicitly allowed)

## JWT Token Structure

The JWT token includes:
```javascript
{
  userId: ObjectId,  // Admin's MongoDB _id
  role: 'main_admin' | 'sub_admin',
  exp: timestamp
}
```

## Example Usage

### Login as Sub-Admin

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@4am1.com",
    "password": "admin2211"
  }'
```

Response:
```json
{
  "user": {
    "id": "...",
    "name": "Mr. Ahmed Nagy",
    "email": "admin@4am1.com",
    "role": "sub_admin",
    "parentAdminId": "...",
    "createdAt": "..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get All Admins (Main Admin Only)

```bash
curl -X GET http://localhost:4000/api/auth/admins \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Sub-Admins

```bash
curl -X GET http://localhost:4000/api/auth/sub-admins \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security Notes

1. **Password Hashing**: All passwords are hashed using bcrypt with configurable salt rounds (default: 10)
2. **JWT Expiration**: Tokens expire after 7 days
3. **Role Validation**: All protected routes validate the user's role from the database, not just the JWT token
4. **Parent-Child Relationship**: Sub-admins are always linked to a main admin via `parentAdminId`

## Troubleshooting

### MongoDB Connection Issues

If you see connection errors:
1. Verify your MongoDB connection string is correct
2. Ensure MongoDB is running
3. Check network connectivity for remote MongoDB instances
4. Verify authentication credentials if using MongoDB Atlas

### Sub-Admins Not Created

If the initialization script fails:
1. Ensure the main admin exists in the database
2. Check MongoDB connection
3. Verify the main admin email is exactly `admin@4am.com`
4. Check console logs for specific error messages

### Permission Denied Errors

If you get 403 Forbidden errors:
1. Verify your JWT token is valid and not expired
2. Check that your user has the required role in the database
3. Ensure you're using the correct endpoint for your role level

