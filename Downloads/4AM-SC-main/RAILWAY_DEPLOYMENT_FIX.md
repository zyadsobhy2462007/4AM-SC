# Railway Deployment Fix Guide

## Problem Analysis

Your deployment is failing because Railway's build system (Railpack) is analyzing the **root directory** of your repository, but your application code is in the **`backend/`** folder.

### Error Explanation

The error shows:
```
⚠ Script start.sh not found
✖ Railpack could not determine how to build the app.
```

This happens because:
1. Railway is looking at the repository root (`/`)
2. Your `package.json` and `Dockerfile` are in `backend/`
3. Railway can't find the Node.js application configuration

## Solutions

### Solution 1: Set Root Directory in Railway Dashboard (Recommended)

This is the easiest and most reliable solution:

1. **Go to Railway Dashboard**
   - Open your project
   - Click on your service

2. **Open Settings**
   - Click the "Settings" tab
   - Scroll to "Root Directory"

3. **Set Root Directory**
   - Change from `/` to `backend`
   - Click "Update Settings"

4. **Redeploy**
   - Railway will now look in the `backend/` folder
   - It will find `package.json` and `Dockerfile`
   - Build should succeed

### Solution 2: Use Railway Configuration File

I've created `railway.json` and `railway.toml` in the root directory. These tell Railway:
- Where to find the Dockerfile (`backend/Dockerfile`)
- How to start the application

Railway should automatically detect these files. If it doesn't, use Solution 1 instead.

### Solution 3: Manual Railway CLI Configuration

If you're using Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set root directory
railway settings set rootDirectory=backend

# Deploy
railway up
```

## Common Railway Deployment Issues & Fixes

### Issue 1: Build Fails - Can't Find package.json

**Error:**
```
npm ERR! code ENOLOCAL
npm ERR! Could not install from "backend" as it does not contain a package.json.
```

**Fix:** Set Root Directory to `backend` in Railway settings (Solution 1 above)

---

### Issue 2: Port Configuration Error

**Error:**
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Fix:** 
- Railway automatically sets `PORT` environment variable
- Update your code to use `process.env.PORT` (it should already do this)
- The Dockerfile uses `${PORT:-4000}` which is correct

---

### Issue 3: Database Connection Failed

**Error:**
```
Error: connect ECONNREFUSED
```

**Fix:**
1. Add PostgreSQL database in Railway
2. Railway automatically sets `DATABASE_URL`
3. Verify in Variables tab that `DATABASE_URL` exists
4. Check the connection string format

---

### Issue 4: Missing Environment Variables

**Error:**
```
Error: JWT_SECRET is not defined
```

**Fix:**
1. Go to Service → Variables tab
2. Add `JWT_SECRET` with a secure random string:
   ```bash
   # Generate secret:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Add other required variables

---

### Issue 5: Docker Build Context Error

**Error:**
```
COPY failed: file not found in build context
```

**Fix:** 
- The Dockerfile is updated to use relative paths correctly
- Make sure Root Directory is set to `backend`
- The Dockerfile copies `src/` folder correctly

---

### Issue 6: Module Not Found After Build

**Error:**
```
Error: Cannot find module 'express'
```

**Fix:**
- Make sure `npm ci --production` runs successfully
- Check that `package.json` is in the root directory (after setting root to `backend`)
- Verify all dependencies are listed in `package.json`

## Step-by-Step Railway Deployment

### 1. Initial Setup

```bash
# In Railway Dashboard:
1. New Project → Deploy from GitHub
2. Connect your repository
3. Select your repository
```

### 2. Configure Service

```bash
Service Settings:
- Root Directory: backend
- Build Command: (leave empty, uses Dockerfile)
- Start Command: node src/index.js (or leave empty)
```

### 3. Add Database (Optional but Recommended)

```bash
1. Click "New" → "Database" → "PostgreSQL"
2. Railway sets DATABASE_URL automatically
```

### 4. Set Environment Variables

```bash
Required:
- JWT_SECRET: <generate secure random string>

Optional:
- NODE_ENV: production
- PORT: (auto-set by Railway)
- DATABASE_URL: (auto-set if PostgreSQL added)
```

### 5. Deploy

```bash
1. Click "Deploy" button
2. Or push to your connected branch
3. Watch build logs
```

### 6. Verify Deployment

```bash
1. Check "Deployments" tab for success
2. Click on your service to see logs
3. Generate public domain in Settings
4. Visit your URL
```

## Troubleshooting Checklist

- [ ] Root Directory set to `backend`?
- [ ] `JWT_SECRET` environment variable set?
- [ ] PostgreSQL database added (if using)?
- [ ] `DATABASE_URL` set automatically?
- [ ] Build logs show successful npm install?
- [ ] Application starts without errors?
- [ ] Public domain generated?
- [ ] Can access login page?

## Quick Fix Summary

**The main fix for your error:**

1. Open Railway Dashboard
2. Go to Service → Settings
3. Set **Root Directory** to `backend`
4. Save and redeploy

That's it! Railway will now find your `package.json`, `Dockerfile`, and application code.

## Need More Help?

Check build logs in Railway Dashboard → Deployments → View Logs

Common log locations:
- Build logs: Shows npm install and Docker build
- Deployment logs: Shows application startup
- Runtime logs: Shows application errors

