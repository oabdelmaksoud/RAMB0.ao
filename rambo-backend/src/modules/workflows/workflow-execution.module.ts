import { Module } from '@nestjs/common';
import { WorkflowExecutionController } from './workflow-execution.controller';
import { WorkflowExecutionService } from './workflow-execution.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkflowExecutionController],
  providers: [WorkflowExecutionService],
  exports: [WorkflowExecutionService]
})
export class WorkflowExecutionModule {}
