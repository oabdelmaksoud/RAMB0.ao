import { Injectable } from '@nestjs/common';
import { PrismaService } from '../rambo-backend/src/modules/prisma/prisma.service';
import { Observable, interval } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable()
export class AgentMonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  getExecutionStatus(executionId: string) {
    return this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        nodeExecutions: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  watchExecutionStatus(executionId: string): Observable<any> {
    return interval(2000).pipe(
      switchMap(() => this.getExecutionStatus(executionId)),
      map(status => ({
        executionId: status.id,
        status: status.status,
        nodes: status.nodeExecutions.map(node => ({
          id: node.nodeId,
          status: node.status,
          startedAt: node.startedAt,
          completedAt: node.completedAt
        }))
      }))
    );
  }
}
