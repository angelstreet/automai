import { prisma } from '../../lib/prisma';

async function deleteUser() {
  try {
    await prisma.user.delete({
      where: {
        email: 'joachim_djibril@hotmail.com',
      },
    });
    console.log('User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
