import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';

@Injectable()
export class WorkflowExecutionService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      executionId: execution.id,
      message: 'Workflow execution started'
    };
  }
}
