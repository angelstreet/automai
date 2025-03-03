import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Check for existing tenant
  let tenant = await prisma.tenant.findUnique({
    where: { id: 'clqnwrfhx0000uqmxl2qn2w01' },
  });

  // Create tenant if it doesn't exist
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: 'clqnwrfhx0000uqmxl2qn2w01',
        name: 'Default Tenant',
        plan: 'free',
      },
    });
    console.log(`Created tenant: ${tenant.name} (ID: ${tenant.id})`);
  } else {
    console.log(`Using existing tenant: ${tenant.name} (ID: ${tenant.id})`);
  }

  // Check for existing user
  let user = await prisma.user.findUnique({
    where: { id: 'clqnwrfhx0001uqmxls3ppkk1' },
  });

  // Create user if it doesn't exist
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: 'clqnwrfhx0001uqmxls3ppkk1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
        tenantId: tenant.id,
      },
    });
    console.log(`Created user: ${user.name} (ID: ${user.id})`);
  } else {
    console.log(`Using existing user: ${user.name} (ID: ${user.id})`);
  }

  // Check for existing connection
  let connection = await prisma.connection.findUnique({
    where: { id: 'test-connection-id' },
  });

  // Create connection if it doesn't exist
  if (!connection) {
    connection = await prisma.connection.create({
      data: {
        id: 'test-connection-id',
        name: 'Test SSH Connection',
        host: 'localhost',
        port: 22,
        username: 'testuser',
        password: 'testpassword',
        userId: user.id,
        tenantId: tenant.id,
      },
    });
    console.log(`Created connection: ${connection.name} (ID: ${connection.id})`);
  } else {
    console.log(`Using existing connection: ${connection.name} (ID: ${connection.id})`);
  }

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
