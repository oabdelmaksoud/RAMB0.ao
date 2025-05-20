import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: 'test123',
      firstName: 'Test',
      lastName: 'User'
    }
  });

  // Create test project
  const project = await prisma.project.create({
    data: {
      name: 'Test Project',
      description: 'Project for testing workflow execution',
      ownerId: user.id
    }
  });

  // Create test workflow
  const workflow = await prisma.workflow.create({
    data: {
      name: 'Test Workflow',
      projectId: project.id
    }
  });

  // Create workflow nodes
  const nodes = await Promise.all([
    prisma.workflowNode.create({
      data: {
        workflowId: workflow.id,
        type: 'ANALYSIS',
        config: JSON.stringify({label: 'Analysis'})
      }
    }),
    prisma.workflowNode.create({
      data: {
        workflowId: workflow.id,
        type: 'DOCUMENTATION',
        config: JSON.stringify({label: 'Documentation'})
      }
    }),
    prisma.workflowNode.create({
      data: {
        workflowId: workflow.id,
        type: 'DEPLOYMENT',
        config: JSON.stringify({label: 'Deployment'})
      }
    })
  ]);

  // Create workflow edges
  await prisma.workflowEdge.createMany({
    data: [
      {
        workflowId: workflow.id,
        fromNodeId: nodes[0].id,
        toNodeId: nodes[1].id
      },
      {
        workflowId: workflow.id,
        fromNodeId: nodes[1].id,
        toNodeId: nodes[2].id
      }
    ]
  });

  // Create test agents
  await prisma.agent.createMany({
    data: [
      {
        name: 'Analysis Agent',
        type: 'ANALYSIS',
        config: JSON.stringify({})
      },
      {
        name: 'Documentation Agent',
        type: 'DOCUMENTATION',
        config: JSON.stringify({})
      },
      {
        name: 'Deployment Agent',
        type: 'DEPLOYMENT',
        config: JSON.stringify({})
      }
    ]
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
