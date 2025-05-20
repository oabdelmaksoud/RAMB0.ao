import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { QueueService } from '../queue/queue.service';
import { WorkflowDependencyService } from './workflow-dependency.service';

@Injectable()
export class WorkflowExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly dependencyService: WorkflowDependencyService
  ) {}

  async executeWorkflow(
    projectId: string,
    workflowId: string,
    executeDto: ExecuteWorkflowDto
  ) {
    // Validate workflow exists
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId, projectId },
      include: { nodes: true, edges: true }
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Create execution record
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId,
        createdById: executeDto.userId,
        status: 'RUNNING'
      }
    });

    // Get execution order based on dependencies
    const executionOrder = this.dependencyService.getExecutionOrder(
      workflow.nodes,
      workflow.edges
    );

    // Create initial node execution records
    await this.prisma.workflowNodeExecution.createMany({
      data: workflow.nodes.map((node: { id: string }) => ({
        executionId: execution.id,
        nodeId: node.id,
        status: 'PENDING',
        createdAt: new Date()
      }))
    });

    // Queue jobs for each node in order
    const jobPromises = executionOrder.map(async (nodeId: string) => {
      const node = workflow.nodes.find((n: { id: string }) => n.id === nodeId);
      if (!node) return;
      
      await this.queueService.addJob(
        'analysis-jobs',
        `node-${nodeId}`,
        {
          workflowId,
          executionId: execution.id,
          nodeId,
          parameters: executeDto.parameters
        }
      );
    });

    await Promise.all(jobPromises);

    return {
      executionId: execution.id,
      message: 'Workflow execution started',
      nodesQueued: workflow.nodes.length
    };
  }
}
