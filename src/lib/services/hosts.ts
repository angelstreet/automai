import { prisma } from '../prisma';

/**
 * Get all hosts ordered by creation date
 */
export async function getHosts() {
  return prisma.host.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a single host by ID
 */
export async function getHostById(id: string) {
  return prisma.host.findUnique({
    where: { id },
  });
}

/**
 * Create a new host
 */
export async function createHost(data: {
  name: string;
  description?: string;
  type: string;
  ip: string;
  port?: number;
  user?: string;
  password?: string;
}) {
  return prisma.host.create({
    data: {
      name: data.name,
      description: data.description,
      type: data.type,
      ip: data.ip,
      port: data.port || (data.type === 'ssh' ? 22 : null),
      user: data.type === 'ssh' ? data.user : null,
      password: data.type === 'ssh' ? data.password : null,
      status: 'pending',
    },
  });
}

/**
 * Delete a host by ID
 */
export async function deleteHost(id: string) {
  return prisma.host.delete({
    where: { id },
  });
}
