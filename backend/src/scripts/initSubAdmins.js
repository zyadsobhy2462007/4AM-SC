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

    // Sub-admin 1: Mr. Ahmed Nagy
    const subAdmin1Email = 'admin@4am1.com';
    const subAdmin1Password = 'admin2211';
    const subAdmin1Name = 'Mr. Ahmed Nagy';

    let subAdmin1 = await Admin.findOne({ email: subAdmin1Email });
    if (subAdmin1) {
      console.log(`⚠️  Sub-admin 1 (${subAdmin1Email}) already exists. Updating...`);
      subAdmin1.name = subAdmin1Name;
      subAdmin1.password = subAdmin1Password; // Will be hashed by pre-save hook
      subAdmin1.role = 'sub_admin';
      subAdmin1.parentAdminId = mainAdmin._id;
      await subAdmin1.save();
      console.log(`✅ Updated sub-admin 1: ${subAdmin1Name}`);
    } else {
      subAdmin1 = new Admin({
        name: subAdmin1Name,
        email: subAdmin1Email,
        password: subAdmin1Password, // Will be hashed by pre-save hook
        role: 'sub_admin',
        parentAdminId: mainAdmin._id
      });
      await subAdmin1.save();
      console.log(`✅ Created sub-admin 1: ${subAdmin1Name} (${subAdmin1Email})`);
    }

    // Sub-admin 2: Mr. Ibrahim Ahmed
    const subAdmin2Email = 'admin@4am2.com';
    const subAdmin2Password = 'admin3322';
    const subAdmin2Name = 'Mr. Ibrahim Ahmed';

    let subAdmin2 = await Admin.findOne({ email: subAdmin2Email });
    if (subAdmin2) {
      console.log(`⚠️  Sub-admin 2 (${subAdmin2Email}) already exists. Updating...`);
      subAdmin2.name = subAdmin2Name;
      subAdmin2.password = subAdmin2Password; // Will be hashed by pre-save hook
      subAdmin2.role = 'sub_admin';
      subAdmin2.parentAdminId = mainAdmin._id;
      await subAdmin2.save();
      console.log(`✅ Updated sub-admin 2: ${subAdmin2Name}`);
    } else {
      subAdmin2 = new Admin({
        name: subAdmin2Name,
        email: subAdmin2Email,
        password: subAdmin2Password, // Will be hashed by pre-save hook
        role: 'sub_admin',
        parentAdminId: mainAdmin._id
      });
      await subAdmin2.save();
      console.log(`✅ Created sub-admin 2: ${subAdmin2Name} (${subAdmin2Email})`);
    }

    console.log('\n✅ Sub-admins initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Main Admin: ${mainAdmin.name} (${mainAdmin.email})`);
    console.log(`   Sub-admin 1: ${subAdmin1.name} (${subAdmin1.email}) - Password: ${subAdmin1Password}`);
    console.log(`   Sub-admin 2: ${subAdmin2.name} (${subAdmin2.email}) - Password: ${subAdmin2Password}`);
    console.log('\n🔐 Both sub-admins are linked to the main admin via parentAdminId');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing sub-admins:', error);
    process.exit(1);
  }
}

// Run the initialization
initSubAdmins();
