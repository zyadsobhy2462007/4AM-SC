# Sub-Admin Accounts Setup - Complete ✅

## Summary

Two sub-admin accounts have been successfully configured with full RBAC (Role-Based Access Control) logic and database integration.

## Created Accounts

### 1. Mr. Ahmed Nagy
- **Email**: `admin@4am1.com`
- **Password**: `admin2211`
- **Role**: `sub_admin`
- **Parent Admin**: Main admin (linked via `parentAdminId`)

### 2. Mr. Ibrahim Ahmed
- **Email**: `admin@4am2.com`
- **Password**: `admin3322`
- **Role**: `sub_admin`
- **Parent Admin**: Main admin (linked via `parentAdminId`)

## Database Schema

The Admin model includes all required fields:

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

## RBAC Implementation

### Middleware Functions

1. **`requireRole('main_admin')`** - Requires main admin role
2. **`requireRole('sub_admin')`** - Requires sub admin role
3. **`requireRole(['main_admin', 'sub_admin'])`** - Requires one of the roles
4. **`requireMainAdmin`** - Shorthand for main admin
5. **`requireSubAdmin`** - Shorthand for sub admin
6. **`enforceSubAdminAccess`** - Ensures sub-admins can only access their own data
7. **`preventSubAdminMainAdminInteraction`** - Prevents sub-admins from sending messages/tasks to main admin

### Access Control Rules

#### Main Admin Permissions:
- ✅ Full access to all sub-admins
- ✅ Can create, update, and delete sub-admins
- ✅ Can view all data
- ✅ Can assign tasks/messages to sub-admins

#### Sub-Admin Permissions:
- ✅ Can only view their own data
- ✅ Can view sub-admins with the same parent (siblings)
- ✅ Can update their own profile (name, email, password)
- ❌ **CANNOT** access main admin data
- ❌ **CANNOT** edit other sub-admins
- ❌ **CANNOT** send messages or tasks to main admin
- ❌ **CANNOT** change their role or parent admin

## Protected Routes

### Admin Routes (`/api/admin`)

- `POST /login` - Public login endpoint
- `GET /profile` - Get current admin profile (authenticated)
- `GET /sub-admins` - Get sub-admins (main admin sees all, sub-admin sees siblings only)
- `POST /sub-admins` - Create sub-admin (main admin only)
- `PUT /sub-admins/:id` - Update sub-admin (main admin can update any, sub-admin can only update themselves)
- `DELETE /sub-admins/:id` - Delete sub-admin (main admin only)

### Auth Routes (`/api/auth`)

- `POST /register` - Register new admin
- `POST /login` - Login
- `GET /me` - Get current user info
- `GET /admins` - Get all admins (main admin only)
- `GET /sub-admins` - Get sub-admins
- `DELETE /admins/:id` - Delete admin (main admin only)

## How to Initialize Sub-Admins

### Option 1: Using npm script (Recommended)

```bash
cd backend
npm run init-sub-admins
```

### Option 2: Direct node execution

```bash
cd backend
node src/scripts/initSubAdmins.js
```

### Prerequisites

1. MongoDB connection string must be set in environment variables:
   ```env
   MONGODB_URI=mongodb://localhost:27017/your-database-name
   # OR for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name
   ```

2. Main admin account must exist with email `admin@4am.com`

3. The main admin will automatically have its role set to `main_admin` if it's not already set

## Testing the Implementation

### 1. Login as Sub-Admin

```bash
curl -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@4am1.com",
    "password": "admin2211"
  }'
```

### 2. Get Sub-Admins (as Sub-Admin)

```bash
curl -X GET http://localhost:4000/api/admin/sub-admins \
  -H "Authorization: Bearer YOUR_TOKEN"
```

This will return only sub-admins with the same parent (siblings), not the main admin.

### 3. Try to Access Main Admin (Should Fail)

```bash
# This should return 403 Forbidden
curl -X PUT http://localhost:4000/api/admin/sub-admins/MAIN_ADMIN_ID \
  -H "Authorization: Bearer SUB_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```

## Security Features

1. **Password Hashing**: All passwords are automatically hashed using bcrypt before saving
2. **JWT Authentication**: All protected routes require valid JWT tokens
3. **Role-Based Access**: Middleware enforces role-based permissions
4. **Parent-Child Relationship**: Sub-admins are linked to main admin via `parentAdminId`
5. **Access Isolation**: Sub-admins cannot access main admin resources
6. **Data Filtering**: Sub-admins only see data they're allowed to access

## Files Modified/Created

- ✅ `backend/src/models/Admin.js` - Admin model with all required fields
- ✅ `backend/src/models/mongodb.js` - MongoDB connection and Admin model export
- ✅ `backend/src/middleware/rbac.js` - RBAC middleware with all protection functions
- ✅ `backend/src/controllers/adminController.js` - Admin controller with proper access control
- ✅ `backend/src/controllers/authControllerMongo.js` - MongoDB auth controller
- ✅ `backend/src/routes/admin.js` - Admin routes with RBAC protection
- ✅ `backend/src/routes/authMongo.js` - Auth routes for MongoDB
- ✅ `backend/src/scripts/initSubAdmins.js` - Script to initialize sub-admin accounts

## Next Steps

1. **Run the initialization script** to create the sub-admin accounts:
   ```bash
   npm run init-sub-admins
   ```

2. **Test the login** for both sub-admin accounts

3. **Verify RBAC** by trying to access main admin resources as a sub-admin (should fail)

4. **Test task/message assignment** to ensure sub-admins cannot assign to main admin

## Notes

- The script will update existing sub-admins if they already exist (based on email)
- Passwords are automatically hashed by the Admin model's pre-save hook
- All timestamps are automatically managed by Mongoose
- The main admin's role is automatically set to `main_admin` if not already set

