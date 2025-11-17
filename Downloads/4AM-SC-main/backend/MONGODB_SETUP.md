# MongoDB Admin Setup Guide

This guide explains how to set up and use the MongoDB-based admin system with RBAC (Role-Based Access Control).

## Prerequisites

1. MongoDB database (local or cloud)
2. Node.js and npm installed
3. Environment variables configured

## Environment Variables

Add the following to your `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/your-database-name
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name

JWT_SECRET=your-secret-key-here
```

## Installation

1. Install dependencies:
```bash
npm install
```

This will install `mongoose` along with other dependencies.

## Database Setup

### 1. Ensure Main Admin Exists

The main admin account should already exist in your database with:
- Email: `admin@4am.com`
- Role: `main_admin`

If it doesn't exist, create it manually or ensure your existing main admin has the `role` field set to `main_admin`.

### 2. Initialize Sub-Admin Accounts

Run the initialization script to create the two sub-admin accounts:

```bash
node src/scripts/initSubAdmins.js
```

This will create:
- **Mr. Ahmed Nagy**
  - Email: `admin@4am1.com`
  - Password: `admin2211`
  - Role: `sub_admin`
  - Parent: Main admin

- **Mr. Ibrahim Ahmed**
  - Email: `admin@4am2.com`
  - Password: `admin3322`
  - Role: `sub_admin`
  - Parent: Main admin

## API Endpoints

### Admin Authentication

**POST** `/api/admin/login`
- Login for admin accounts
- Body: `{ "email": "admin@4am1.com", "password": "admin2211" }`
- Returns: `{ user: {...}, token: "..." }`

**GET** `/api/admin/profile`
- Get current admin profile
- Requires: Bearer token
- Returns: `{ admin: {...} }`

### Sub-Admin Management (Main Admin Only)

**GET** `/api/admin/sub-admins`
- Get all sub-admins
- Requires: Bearer token
- Main admin sees all sub-admins
- Sub-admin sees only sub-admins with same parent

**POST** `/api/admin/sub-admins`
- Create a new sub-admin
- Requires: Main admin role
- Body: `{ "name": "...", "email": "...", "password": "..." }`

**PUT** `/api/admin/sub-admins/:id`
- Update a sub-admin
- Main admin can update any sub-admin
- Sub-admin can only update themselves

**DELETE** `/api/admin/sub-admins/:id`
- Delete a sub-admin
- Requires: Main admin role

## RBAC Middleware

The following middleware functions are available:

- `requireRole('main_admin')` - Requires main admin role
- `requireRole('sub_admin')` - Requires sub admin role
- `requireRole(['main_admin', 'sub_admin'])` - Requires one of the roles
- `requireMainAdmin` - Shorthand for main admin
- `requireSubAdmin` - Shorthand for sub admin
- `enforceSubAdminAccess` - Ensures sub-admins can only access their own data

## Usage Example

```javascript
const { requireMainAdmin, requireSubAdmin } = require('./middleware/rbac');
const { authMiddleware } = require('./middleware/auth');

// Main admin only route
router.get('/admin-only', authMiddleware, requireMainAdmin, handler);

// Sub-admin only route
router.get('/sub-admin-only', authMiddleware, requireSubAdmin, handler);

// Both can access
router.get('/both', authMiddleware, requireRole(['main_admin', 'sub_admin']), handler);
```

## Security Rules

1. **Main Admin**:
   - Full access to all sub-admins
   - Can create, update, and delete sub-admins
   - Can view all data

2. **Sub-Admin**:
   - Can only view their own data
   - Can only view sub-admins with the same parent
   - Cannot access main admin data
   - Cannot edit other sub-admins
   - Can update their own profile

## Database Schema

The Admin model has the following structure:

```javascript
{
  name: String,
  email: String (unique, lowercase),
  password: String (hashed),
  role: 'main_admin' | 'sub_admin',
  parentAdminId: ObjectId (reference to Admin, null for main admin),
  createdAt: Date
}
```

## Troubleshooting

1. **Connection Error**: Ensure MongoDB is running and `MONGODB_URI` is correct
2. **Main Admin Not Found**: Run the initialization script or create the main admin manually
3. **Permission Denied**: Check that the JWT token includes the correct user ID and the user has the required role

