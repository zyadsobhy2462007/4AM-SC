require('dotenv').config();
const { connectMongoDB, Admin } = require('../models/mongodb');

async function initManagers() {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    console.log('✅ Connected to MongoDB');

    // Manager 1: Mr. Ahmed Nagi
    const manager1Email = 'admin@4am1.com';
    const manager1Password = 'admin2211';
    const manager1Name = 'Mr. Ahmed Nagi';

    let manager1 = await Admin.findOne({ email: manager1Email });
    if (manager1) {
      console.log(`⚠️  Manager 1 (${manager1Email}) already exists. Updating to manager role...`);
      manager1.name = manager1Name;
      manager1.password = manager1Password; // Will be hashed by pre-save hook
      manager1.role = 'manager';
      manager1.parentAdminId = null; // Managers don't have a parent
      await manager1.save();
      console.log(`✅ Updated manager 1: ${manager1Name} (${manager1Email})`);
    } else {
      manager1 = new Admin({
        name: manager1Name,
        email: manager1Email,
        password: manager1Password, // Will be hashed by pre-save hook
        role: 'manager',
        parentAdminId: null
      });
      await manager1.save();
      console.log(`✅ Created manager 1: ${manager1Name} (${manager1Email})`);
    }

    // Manager 2: Mr. Ibrahim Ahmed
    const manager2Email = 'admin@4am2.com';
    const manager2Password = 'admin3322';
    const manager2Name = 'Mr. Ibrahim Ahmed';

    let manager2 = await Admin.findOne({ email: manager2Email });
    if (manager2) {
      console.log(`⚠️  Manager 2 (${manager2Email}) already exists. Updating to manager role...`);
      manager2.name = manager2Name;
      manager2.password = manager2Password; // Will be hashed by pre-save hook
      manager2.role = 'manager';
      manager2.parentAdminId = null; // Managers don't have a parent
      await manager2.save();
      console.log(`✅ Updated manager 2: ${manager2Name} (${manager2Email})`);
    } else {
      manager2 = new Admin({
        name: manager2Name,
        email: manager2Email,
        password: manager2Password, // Will be hashed by pre-save hook
        role: 'manager',
        parentAdminId: null
      });
      await manager2.save();
      console.log(`✅ Created manager 2: ${manager2Name} (${manager2Email})`);
    }

    console.log('\n✅ Managers initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Manager 1: ${manager1.name} (${manager1.email}) - Password: ${manager1Password}`);
    console.log(`   Manager 2: ${manager2.name} (${manager2.email}) - Password: ${manager2Password}`);
    console.log('\n🔐 Both managers have full admin permissions (same as main_admin)');
    console.log('   Managers can assign tasks to each other');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing managers:', error);
    process.exit(1);
  }
}

// Run the initialization
initManagers();

