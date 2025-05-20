import { Controller, Get, Param } from '@nestjs/common';
import { AgentMonitoringService } from './agent-monitoring.service';
import { MessagePattern, EventPattern } from '@nestjs/microservices';

@Controller('monitoring')
export class AgentMonitoringController {
  constructor(private readonly monitoringService: AgentMonitoringService) {}

  @Get(':executionId')
  async getStatus(@Param('executionId') executionId: string) {
    return this.monitoringService.getExecutionStatus(executionId);
  }

  @MessagePattern('execution_status')
  async handleStatusRequest(data: { executionId: string }) {
    return this.monitoringService.getExecutionStatus(data.executionId);
  }

  @EventPattern('execution_update')
  async handleExecutionUpdate(data: { executionId: string }) {
    // Broadcast updates to connected clients
    return this.monitoringService.watchExecutionStatus(data.executionId);
  }
}
