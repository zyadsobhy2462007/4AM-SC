# Project Structure

This document describes the clean, organized structure of the 4AM Management System after cleanup.

## Directory Tree

```
4AM_System/
├── README.md                    # Main project documentation
├── PROJECT_STRUCTURE.md        # This file - project structure documentation
├── .gitignore                  # Git ignore rules
│
└── backend/                     # Backend application
    ├── README_DEPLOY.md        # Deployment guide
    ├── package.json            # Node.js dependencies
    ├── Dockerfile              # Docker configuration
    ├── docker-compose.yml      # Docker Compose configuration
    │
    ├── data/                   # SQLite database storage (gitignored)
    │   └── database.sqlite
    │
    └── src/                    # Source code
        ├── index.js           # Application entry point
        │
        ├── controllers/       # Route controllers
        │   ├── authController.js    # Authentication logic
        │   └── tasksController.js   # Task management logic
        │
        ├── middleware/         # Express middleware
        │   ├── auth.js             # JWT authentication
        │   └── validation.js       # Input validation
        │
        ├── models/             # Database models
        │   └── db.js          # Database connection & initialization
        │
        ├── routes/             # API routes
        │   ├── auth.js         # Authentication routes
        │   └── tasks.js        # Task routes
        │
        └── public/             # Frontend static files
            ├── index.html.html    # Main application page
            ├── login.html         # Login page
            ├── register.html      # Registration page
            ├── dashboard.html     # Simple dashboard
            ├── language.html      # Language selection
            │
            ├── main.css           # Main stylesheet
            ├── styles.css         # Additional styles
            ├── 4am-styles.css     # 4AM specific styles
            ├── dashboard-styles.css # Dashboard styles
            │
            └── lang.js            # Language translations
```

## File Organization

### Backend Code
- **Controllers**: Handle business logic and database operations
- **Middleware**: Authentication and input validation
- **Models**: Database connection and initialization
- **Routes**: API endpoint definitions
- **index.js**: Application entry point and server setup

### Frontend Files
- **HTML files**: Main pages (index, login, register, dashboard)
- **CSS files**: Styling (multiple files for organization)
- **JavaScript**: Language translations and client-side logic (embedded in HTML)

### Configuration Files
- **package.json**: Node.js dependencies and scripts
- **Dockerfile**: Docker image configuration
- **docker-compose.yml**: Docker Compose service configuration
- **.env**: Environment variables (not in repo, see .env.example)

### Documentation
- **README.md**: Main project documentation
- **README_DEPLOY.md**: Deployment guide
- **PROJECT_STRUCTURE.md**: This file

## Cleanup Summary

The following were removed during cleanup:
- ✅ Duplicate `frontend/` folder
- ✅ Unused JavaScript files (admin-dashboard.js, assistant-dashboard.js, etc.)
- ✅ Firebase-related files (not used)
- ✅ Unnecessary markdown documentation in public folder
- ✅ Old documentation files scattered throughout

## What Remains

### Essential Files Only
- Production code (controllers, routes, models, middleware)
- Frontend static files (HTML, CSS, JS)
- Configuration files (Docker, package.json)
- Essential documentation (README files)

### Database
- SQLite database stored in `backend/data/` (gitignored)
- Automatic migration support for existing databases

## Best Practices

1. **Separation of Concerns**: Controllers handle logic, routes define endpoints
2. **Middleware Pattern**: Reusable auth and validation middleware
3. **Database Abstraction**: Single db.js handles multiple database types
4. **Static Files**: All frontend files in public folder
5. **Documentation**: Centralized in root and backend folders

## Deployment Ready

The project is now organized and ready for deployment:
- ✅ Clean structure
- ✅ No duplicate files
- ✅ Proper .gitignore
- ✅ Comprehensive documentation
- ✅ Docker support
- ✅ Environment variable configuration

