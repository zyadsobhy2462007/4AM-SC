const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

/**
 * Login for admin accounts (MongoDB)
 */
async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: admin._id.toString() },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );
    
    res.json({
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        parentAdminId: admin.parentAdminId
      },
      token
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}

/**
 * Get current admin profile
 */
async function getAdminProfile(req, res) {
  try {
    const admin = await Admin.findById(req.userId).select('-password').populate('parentAdminId', 'name email');
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json({ admin });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Get all sub-admins (main admin only)
 */
async function getAllSubAdmins(req, res) {
  try {
    const admin = await Admin.findById(req.userId);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    let query = {};
    
    if (admin.role === 'main_admin') {
      // Main admin can see all sub-admins
      query = { role: 'sub_admin' };
    } else if (admin.role === 'sub_admin') {
      // Sub-admin can only see sub-admins with the same parent
      query = { 
        role: 'sub_admin',
        parentAdminId: admin.parentAdminId 
      };
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const subAdmins = await Admin.find(query)
      .select('-password')
      .populate('parentAdminId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ subAdmins });
  } catch (error) {
    console.error('Get all sub-admins error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Create a new sub-admin (main admin only)
 */
async function createSubAdmin(req, res) {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    const mainAdmin = await Admin.findById(req.userId);
    
    if (!mainAdmin || mainAdmin.role !== 'main_admin') {
      return res.status(403).json({ error: 'Forbidden - Only main admin can create sub-admins' });
    }
    
    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const subAdmin = new Admin({
      name,
      email: email.toLowerCase(),
      password,
      role: 'sub_admin',
      parentAdminId: mainAdmin._id
    });
    
    await subAdmin.save();
    
    res.status(201).json({
      message: 'Sub-admin created successfully',
      subAdmin: {
        id: subAdmin._id,
        name: subAdmin.name,
        email: subAdmin.email,
        role: subAdmin.role,
        parentAdminId: subAdmin.parentAdminId
      }
    });
  } catch (error) {
    console.error('Create sub-admin error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}

/**
 * Update sub-admin (main admin only, or sub-admin updating themselves)
 */
async function updateSubAdmin(req, res) {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;
    
    const currentAdmin = await Admin.findById(req.userId);
    
    if (!currentAdmin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    const targetAdmin = await Admin.findById(id);
    
    if (!targetAdmin) {
      return res.status(404).json({ error: 'Target admin not found' });
    }
    
    // Sub-admin can only update themselves
    if (currentAdmin.role === 'sub_admin') {
      if (currentAdmin._id.toString() !== id) {
        return res.status(403).json({ error: 'Forbidden - Sub-admins can only update their own profile' });
      }
      
      // Sub-admin cannot change their role or parent
      if (name) targetAdmin.name = name;
      if (email) targetAdmin.email = email.toLowerCase();
      if (password) targetAdmin.password = password; // Will be hashed by pre-save hook
      
      await targetAdmin.save();
      
      return res.json({
        message: 'Profile updated successfully',
        admin: {
          id: targetAdmin._id,
          name: targetAdmin.name,
          email: targetAdmin.email,
          role: targetAdmin.role
        }
      });
    }
    
    // Main admin can update any sub-admin
    if (currentAdmin.role === 'main_admin') {
      if (targetAdmin.role === 'main_admin') {
        return res.status(403).json({ error: 'Cannot update main admin' });
      }
      
      if (name) targetAdmin.name = name;
      if (email) targetAdmin.email = email.toLowerCase();
      if (password) targetAdmin.password = password; // Will be hashed by pre-save hook
      
      await targetAdmin.save();
      
      return res.json({
        message: 'Sub-admin updated successfully',
        admin: {
          id: targetAdmin._id,
          name: targetAdmin.name,
          email: targetAdmin.email,
          role: targetAdmin.role,
          parentAdminId: targetAdmin.parentAdminId
        }
      });
    }
    
    return res.status(403).json({ error: 'Forbidden' });
  } catch (error) {
    console.error('Update sub-admin error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Delete sub-admin (main admin only)
 */
async function deleteSubAdmin(req, res) {
  try {
    const { id } = req.params;
    
    const currentAdmin = await Admin.findById(req.userId);
    
    if (!currentAdmin || currentAdmin.role !== 'main_admin') {
      return res.status(403).json({ error: 'Forbidden - Only main admin can delete sub-admins' });
    }
    
    if (currentAdmin._id.toString() === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const targetAdmin = await Admin.findById(id);
    
    if (!targetAdmin) {
      return res.status(404).json({ error: 'Sub-admin not found' });
    }
    
    if (targetAdmin.role === 'main_admin') {
      return res.status(403).json({ error: 'Cannot delete main admin' });
    }
    
    await Admin.findByIdAndDelete(id);
    
    res.json({ message: 'Sub-admin deleted successfully' });
  } catch (error) {
    console.error('Delete sub-admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  adminLogin,
  getAdminProfile,
  getAllSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin
};

