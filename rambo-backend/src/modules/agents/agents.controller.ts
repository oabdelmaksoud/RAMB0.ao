import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { Agent } from '../../../../src/types/index';
import { WorkflowExecutionNode } from '../../../../src/types/workflow-execution';
import { Job } from 'bullmq';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  registerAgent(@Body() agent: Agent) {
    this.agentsService.registerAgent(agent);
    return { success: true };
  }

  @Get(':id')
  getAgent(@Param('id') id: string) {
    return this.agentsService.getAgent(id);
  }

  @Post('dispatch')
  async dispatchNode(@Body() node: WorkflowExecutionNode) {
    const job = await this.agentsService.dispatchNodeToAgent(node);
    return { 
      jobId: job.id,
      status: 'queued'
    };
  }

  @Get('jobs/:id')
  async getJobStatus(@Param('id') id: string) {
    const job = await this.agentsService.getJobStatus(id) as Job<any, any, string> | undefined;
    return {
      id,
      status: job?.getState(),
      progress: job?.progress,
      result: job?.returnvalue,
      error: job?.failedReason
    };
  }
}
