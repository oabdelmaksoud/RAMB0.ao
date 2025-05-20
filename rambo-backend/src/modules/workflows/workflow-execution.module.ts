import { Module } from '@nestjs/common';
import { WorkflowExecutionController } from './workflow-execution.controller';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowDependencyService } from './workflow-dependency.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [WorkflowExecutionController],
  providers: [WorkflowExecutionService, WorkflowDependencyService],
  exports: [WorkflowExecutionService]
})
export class WorkflowExecutionModule {}
