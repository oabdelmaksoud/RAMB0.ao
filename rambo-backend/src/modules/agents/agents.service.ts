import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { WorkflowExecutionNode } from '../../../../src/types/workflow-execution';
import { Agent } from '../../../../src/types/index';

@Injectable()
export class AgentsService {
  private registeredAgents: Map<string, Agent> = new Map();

  constructor(
    @InjectQueue('agent-jobs') private readonly agentQueue: Queue,
  ) {}

  registerAgent(agent: Agent) {
    this.registeredAgents.set(agent.id, agent);
  }

  getAgent(agentId: string): Agent | undefined {
    return this.registeredAgents.get(agentId);
  }

  async dispatchNodeToAgent(node: WorkflowExecutionNode) {
    if (!node.agent) {
      throw new Error('Node has no assigned agent');
    }

    const job = await this.agentQueue.add(
      `agent-job:${node.id}`,
      {
        node,
        workflowId: node.workflowId,
      },
      {
        jobId: node.id,
        attempts: node.config?.maxRetries || 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );

    return job;
  }

  async getJobStatus(jobId: string): Promise<Job | undefined> {
    return this.agentQueue.getJob(jobId);
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = await this.agentQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }
}
