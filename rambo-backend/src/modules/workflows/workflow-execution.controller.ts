import { Controller, Post, Param, Body } from '@nestjs/common';
import { WorkflowExecutionService } from './workflow-execution.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';

@Controller('projects/:projectId/workflows/:workflowId')
export class WorkflowExecutionController {
  constructor(
    private readonly workflowExecutionService: WorkflowExecutionService
  ) {}

  @Post('execute')
  async executeWorkflow(
    @Param('projectId') projectId: string,
    @Param('workflowId') workflowId: string,
    @Body() executeDto: ExecuteWorkflowDto
  ) {
    return this.workflowExecutionService.executeWorkflow(
      projectId,
      workflowId,
      executeDto
    );
  }

  @Post('accept')
  async acceptAndExecute(
    @Param('projectId') projectId: string,
    @Param('workflowId') workflowId: string,
    @Body() executeDto: ExecuteWorkflowDto
  ) {
    // Immediately execute workflow when accepted
    const execution = await this.workflowExecutionService.executeWorkflow(
      projectId,
      workflowId,
      executeDto
    );

    return {
      ...execution,
      message: 'Workflow accepted and execution started'
    };
  }
}
