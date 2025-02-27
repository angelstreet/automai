import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Create a tenant
  const tenant = await prisma.tenant.create({
    data: {
      id: 'clqnwrfhx0000uqmxl2qn2w01',
      name: 'Default Tenant',
      plan: 'free',
    },
  });
  console.log(`Created tenant: ${tenant.name} (ID: ${tenant.id})`);

  // Create a user
  const user = await prisma.user.create({
    data: {
      id: 'clqnwrfhx0001uqmxls3ppkk1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });
  console.log(`Created user: ${user.name} (ID: ${user.id})`);

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 