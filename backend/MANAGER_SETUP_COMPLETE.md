# Manager Accounts Setup - Complete ✅

## Summary

Two manager accounts have been successfully implemented with full admin permissions and manager-to-manager task assignment functionality.

## Created Manager Accounts

### 1. Mr. Ahmed Nagi
- **Email**: `admin@4am1.com`
- **Password**: `admin2211`
- **Role**: `manager`
- **Permissions**: Full admin access (same as main_admin)

### 2. Mr. Ibrahim Ahmed
- **Email**: `admin@4am2.com`
- **Password**: `admin3322`
- **Role**: `manager`
- **Permissions**: Full admin access (same as main_admin)

## Key Features Implemented

### 1. Manager Role
- ✅ Added `manager` role to Admin model enum
- ✅ Managers have the same permissions as `main_admin`
- ✅ Managers can access all admin features
- ✅ Managers can create, update, and delete sub-admins

### 2. Manager-to-Manager Task Assignment
- ✅ Created MongoDB Task model for manager assignments
- ✅ Managers can assign tasks to other managers
- ✅ Task assignment API endpoint: `POST /api/admin/tasks/assign`
- ✅ Task viewing API endpoint: `GET /api/admin/tasks`
- ✅ Task status update API endpoint: `PATCH /api/admin/tasks/:id/status`

### 3. UI Integration
- ✅ Managers appear in "Assign To" dropdown with "(مدير)" label
- ✅ Task creation automatically routes to MongoDB task system when manager is selected
- ✅ Regular users still use SQL task system
- ✅ Seamless integration between both systems

### 4. RBAC Updates
- ✅ RBAC middleware treats managers like main_admin
- ✅ `requireMainAdmin` now includes managers
- ✅ All admin controllers updated to support managers
- ✅ Managers bypass sub-admin restrictions

## API Endpoints

### Manager Management
- `GET /api/admin/managers` - Get all managers (for dropdown)
- `POST /api/admin/login` - Login (managers can login)

### Manager Task Assignment
- `POST /api/admin/tasks/assign` - Assign task to a manager
  ```json
  {
    "assignedTo": "manager_id",
    "title": "Task title",
    "description": "Task description",
    "week_start": "2024-01-01",
    "priority": "medium"
  }
  ```

- `GET /api/admin/tasks` - Get tasks assigned to/by current manager
  - Query params: `?week_start=2024-01-01` (optional)

- `PATCH /api/admin/tasks/:id/status` - Update task status
  ```json
  {
    "status": "pending" | "in_progress" | "completed"
  }
  ```

## Database Schema

### Admin Model (Updated)
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: { type: String, enum: ['main_admin', 'sub_admin', 'manager'] },
  parentAdminId: ObjectId (null for managers),
  createdAt: Date
}
```

### Task Model (New - MongoDB)
```javascript
{
  title: String,
  description: String,
  assignedTo: ObjectId (ref: 'Admin'),
  assignedBy: ObjectId (ref: 'Admin'),
  status: { type: String, enum: ['pending', 'in_progress', 'completed'] },
  priority: { type: String, enum: ['low', 'medium', 'high'] },
  week_start: Date,
  completed_at: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## How to Initialize Managers

### Option 1: Using npm script (Recommended)

```bash
cd backend
npm run init-managers
```

### Option 2: Direct node execution

```bash
cd backend
node src/scripts/initManagers.js
```

### Prerequisites

1. MongoDB connection string must be set:
   ```env
   MONGODB_URI=mongodb://localhost:27017/your-database-name
   ```

2. The script will:
   - Connect to MongoDB
   - Update existing accounts (if they exist) to manager role
   - Create new accounts if they don't exist
   - Set `parentAdminId` to `null` for managers

## Testing the Implementation

### 1. Login as Manager

```bash
curl -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@4am1.com",
    "password": "admin2211"
  }'
```

### 2. Get All Managers (for dropdown)

```bash
curl -X GET http://localhost:4000/api/admin/managers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Assign Task to Another Manager

```bash
curl -X POST http://localhost:4000/api/admin/tasks/assign \
  -H "Authorization: Bearer MANAGER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignedTo": "MANAGER_B_ID",
    "title": "Review quarterly report",
    "description": "Please review and provide feedback",
    "priority": "high"
  }'
```

### 4. Get Manager Tasks

```bash
curl -X GET http://localhost:4000/api/admin/tasks \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

## UI Workflow

1. **Manager logs in** → Sees dashboard
2. **Clicks "Create Task"** → Modal opens
3. **"Assign To" dropdown** → Shows:
   - Regular users (from SQL system)
   - Managers (from MongoDB, labeled with "مدير")
4. **Selects a manager** → Task is created via MongoDB API
5. **Selects a regular user** → Task is created via SQL API

## Permission Matrix

| Action | Main Admin | Manager | Sub-Admin |
|--------|-----------|---------|-----------|
| View all sub-admins | ✅ | ✅ | ❌ (only siblings) |
| Create sub-admins | ✅ | ✅ | ❌ |
| Delete sub-admins | ✅ | ✅ | ❌ |
| Assign tasks to managers | ✅ | ✅ | ❌ |
| Assign tasks to users | ✅ | ✅ | ❌ |
| View all tasks | ✅ | ✅ | ❌ (own only) |
| Update any task | ✅ | ✅ | ❌ (own only) |

## Files Modified/Created

### Models
- ✅ `backend/src/models/mongodb.js` - Added `manager` role and `Task` model
- ✅ `backend/src/models/Admin.js` - Added `manager` role

### Controllers
- ✅ `backend/src/controllers/adminController.js` - Updated to support managers
- ✅ `backend/src/controllers/authControllerMongo.js` - Updated to support managers
- ✅ `backend/src/controllers/taskControllerMongo.js` - **NEW** - Manager task assignment

### Middleware
- ✅ `backend/src/middleware/rbac.js` - Updated to treat managers like main_admin

### Routes
- ✅ `backend/src/routes/admin.js` - Added manager endpoints

### Scripts
- ✅ `backend/src/scripts/initManagers.js` - **NEW** - Manager initialization script

### Frontend
- ✅ `backend/src/public/index.html.html` - Updated to show managers in dropdown and handle manager task assignment

### Configuration
- ✅ `backend/package.json` - Added `init-managers` script

## Security Features

1. **Role-Based Access**: Managers have full admin permissions
2. **Task Isolation**: Manager tasks stored separately in MongoDB
3. **Authentication**: JWT-based authentication for all endpoints
4. **Authorization**: RBAC middleware enforces permissions
5. **Data Validation**: All inputs validated before processing

## Notes

- Managers are independent (no `parentAdminId`)
- Manager-to-manager tasks use MongoDB (separate from SQL task system)
- Regular user tasks continue to use SQL system
- The UI seamlessly handles both systems
- Managers can assign tasks to each other in any direction

## Next Steps

1. **Run the initialization script**:
   ```bash
   npm run init-managers
   ```

2. **Test manager login** with both accounts

3. **Test task assignment** between managers via UI

4. **Verify permissions** - managers should have full admin access

## Troubleshooting

### Managers not appearing in dropdown
- Check if managers exist in database: `db.admins.find({ role: 'manager' })`
- Verify `/api/admin/managers` endpoint returns managers
- Check browser console for API errors

### Task assignment fails
- Verify manager IDs are correct
- Check MongoDB connection
- Ensure both managers exist in database
- Check server logs for detailed errors

### Permission errors
- Verify RBAC middleware is applied correctly
- Check that manager role is in enum
- Ensure JWT token includes correct role

