import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUser(email: string) {
  try {
    // First, find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        projects: {
          include: {
            testcases: {
              include: {
                executions: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    // Delete in order of dependencies
    for (const project of user.projects) {
      for (const testcase of project.testcases) {
        // Delete executions
        await prisma.execution.deleteMany({
          where: { testcaseId: testcase.id }
        });
      }
      // Delete testcases
      await prisma.testCase.deleteMany({
        where: { projectId: project.id }
      });
    }
    
    // Delete projects
    await prisma.project.deleteMany({
      where: { ownerId: user.id }
    });

    // Finally delete the user
    await prisma.user.delete({
      where: { email }
    });

    console.log('User and related data deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Delete the specific user
deleteUser('joachim_djibril@hotmail.com'); 