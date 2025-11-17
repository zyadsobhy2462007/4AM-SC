require('dotenv').config();
const { connectMongoDB, Admin } = require('../models/mongodb');

async function initSubAdmins() {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    console.log('✅ Connected to MongoDB');

    // Find the main admin
    const mainAdmin = await Admin.findOne({ email: 'admin@4am.com' });
    
    if (!mainAdmin) {
      console.error('❌ Main admin (admin@4am.com) not found in database!');
      console.error('Please ensure the main admin account exists before creating sub-admins.');
      process.exit(1);
    }

    // Ensure main admin has main_admin role
    if (mainAdmin.role !== 'main_admin') {
      mainAdmin.role = 'main_admin';
      await mainAdmin.save();
      console.log('✅ Updated main admin role to main_admin');
    }

    console.log(`✅ Found main admin: ${mainAdmin.name} (${mainAdmin.email})`);
    console.log(`   Main admin ID: ${mainAdmin._id}`);

    // Manager 1: Mr. Ahmed Nagi (Full admin access - main_admin role)
    const manager1Email = 'admin@4am1.com';
    const manager1Password = 'admin2211';
    const manager1Name = 'Mr. Ahmed Nagi';

    let manager1 = await Admin.findOne({ email: manager1Email });
    if (manager1) {
      console.log(`⚠️  Manager 1 (${manager1Email}) already exists. Updating...`);
      manager1.name = manager1Name;
      manager1.password = manager1Password; // Will be hashed by pre-save hook
      manager1.role = 'main_admin'; // Full admin access
      manager1.parentAdminId = null; // No parent for main_admin
      await manager1.save();
      console.log(`✅ Updated Manager 1: ${manager1Name}`);
    } else {
      manager1 = new Admin({
        name: manager1Name,
        email: manager1Email,
        password: manager1Password, // Will be hashed by pre-save hook
        role: 'main_admin', // Full admin access
        parentAdminId: null // No parent for main_admin
      });
      await manager1.save();
      console.log(`✅ Created Manager 1: ${manager1Name} (${manager1Email})`);
    }

    // Manager 2: Mr. Ibrahim Ahmed (Full admin access - main_admin role)
    const manager2Email = 'admin@4am2.com';
    const manager2Password = 'admin3322';
    const manager2Name = 'Mr. Ibrahim Ahmed';

    let manager2 = await Admin.findOne({ email: manager2Email });
    if (manager2) {
      console.log(`⚠️  Manager 2 (${manager2Email}) already exists. Updating...`);
      manager2.name = manager2Name;
      manager2.password = manager2Password; // Will be hashed by pre-save hook
      manager2.role = 'main_admin'; // Full admin access
      manager2.parentAdminId = null; // No parent for main_admin
      await manager2.save();
      console.log(`✅ Updated Manager 2: ${manager2Name}`);
    } else {
      manager2 = new Admin({
        name: manager2Name,
        email: manager2Email,
        password: manager2Password, // Will be hashed by pre-save hook
        role: 'main_admin', // Full admin access
        parentAdminId: null // No parent for main_admin
      });
      await manager2.save();
      console.log(`✅ Created Manager 2: ${manager2Name} (${manager2Email})`);
    }

    console.log('\n✅ Managers initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Main Admin: ${mainAdmin.name} (${mainAdmin.email})`);
    console.log(`   Manager 1: ${manager1.name} (${manager1.email}) - Password: ${manager1Password} - Role: ${manager1.role}`);
    console.log(`   Manager 2: ${manager2.name} (${manager2.email}) - Password: ${manager2Password} - Role: ${manager2.role}`);
    console.log('\n🔐 Both managers have full admin access (main_admin role) with the same permissions as the main admin');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing managers:', error);
    process.exit(1);
  }
}

// Run the initialization
initSubAdmins();
