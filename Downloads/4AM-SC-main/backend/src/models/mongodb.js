const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/4am-system';

let isConnected = false;

async function connectMongoDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  if (!MONGODB_URI || (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://'))) {
    throw new Error('MongoDB connection string not found or invalid. Please set MONGODB_URI or DATABASE_URL environment variable with a valid MongoDB connection string.');
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('✅ MongoDB connected successfully');
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });

    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Admin Schema
const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['main_admin', 'sub_admin'],
    default: 'sub_admin'
  },
  parentAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
adminSchema.index({ email: 1 });
adminSchema.index({ parentAdminId: 1 });
adminSchema.index({ role: 1 });

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get user without password
adminSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

// Initialize MongoDB connection
async function initMongoDB() {
  try {
    await connectMongoDB();
    
    // Check if main admin exists
    const mainAdmin = await Admin.findOne({ email: 'admin@4am.com' });
    
    if (!mainAdmin) {
      console.log('⚠️  Main admin (admin@4am.com) not found in database.');
      console.log('   Please ensure the main admin account exists before using the system.');
    } else {
      // Ensure main admin has correct role
      if (mainAdmin.role !== 'main_admin') {
        mainAdmin.role = 'main_admin';
        await mainAdmin.save();
        console.log('✅ Updated main admin role to main_admin');
      }
      console.log('✅ Main admin found:', mainAdmin.email);
    }
    
    // Create Manager 1: Ahmed Nagi (if it doesn't exist)
    try {
      const manager1 = await Admin.findOne({ email: 'admin@4am1.com' });
      if (!manager1) {
        const bcrypt = require('bcrypt');
        const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
        const manager1PasswordHash = await bcrypt.hash('admin2211', SALT_ROUNDS);
        const newManager1 = new Admin({
          name: 'Mr. Ahmed Nagi',
          email: 'admin@4am1.com',
          password: manager1PasswordHash,
          role: 'main_admin', // Full admin access
          parentAdminId: null
        });
        await newManager1.save();
        console.log('✅ Manager 1 account created: admin@4am1.com / admin2211');
      } else {
        // Update existing manager to ensure correct role and name
        if (manager1.role !== 'main_admin' || manager1.name !== 'Mr. Ahmed Nagi') {
          manager1.role = 'main_admin';
          manager1.name = 'Mr. Ahmed Nagi';
          manager1.parentAdminId = null;
          await manager1.save();
          console.log('✅ Manager 1 account updated: admin@4am1.com');
        } else {
          console.log('✅ Manager 1 account already exists');
        }
      }
    } catch (err) {
      console.log('⚠️ Manager 1 account check/creation:', err.message);
    }
    
    // Create Manager 2: Ibrahim Ahmed (if it doesn't exist)
    try {
      const manager2 = await Admin.findOne({ email: 'admin@4am2.com' });
      if (!manager2) {
        const bcrypt = require('bcrypt');
        const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
        const manager2PasswordHash = await bcrypt.hash('admin3322', SALT_ROUNDS);
        const newManager2 = new Admin({
          name: 'Mr. Ibrahim Ahmed',
          email: 'admin@4am2.com',
          password: manager2PasswordHash,
          role: 'main_admin', // Full admin access
          parentAdminId: null
        });
        await newManager2.save();
        console.log('✅ Manager 2 account created: admin@4am2.com / admin3322');
      } else {
        // Update existing manager to ensure correct role and name
        if (manager2.role !== 'main_admin' || manager2.name !== 'Mr. Ibrahim Ahmed') {
          manager2.role = 'main_admin';
          manager2.name = 'Mr. Ibrahim Ahmed';
          manager2.parentAdminId = null;
          await manager2.save();
          console.log('✅ Manager 2 account updated: admin@4am2.com');
        } else {
          console.log('✅ Manager 2 account already exists');
        }
      }
    } catch (err) {
      console.log('⚠️ Manager 2 account check/creation:', err.message);
    }
    
    return true;
  } catch (error) {
    console.error('MongoDB initialization failed:', error);
    throw error;
  }
}

module.exports = {
  connectMongoDB,
  initMongoDB,
  Admin,
  mongoose
};
