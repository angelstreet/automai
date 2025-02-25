// Script to update a user's role to ADMIN
// Run with: node -r dotenv/config src/server/scripts/update-user-role.js your-email@example.com

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.error('Please provide an email address as an argument');
      console.error('Example: node -r dotenv/config src/server/scripts/update-user-role.js your-email@example.com');
      process.exit(1);
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    // Update the user's role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });

    console.log(`User ${updatedUser.email} role updated to ADMIN`);
  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole(); 