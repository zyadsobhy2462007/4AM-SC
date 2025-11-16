const jwt = require('jsonwebtoken');
const { Admin } = require('../models/mongodb');

/**
 * Middleware to require a specific role
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
function requireRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      // Get token from Authorization header
      const auth = req.headers.authorization;
      if (!auth) {
        return res.status(401).json({ error: 'missing authorization header' });
      }

      const parts = auth.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'invalid authorization format' });
      }

      const token = parts[1];
      
      // Verify JWT token
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      } catch (err) {
        return res.status(401).json({ error: 'invalid token' });
      }

      // Get user from database to check current role
      const admin = await Admin.findById(payload.userId).select('role parentAdminId');
      
      if (!admin) {
        return res.status(401).json({ error: 'user not found' });
      }

      // Normalize allowedRoles to array
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      // Check if user has required role
      if (!roles.includes(admin.role)) {
        return res.status(403).json({ 
          error: 'forbidden - insufficient permissions',
          required: roles,
          current: admin.role
        });
      }

      // Attach user info to request
      req.userId = payload.userId;
      req.userRole = admin.role;
      req.userParentAdminId = admin.parentAdminId;

      next();
    } catch (err) {
      console.error('RBAC middleware error:', err);
      return res.status(500).json({ error: 'server error' });
    }
  };
}

/**
 * Middleware to require main_admin role
 */
function requireMainAdmin(req, res, next) {
  return requireRole('main_admin')(req, res, next);
}

/**
 * Middleware to require sub_admin role
 */
function requireSubAdmin(req, res, next) {
  return requireRole('sub_admin')(req, res, next);
}

/**
 * Middleware to check if user is main admin or sub-admin under a specific main admin
 */
async function requireMainAdminOrSubAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: 'missing authorization header' });
    }

    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'invalid authorization format' });
    }

    const token = parts[1];
    
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (err) {
      return res.status(401).json({ error: 'invalid token' });
    }

    const admin = await Admin.findById(payload.userId).select('role parentAdminId');
    
    if (!admin) {
      return res.status(401).json({ error: 'user not found' });
    }

    if (admin.role !== 'main_admin' && admin.role !== 'sub_admin') {
      return res.status(403).json({ error: 'forbidden - admin access required' });
    }

    req.userId = payload.userId;
    req.userRole = admin.role;
    req.userParentAdminId = admin.parentAdminId;

    next();
  } catch (err) {
    console.error('RBAC middleware error:', err);
    return res.status(500).json({ error: 'server error' });
  }
}

/**
 * Middleware to prevent sub-admins from accessing main admin resources
 */
async function preventSubAdminAccessToMainAdmin(req, res, next) {
  try {
    if (req.userRole === 'sub_admin') {
      // Get the target user ID from params or body
      const targetId = req.params.id || req.body.id || req.body.userId;
      
      if (targetId) {
        const targetAdmin = await Admin.findById(targetId).select('role');
        
        if (targetAdmin && targetAdmin.role === 'main_admin') {
          return res.status(403).json({ 
            error: 'forbidden - sub-admins cannot access main admin resources' 
          });
        }
      }
    }
    next();
  } catch (err) {
    console.error('Prevent sub-admin access error:', err);
    return res.status(500).json({ error: 'server error' });
  }
}

/**
 * Middleware to enforce sub-admin access restrictions
 * - Sub-admins can only access their own resources
 * - Main admins can access any sub-admin resources
 */
async function enforceSubAdminAccess(req, res, next) {
  try {
    const currentAdmin = await Admin.findById(req.userId).select('role parentAdminId');
    
    if (!currentAdmin) {
      return res.status(401).json({ error: 'user not found' });
    }

    // Attach to request for use in controllers
    req.userRole = currentAdmin.role;
    req.userParentAdminId = currentAdmin.parentAdminId;

    // If sub-admin, they can only access their own resources
    if (currentAdmin.role === 'sub_admin') {
      const targetId = req.params.id || req.body.id || req.body.userId;
      
      if (targetId && targetId !== req.userId.toString()) {
        // Check if target is a sub-admin under the same parent
        const targetAdmin = await Admin.findById(targetId).select('role parentAdminId');
        
        if (!targetAdmin) {
          return res.status(404).json({ error: 'target not found' });
        }

        // Sub-admin cannot access main admin
        if (targetAdmin.role === 'main_admin') {
          return res.status(403).json({ 
            error: 'forbidden - sub-admins cannot access main admin resources' 
          });
        }

        // Sub-admin can only access sub-admins under the same parent
        if (targetAdmin.role === 'sub_admin') {
          if (targetAdmin.parentAdminId?.toString() !== currentAdmin.parentAdminId?.toString()) {
            return res.status(403).json({ 
              error: 'forbidden - can only access sub-admins under the same parent admin' 
            });
          }
        }
      }
    }

    next();
  } catch (err) {
    console.error('Enforce sub-admin access error:', err);
    return res.status(500).json({ error: 'server error' });
  }
}

module.exports = {
  requireRole,
  requireMainAdmin,
  requireSubAdmin,
  requireMainAdminOrSubAdmin,
  preventSubAdminAccessToMainAdmin,
  enforceSubAdminAccess
};
