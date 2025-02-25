import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create a tenant
  const tenant = await prisma.tenant.create({
    data: {
      id: '33b2680c-9730-447a-a3c7-d5f3cc7cb756', // Use the ID from the error logs
      name: 'Default Tenant',
      plan: 'pro',
    },
  });
  console.log('Created tenant:', tenant);

  // Create a user
  const user = await prisma.user.create({
    data: {
      id: '99dc15df-b536-424e-aa70-540319d1e81e', // Use the ID from the error logs
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });
  console.log('Created user:', user);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
