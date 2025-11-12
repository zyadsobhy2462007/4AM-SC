const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models/mongodb');
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

async function register(req, res) {
  try {
    const { name, email, password, role, parentAdminId } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    // Validate role
    const validRoles = ['main_admin', 'sub_admin'];
    const userRole = role && validRoles.includes(role) ? role : 'sub_admin';

    // If creating a sub_admin, parentAdminId is required
    if (userRole === 'sub_admin' && !parentAdminId) {
      return res.status(400).json({ error: 'parentAdminId required for sub_admin role' });
    }

    // Check if parent admin exists (if sub_admin)
    if (userRole === 'sub_admin') {
      const parentAdmin = await Admin.findById(parentAdminId);
      if (!parentAdmin || parentAdmin.role !== 'main_admin') {
        return res.status(400).json({ error: 'invalid parent admin' });
      }
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ error: 'email already registered' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create admin
    const admin = new Admin({
      name: name || null,
      email: email.toLowerCase(),
      password: hash,
      role: userRole,
      parentAdminId: userRole === 'sub_admin' ? parentAdminId : null
    });

    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Return admin (without password)
    const adminResponse = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      parentAdminId: admin.parentAdminId,
      createdAt: admin.createdAt
    };

    res.status(201).json({ user: adminResponse, token });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'email already registered' });
    }
    res.status(500).json({ 
      error: 'server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!admin) {
      return res.status(400).json({ error: 'invalid credentials' });
    }

    // Verify password
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(400).json({ error: 'invalid credentials' });
    }

    // Generate JWT token with role
    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Return admin (without password)
    const adminResponse = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      parentAdminId: admin.parentAdminId,
      createdAt: admin.createdAt
    };

    res.json({ user: adminResponse, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      error: 'server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}

async function me(req, res) {
  try {
    const userId = req.userId;
    
    const admin = await Admin.findById(userId).select('-password');
    
    if (!admin) {
      return res.status(404).json({ error: 'user not found' });
    }

    const adminResponse = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      parentAdminId: admin.parentAdminId,
      createdAt: admin.createdAt
    };

    res.json({ user: adminResponse });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ 
      error: 'server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}

async function getAllAdmins(req, res) {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.userRole;

    // Only main_admin can see all admins
    if (currentUserRole !== 'main_admin') {
      return res.status(403).json({ error: 'forbidden - main admin access required' });
    }

    // Get all admins
    const admins = await Admin.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ admins });
  } catch (err) {
    console.error('Get all admins error:', err);
    res.status(500).json({ 
      error: 'server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}

async function getSubAdmins(req, res) {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.userRole;

    // Main admin can see all sub-admins
    // Sub-admin can only see themselves
    if (currentUserRole === 'main_admin') {
      const subAdmins = await Admin.find({ role: 'sub_admin' })
        .select('-password')
        .populate('parentAdminId', 'name email')
        .sort({ createdAt: -1 });
      return res.json({ admins: subAdmins });
    } else if (currentUserRole === 'sub_admin') {
      const subAdmin = await Admin.findById(currentUserId)
        .select('-password')
        .populate('parentAdminId', 'name email');
      return res.json({ admins: [subAdmin] });
    } else {
      return res.status(403).json({ error: 'forbidden' });
    }
  } catch (err) {
    console.error('Get sub-admins error:', err);
    res.status(500).json({ 
      error: 'server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}

async function deleteAdmin(req, res) {
  try {
    const requesterId = req.userId;
    const requesterRole = req.userRole;
    const { id } = req.params;

    // Only main admin can delete
    if (requesterRole !== 'main_admin') {
      return res.status(403).json({ error: 'forbidden - main admin access required' });
    }

    // Cannot delete yourself
    if (id === requesterId.toString()) {
      return res.status(400).json({ error: 'cannot delete your own account' });
    }

    // Find target admin
    const targetAdmin = await Admin.findById(id);
    
    if (!targetAdmin) {
      return res.status(404).json({ error: 'admin not found' });
    }

    // Cannot delete main admin
    if (targetAdmin.role === 'main_admin') {
      return res.status(400).json({ error: 'cannot delete main admin accounts' });
    }

    // Delete the admin
    await Admin.findByIdAndDelete(id);

    return res.json({ success: true, message: 'admin deleted successfully' });
  } catch (err) {
    console.error('Delete admin error:', err);
    res.status(500).json({ 
      error: 'server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}

module.exports = {
  register,
  login,
  me,
  getAllAdmins,
  getSubAdmins,
  deleteAdmin
};


